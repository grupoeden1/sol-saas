import { prisma } from './index'

export type AiProvider = 'anthropic' | 'openai'

export interface AiConfig {
  provider: AiProvider
  defaultModel: string
  finalModel: string
}

const AI_CONFIG_KEYS = [
  'AI_PROVIDER',
  'ANTHROPIC_MODEL_DEFAULT',
  'ANTHROPIC_MODEL_FINAL',
  'OPENAI_MODEL_DEFAULT',
  'OPENAI_MODEL_FINAL',
] as const

let _cache: AiConfig | null = null
let _cacheTs = 0
const TTL = 60_000

export async function getAiConfig(): Promise<AiConfig> {
  if (_cache && Date.now() - _cacheTs < TTL) return _cache

  const rows = await prisma.appConfig.findMany({
    where: { key: { in: [...AI_CONFIG_KEYS] } },
  })

  const get = (key: string): string | undefined =>
    rows.find((r) => r.key === key)?.value

  const provider = (get('AI_PROVIDER') ?? 'anthropic') as AiProvider

  const defaultModel =
    provider === 'openai'
      ? (get('OPENAI_MODEL_DEFAULT') ?? process.env.OPENAI_MODEL_DEFAULT ?? 'gpt-4o-mini')
      : (get('ANTHROPIC_MODEL_DEFAULT') ?? process.env.ANTHROPIC_MODEL_DEFAULT ?? 'claude-haiku-4-5-20251001')

  const finalModel =
    provider === 'openai'
      ? (get('OPENAI_MODEL_FINAL') ?? process.env.OPENAI_MODEL_FINAL ?? 'gpt-4o')
      : (get('ANTHROPIC_MODEL_FINAL') ?? process.env.ANTHROPIC_MODEL_FINAL ?? 'claude-sonnet-4-5-20250929')

  _cache = { provider, defaultModel, finalModel }
  _cacheTs = Date.now()
  return _cache
}

export function invalidateAiConfigCache(): void {
  _cache = null
  _cacheTs = 0
}
