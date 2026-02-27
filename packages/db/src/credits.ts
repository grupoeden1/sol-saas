import { Prisma } from '@prisma/client'
import { prisma } from './index'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DeductMetadata {
  exchangeRate: Prisma.Decimal
  inputTokens: number
  outputTokens: number
  modelUsed: string
  costUsd: Prisma.Decimal
}

// ─── Custom Error ──────────────────────────────────────────────────────────

export class InsufficientBalanceError extends Error {
  constructor(userId: string, current: number, required: number, min: number) {
    super(
      `Saldo insuficiente: usuário ${userId} tem ${current} centavos, necessário ${required}, limite mínimo ${min}`,
    )
    this.name = 'InsufficientBalanceError'
  }
}

// ─── Adicionar créditos (compra via Stripe) ────────────────────────────────

/**
 * Incrementa o saldo do usuário em centavos e registra a transação atomicamente.
 * Usado pelo webhook do Stripe (Story 3.4/3.6).
 *
 * @param userId          ID do usuário
 * @param amountCents     Centavos de real a adicionar (positivo)
 * @param stripePaymentId ID do pagamento Stripe (obrigatório — idempotência via UNIQUE)
 * @param exchangeRate    Cotação USD-BRL no momento da compra (opcional)
 * @returns               Novo saldo em centavos
 */
export async function addCredits(
  userId: string,
  amountCents: number,
  stripePaymentId: string,
  exchangeRate?: Prisma.Decimal,
): Promise<{ balanceCents: number }> {
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { balanceCents: { increment: amountCents } },
      select: { balanceCents: true },
    })

    await tx.creditTransaction.create({
      data: {
        userId,
        amount: amountCents,
        type: 'purchase',
        description: `Compra de créditos via Stripe`,
        stripePaymentId,
        exchangeRate: exchangeRate ?? null,
      },
    })

    return updated.balanceCents
  })

  console.log(`[Credits] addCredits completed amountCents=${amountCents}`)
  return { balanceCents: result }
}

// ─── Deduzir créditos (consumo no chat) ───────────────────────────────────

/**
 * Decrementa o saldo do usuário em centavos e registra a transação com metadata de auditoria.
 * Permite saldo negativo até minBalanceCents (default: -200 = -R$2,00).
 * Lança InsufficientBalanceError se o saldo ficaria abaixo do limite.
 *
 * @param userId    ID do usuário
 * @param costCents Custo em centavos de real a deduzir (positivo)
 * @param metadata  Dados de auditoria (exchangeRate, tokens, model, costUsd)
 * @returns         Novo saldo em centavos
 * @throws          InsufficientBalanceError se saldo insuficiente
 */
export async function deductCredits(
  userId: string,
  costCents: number,
  metadata: DeductMetadata,
): Promise<{ balanceCents: number }> {
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { balanceCents: true, minBalanceCents: true },
    })

    if (!user) {
      throw new InsufficientBalanceError(userId, 0, costCents, -200)
    }

    if (user.balanceCents - costCents < user.minBalanceCents) {
      throw new InsufficientBalanceError(
        userId,
        user.balanceCents,
        costCents,
        user.minBalanceCents,
      )
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { balanceCents: { decrement: costCents } },
      select: { balanceCents: true },
    })

    const totalTokens = metadata.inputTokens + metadata.outputTokens

    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -costCents,
        type: 'consumption',
        description: `Consumo de ${totalTokens} tokens (${metadata.modelUsed})`,
        exchangeRate: metadata.exchangeRate,
        inputTokens: metadata.inputTokens,
        outputTokens: metadata.outputTokens,
        modelUsed: metadata.modelUsed,
        costUsd: metadata.costUsd,
      },
    })

    return updated.balanceCents
  })

  console.log(`[Credits] deductCredits completed costCents=${costCents}`)
  return { balanceCents: result }
}
