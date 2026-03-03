import { prisma } from './index'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PricingValues {
  creditsPerMInput: number
  creditsPerMOutput: number
  maxOutputTokens: number
}

// ─── In-memory cache (TTL 60s) ─────────────────────────────────────────────

let cachedConfig: PricingValues | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60_000 // 60 segundos

// ─── getPricingConfig ──────────────────────────────────────────────────────

export async function getPricingConfig(): Promise<PricingValues> {
  if (cachedConfig && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedConfig
  }

  const rows = await prisma.pricingConfig.findMany()
  const config: PricingValues = {
    creditsPerMInput: rows.find((r) => r.key === 'CREDITS_PER_M_INPUT')?.value ?? 500,
    creditsPerMOutput: rows.find((r) => r.key === 'CREDITS_PER_M_OUTPUT')?.value ?? 2000,
    maxOutputTokens: rows.find((r) => r.key === 'MAX_OUTPUT_TOKENS')?.value ?? 8192,
  }

  cachedConfig = config
  cacheTimestamp = Date.now()
  return config
}

// ─── invalidatePricingCache ────────────────────────────────────────────────

export function invalidatePricingCache(): void {
  cachedConfig = null
  cacheTimestamp = 0
}

// ─── calculateCredits ──────────────────────────────────────────────────────

/**
 * Calcula créditos consumidos por uma chamada com tokens reais.
 * Mínimo: 1 crédito.
 */
export function calculateCredits(
  inputTokens: number,
  outputTokens: number,
  config: PricingValues,
): number {
  return Math.max(
    1,
    Math.ceil(
      (inputTokens / 1_000_000) * config.creditsPerMInput +
        (outputTokens / 1_000_000) * config.creditsPerMOutput,
    ),
  )
}

// ─── calculateMaxCredits ───────────────────────────────────────────────────

/**
 * Estima créditos MÁXIMOS (gate pré-chamada).
 * Usa maxOutputTokens do config como pior caso de output.
 */
export function calculateMaxCredits(
  inputTokens: number,
  config: PricingValues,
): number {
  return Math.max(
    1,
    Math.ceil(
      (inputTokens / 1_000_000) * config.creditsPerMInput +
        (config.maxOutputTokens / 1_000_000) * config.creditsPerMOutput,
    ),
  )
}
