import { prisma } from './index'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PricingValues {
  creditsPerMInput: number
  creditsPerMOutput: number
  maxOutputTokens: number
  creditsPerAssemblyAiMin: number
  creditsPerMEmbeddingTokens: number
  creditsPerKElevenLabsChars: number
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
    creditsPerAssemblyAiMin: rows.find((r) => r.key === 'CREDITS_PER_ASSEMBLYAI_MIN')?.value ?? 40,
    creditsPerMEmbeddingTokens: rows.find((r) => r.key === 'CREDITS_PER_M_EMBEDDING_TOKENS')?.value ?? 14,
    creditsPerKElevenLabsChars: rows.find((r) => r.key === 'CREDITS_PER_K_ELEVENLABS_CHARS')?.value ?? 26,
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
  if (!Number.isFinite(inputTokens) || !Number.isFinite(outputTokens)) return 1
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
  if (!Number.isFinite(inputTokens)) return 1
  return Math.max(
    1,
    Math.ceil(
      (inputTokens / 1_000_000) * config.creditsPerMInput +
        (config.maxOutputTokens / 1_000_000) * config.creditsPerMOutput,
    ),
  )
}

// ─── calculateAssemblyAiCredits ────────────────────────────────────────────

/**
 * Calcula créditos para transcrição AssemblyAI baseado na duração do áudio.
 * Retorna 0 se duração for 0 ou negativa.
 */
export function calculateAssemblyAiCredits(
  durationSeconds: number,
  config: PricingValues,
): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0
  const durationMinutes = durationSeconds / 60
  return Math.max(1, Math.ceil(durationMinutes * config.creditsPerAssemblyAiMin))
}

// ─── calculateEmbeddingCredits ─────────────────────────────────────────────

/**
 * Calcula créditos para embedding tokens.
 * Retorna 0 se tokens for 0 ou negativo.
 */
export function calculateEmbeddingCredits(
  tokens: number,
  config: PricingValues,
): number {
  if (!Number.isFinite(tokens) || tokens <= 0) return 0
  return Math.max(1, Math.ceil((tokens / 1_000_000) * config.creditsPerMEmbeddingTokens))
}

// ─── calculateElevenLabsCredits ──────────────────────────────────────────────

/**
 * Calcula créditos para TTS ElevenLabs baseado no número de caracteres.
 * Retorna 0 se caracteres for 0 ou negativo.
 */
export function calculateElevenLabsCredits(
  characters: number,
  config: PricingValues,
): number {
  if (!Number.isFinite(characters) || characters <= 0) return 0
  return Math.max(1, Math.ceil((characters / 1_000) * config.creditsPerKElevenLabsChars))
}
