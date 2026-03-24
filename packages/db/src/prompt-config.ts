import { prisma } from './index'

// ─── Prompt Keys ────────────────────────────────────────────────────────────

export const PROMPT_KEYS = [
  'PROMPT_SYSTEM_CHAT',
  'PROMPT_BASE_AD_MODELED',
  'PROMPT_BASE_AD_FROM_SCRATCH',
  'PROMPT_BASE_ORGANIC_MODELED',
  'PROMPT_BASE_ORGANIC_FROM_SCRATCH',
  'PROMPT_MODULE_EDUCATION',
  'PROMPT_MODULE_TRUST',
  'PROMPT_MODULE_DIFFERENTIATION',
  'PROMPT_MODULE_URGENCY',
  'PROMPT_MODULE_SOCIAL_PROOF',
  'PROMPT_MARKET_CLASSIFIER',
  'PROMPT_VIDEO_FRAME_DESC',
  'PROMPT_VIDEO_STRUCTURE',
] as const

export type PromptKey = (typeof PROMPT_KEYS)[number]

// ─── In-memory cache (60s TTL, same pattern as ai-config.ts) ────────────────

let _cache: Map<string, string> | null = null
let _cacheTs = 0
const TTL = 60_000

async function loadCache(): Promise<Map<string, string>> {
  if (_cache && Date.now() - _cacheTs < TTL) return _cache

  const rows = await prisma.appConfig.findMany({
    where: { key: { in: [...PROMPT_KEYS] } },
  })

  const map = new Map<string, string>()
  for (const row of rows) {
    map.set(row.key, row.value)
  }

  _cache = map
  _cacheTs = Date.now()
  return map
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function getPromptOverride(key: PromptKey): Promise<string | null> {
  const cache = await loadCache()
  return cache.get(key) ?? null
}

export async function getAllPromptOverrides(): Promise<Record<string, string>> {
  const cache = await loadCache()
  const result: Record<string, string> = {}
  for (const [k, v] of cache) {
    result[k] = v
  }
  return result
}

export async function setPromptOverride(key: PromptKey, value: string): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
  invalidatePromptCache()
}

export async function deletePromptOverride(key: PromptKey): Promise<void> {
  await prisma.appConfig.deleteMany({ where: { key } })
  invalidatePromptCache()
}

export function invalidatePromptCache(): void {
  _cache = null
  _cacheTs = 0
}
