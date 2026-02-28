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

// ─── Constants ────────────────────────────────────────────────────────────

/** Teto de segurança para gate pré-chamada e max_tokens da OpenAI */
export const MAX_OUTPUT_TOKENS = 8192

/** Custo mínimo por mensagem = 1 crédito (100 centavos) */
export const MIN_COST_CENTS = 100

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

  const rawCostCents = Math.ceil(costUsd.mul(exchangeRate).mul(100).toNumber())
  const costCents = Math.max(rawCostCents, MIN_COST_CENTS)

  return { costUsd, costCents }
}

// ─── estimateMaxCost ───────────────────────────────────────────────────────

/**
 * Estima custo MÁXIMO possível (input real + MAX_OUTPUT_TOKENS de output).
 * Usado como gate pré-chamada: se saldo < maxCost → 402.
 */
export function estimateMaxCost(
  inputTokens: number,
  model: string,
  exchangeRate: Prisma.Decimal,
): number {
  const { costCents } = calculateCostCents(
    inputTokens,
    MAX_OUTPUT_TOKENS,
    model,
    exchangeRate,
  )
  return costCents
}

// ─── calculateRealCost ─────────────────────────────────────────────────────

/**
 * Calcula custo REAL após streaming (input + output reais).
 * Sempre >= MIN_COST_CENTS.
 */
export function calculateRealCost(
  inputTokens: number,
  outputTokens: number,
  model: string,
  exchangeRate: Prisma.Decimal,
): { costCents: number; costUsd: Prisma.Decimal } {
  return calculateCostCents(inputTokens, outputTokens, model, exchangeRate)
}

// ─── calculateImageCost ──────────────────────────────────────────────────────

/**
 * Calcula custo em tokens de uma imagem para a OpenAI Vision API.
 *
 * Modos:
 *   - low: 85 tokens fixos (imagem redimensionada internamente pela API)
 *   - high: tiles de 512×512 sobre imagem redimensionada + 85 base
 *   - auto: high se qualquer dimensão > 512, low caso contrário
 *
 * @see https://platform.openai.com/docs/guides/vision
 */
export function calculateImageCost(
  width: number,
  height: number,
  detail: 'low' | 'high' | 'auto',
): number {
  if (detail === 'auto') {
    return width > 512 || height > 512
      ? calculateImageCost(width, height, 'high')
      : 85
  }

  if (detail === 'low') return 85

  // High: redimensionar + calcular tiles
  let w = width
  let h = height

  // 1. Caber em 2048×2048
  if (w > 2048 || h > 2048) {
    const scale = 2048 / Math.max(w, h)
    w = Math.floor(w * scale)
    h = Math.floor(h * scale)
  }

  // 2. Escalar para que menor dimensão = 768
  const shortSide = Math.min(w, h)
  if (shortSide > 768) {
    const scale = 768 / shortSide
    w = Math.floor(w * scale)
    h = Math.floor(h * scale)
  }

  // 3. Calcular tiles de 512×512
  const tilesX = Math.ceil(w / 512)
  const tilesY = Math.ceil(h / 512)

  return (tilesX * tilesY * 170) + 85
}
