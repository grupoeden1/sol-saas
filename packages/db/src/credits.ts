import { prisma } from './index'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DeductMetadata {
  inputTokens: number
  outputTokens: number
  modelUsed: string
  creditsPerMInput: number
  creditsPerMOutput: number
  conversationTitle: string
  hasAttachments?: boolean
  attachmentTypes?: string[]
  attachmentTokens?: number
}

// ─── Custom Error ──────────────────────────────────────────────────────────

export class InsufficientBalanceError extends Error {
  constructor(userId: string, current: number, required: number) {
    super(
      `Créditos insuficientes: usuário ${userId} tem ${current} créditos, necessário ${required}`,
    )
    this.name = 'InsufficientBalanceError'
  }
}

// ─── Adicionar créditos ────────────────────────────────────────────────────

export type AddCreditOptions =
  | {
      type: 'purchase'
      stripePaymentId: string
    }
  | {
      type: 'adjustment'
      adminEmail: string
      description: string
    }

/**
 * Incrementa créditos do usuário e registra transação atomicamente.
 *
 * - type='purchase' : compra via Stripe (idempotente via stripePaymentId UNIQUE)
 * - type='adjustment': crédito manual por admin (auditado via adminEmail)
 *
 * @param userId  ID do usuário
 * @param credits Créditos a adicionar (positivo)
 * @param options Discriminated union com dados específicos do tipo
 * @returns       Novo saldo em créditos
 */
export async function addCredits(
  userId: string,
  credits: number,
  options: AddCreditOptions,
): Promise<{ credits: number }> {
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: credits } },
      select: { credits: true },
    })

    if (options.type === 'purchase') {
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: credits,
          type: 'purchase',
          description: 'Compra de créditos via Stripe',
          stripePaymentId: options.stripePaymentId,
        },
      })
    } else {
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: credits,
          type: 'adjustment',
          description: options.description,
          adminEmail: options.adminEmail,
        },
      })
    }

    return updated.credits
  })

  console.log(`[Credits] addCredits type=${options.type} credits=${credits}`)
  return { credits: result }
}

// ─── Deduzir créditos (consumo no chat) ────────────────────────────────────

/**
 * Decrementa créditos do usuário e registra transação com metadata de auditoria.
 * Créditos nunca ficam negativos — gate pré-chamada garante cobertura.
 * UPDATE atômico com WHERE >= 0 como proteção contra race conditions.
 *
 * @param userId    ID do usuário
 * @param creditsUsed Créditos a deduzir (positivo)
 * @param metadata  Dados de auditoria (tokens, model, config snapshot)
 * @returns         Novo saldo em créditos
 * @throws          InsufficientBalanceError se saldo insuficiente
 */
export async function deductCredits(
  userId: string,
  creditsUsed: number,
  metadata: DeductMetadata,
): Promise<{ credits: number }> {
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.$queryRaw<Array<{ credits: number }>>`
      UPDATE "User"
      SET "credits" = "credits" - ${creditsUsed},
          "updatedAt" = NOW()
      WHERE "id" = ${userId}
        AND "credits" - ${creditsUsed} >= 0
      RETURNING "credits"
    `

    if (updated.length === 0) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      })

      throw new InsufficientBalanceError(
        userId,
        user?.credits ?? 0,
        creditsUsed,
      )
    }

    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -creditsUsed,
        type: 'consumption',
        description: metadata.conversationTitle,
        inputTokens: metadata.inputTokens,
        outputTokens: metadata.outputTokens,
        modelUsed: metadata.modelUsed,
        creditsPerMInput: metadata.creditsPerMInput,
        creditsPerMOutput: metadata.creditsPerMOutput,
        hasAttachments: metadata.hasAttachments ?? false,
        attachmentTypes: metadata.attachmentTypes ?? [],
        attachmentTokens: metadata.attachmentTokens,
      },
    })

    return updated[0].credits
  })

  console.log(`[Credits] deductCredits completed credits=${creditsUsed}`)
  return { credits: result }
}
