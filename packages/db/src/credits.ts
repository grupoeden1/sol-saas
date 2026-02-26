import { prisma } from './index'

// ─── Custom Error ──────────────────────────────────────────────────────────

export class InsufficientCreditsError extends Error {
  constructor(userId: string, current: number, required: number) {
    super(
      `Saldo insuficiente: usuário ${userId} tem ${current} crédito(s), necessário ${required}`,
    )
    this.name = 'InsufficientCreditsError'
  }
}

// ─── Adicionar créditos (compra ou ajuste manual) ──────────────────────────

/**
 * Incrementa o saldo do usuário e registra a transação atomicamente.
 * Usado pelo webhook do Stripe (Story 3.4) e seeds de desenvolvimento.
 *
 * @param userId         ID do usuário
 * @param amount         Quantidade de créditos a adicionar (positivo)
 * @param stripePaymentId ID do pagamento Stripe (opcional — null para ajustes manuais)
 * @returns              Novo saldo do usuário após a operação
 */
export async function addCredits(
  userId: string,
  amount: number,
  stripePaymentId?: string,
): Promise<number> {
  const newBalance = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    })

    await tx.creditTransaction.create({
      data: {
        userId,
        amount,                          // positivo = crédito
        type: 'purchase',
        description: `Adição de ${amount} crédito(s)`,
        stripePaymentId: stripePaymentId ?? null,
      },
    })

    return updated.credits
  })

  console.log(`[Credits] addCredits userId=${userId} amount=${amount} newBalance=${newBalance}`)
  return newBalance
}

// ─── Deduzir créditos (consumo no chat) ───────────────────────────────────

/**
 * Decrementa o saldo do usuário e registra a transação atomicamente.
 * Lança InsufficientCreditsError se saldo atual < amount — sem efeitos colaterais.
 * Usado pela API de chat (Story 3.2).
 *
 * @param userId  ID do usuário
 * @param amount  Quantidade de créditos a deduzir (positivo — armazenado como negativo)
 * @returns       Novo saldo do usuário após a operação
 * @throws        InsufficientCreditsError se saldo insuficiente
 */
export async function deductCredits(userId: string, amount: number): Promise<number> {
  const newBalance = await prisma.$transaction(async (tx) => {
    // Verificar saldo atual dentro da transação (evita race conditions)
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    })

    if (!user || user.credits < amount) {
      throw new InsufficientCreditsError(userId, user?.credits ?? 0, amount)
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
      select: { credits: true },
    })

    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -amount,                 // negativo = consumo
        type: 'consumption',
        description: `Dedução de ${amount} crédito(s)`,
      },
    })

    return updated.credits
  })

  console.log(`[Credits] deductCredits userId=${userId} amount=${amount} newBalance=${newBalance}`)
  return newBalance
}
