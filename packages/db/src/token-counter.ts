import { Prisma } from '@prisma/client'
import { encoding_for_model, type TiktokenModel } from 'tiktoken'

const Decimal = Prisma.Decimal

// ─── Model Pricing (USD per 1M tokens) ────────────────────────────────────

interface ModelPricing {
  input: number   // USD per 1M input tokens
  output: number  // USD per 1M output tokens
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o':      { input: 2.50,  output: 10.00 },
  'gpt-4o-mini': { input: 0.15,  output: 0.60  },
}

const DEFAULT_PRICING: ModelPricing = { input: 2.50, output: 10.00 }

export { MODEL_PRICING, DEFAULT_PRICING }

// ─── countTokens ───────────────────────────────────────────────────────────

/**
 * Conta tokens de um array de mensagens usando tiktoken.
 * Inclui overhead de formatação por mensagem (~4 tokens) e priming (~2 tokens).
 */
export function countTokens(
  messages: Array<{ role: string; content: string }>,
  model: string,
): number {
  let enc
  try {
    enc = encoding_for_model(model as TiktokenModel)
  } catch {
    // Modelo desconhecido — fallback para cl100k_base (GPT-4o family)
    enc = encoding_for_model('gpt-4o' as TiktokenModel)
  }

  try {
    let total = 0
    for (const msg of messages) {
      total += 4 // overhead por mensagem (role, name, separadores)
      total += enc.encode(msg.content).length
    }
    total += 2 // assistant reply priming
    return total
  } finally {
    enc.free()
  }
}

// ─── countRawTokens ──────────────────────────────────────────────────────

/**
 * Conta tokens de um texto puro, sem overhead de mensagem.
 * Usado para contar tokens de output isoladamente.
 */
export function countRawTokens(text: string, model: string): number {
  let enc
  try {
    enc = encoding_for_model(model as TiktokenModel)
  } catch {
    enc = encoding_for_model('gpt-4o' as TiktokenModel)
  }

  try {
    return enc.encode(text).length
  } finally {
    enc.free()
  }
}

// ─── calculateCostCents ────────────────────────────────────────────────────

/**
 * Calcula custo em centavos de real a partir de tokens consumidos.
 *
 * Fórmula:
 *   costUsd = (inputTokens × priceInput / 1M) + (outputTokens × priceOutput / 1M)
 *   costCents = Math.ceil(costUsd × exchangeRate × 100)
 */
export function calculateCostCents(
  inputTokens: number,
  outputTokens: number,
  model: string,
  exchangeRate: Prisma.Decimal,
): { costUsd: Prisma.Decimal; costCents: number } {
  const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING

  const inputCost = new Decimal(inputTokens).mul(pricing.input).div(1_000_000)
  const outputCost = new Decimal(outputTokens).mul(pricing.output).div(1_000_000)
  const costUsd = inputCost.plus(outputCost)

  const costCents = Math.ceil(costUsd.mul(exchangeRate).mul(100).toNumber())

  return { costUsd, costCents }
}
