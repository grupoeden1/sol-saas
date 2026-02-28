import { Prisma } from '@prisma/client'
import { prisma } from './index'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DeductMetadata {
  exchangeRate: Prisma.Decimal
  inputTokens: number
  outputTokens: number
  modelUsed: string
  costUsd: Prisma.Decimal
  conversationTitle: string
  maxOutputTokens: number
  hasAttachments?: boolean
  attachmentTypes?: string[]
  attachmentTokens?: number
}

// ─── Custom Error ──────────────────────────────────────────────────────────

export class InsufficientBalanceError extends Error {
  constructor(userId: string, current: number, required: number) {
    super(
      `Saldo insuficiente: usuário ${userId} tem ${current} centavos, necessário ${required}`,
    )
    this.name = 'InsufficientBalanceError'
  }
}

// ─── Adicionar créditos (compra via Stripe ou ajuste manual) ───────────────

export type AddCreditOptions =
  | {
      type: 'purchase'
      stripePaymentId: string
      exchangeRate: Prisma.Decimal
      grossAmountCents: number
    }
  | {
      type: 'adjustment'
      exchangeRate: Prisma.Decimal
      adminEmail: string
      description: string
    }

/**
 * Incrementa o saldo do usuário em centavos e registra a transação atomicamente.
 *
 * - type='purchase' : compra via Stripe (idempotente via stripePaymentId UNIQUE)
 * - type='adjustment': crédito manual por admin (auditado via adminEmail)
 *
 * @param userId      ID do usuário
 * @param amountCents Centavos de real a adicionar (positivo)
 * @param options     Discriminated union com dados específicos do tipo
 * @returns           Novo saldo em centavos
 */
export async function addCredits(
  userId: string,
  amountCents: number,
  options: AddCreditOptions,
): Promise<{ balanceCents: number }> {
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { balanceCents: { increment: amountCents } },
      select: { balanceCents: true },
    })

    if (options.type === 'purchase') {
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: amountCents,
          type: 'purchase',
          description: 'Compra de créditos via Stripe',
          stripePaymentId: options.stripePaymentId,
          exchangeRate: options.exchangeRate,
          grossAmountCents: options.grossAmountCents,
        },
      })
    } else {
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: amountCents,
          type: 'adjustment',
          description: options.description,
          exchangeRate: options.exchangeRate,
          adminEmail: options.adminEmail,
        },
      })
    }

    return updated.balanceCents
  })

  console.log(`[Credits] addCredits type=${options.type} amountCents=${amountCents}`)
  return { balanceCents: result }
}

// ─── Deduzir créditos (consumo no chat) ───────────────────────────────────

/**
 * Decrementa o saldo do usuário em centavos e registra a transação com metadata de auditoria.
 * Saldo nunca fica negativo — gate pré-chamada garante cobertura para pior caso.
 * UPDATE atômico com WHERE >= 0 como proteção adicional contra race conditions.
 *
 * @param userId    ID do usuário
 * @param costCents Custo em centavos de real a deduzir (positivo)
 * @param metadata  Dados de auditoria (exchangeRate, tokens, model, costUsd, maxOutputTokens)
 * @returns         Novo saldo em centavos
 * @throws          InsufficientBalanceError se saldo insuficiente
 */
export async function deductCredits(
  userId: string,
  costCents: number,
  metadata: DeductMetadata,
): Promise<{ balanceCents: number }> {
  const result = await prisma.$transaction(async (tx) => {
    // Atomic UPDATE com WHERE — previne race condition sob READ COMMITTED.
    // A condição (balanceCents - cost >= 0) é avaliada no momento do write,
    // não em um SELECT separado, eliminando a janela de concorrência.
    const updated = await tx.$queryRaw<Array<{ balanceCents: number }>>`
      UPDATE "User"
      SET "balanceCents" = "balanceCents" - ${costCents},
          "updatedAt" = NOW()
      WHERE "id" = ${userId}
        AND "balanceCents" - ${costCents} >= 0
      RETURNING "balanceCents"
    `

    if (updated.length === 0) {
      // UPDATE não afetou nenhuma row — ou user não existe ou saldo insuficiente
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { balanceCents: true },
      })

      throw new InsufficientBalanceError(
        userId,
        user?.balanceCents ?? 0,
        costCents,
      )
    }

    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -costCents,
        type: 'consumption',
        description: metadata.conversationTitle,
        exchangeRate: metadata.exchangeRate,
        inputTokens: metadata.inputTokens,
        outputTokens: metadata.outputTokens,
        modelUsed: metadata.modelUsed,
        costUsd: metadata.costUsd,
        maxOutputTokens: metadata.maxOutputTokens,
        hasAttachments: metadata.hasAttachments ?? false,
        attachmentTypes: metadata.attachmentTypes ?? [],
        attachmentTokens: metadata.attachmentTokens,
      },
    })

    return updated[0].balanceCents
  })

  console.log(`[Credits] deductCredits completed costCents=${costCents}`)
  return { balanceCents: result }
}
