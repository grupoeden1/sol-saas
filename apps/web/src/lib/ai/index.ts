import { anthropicAdapter } from './anthropic-adapter'
import { openaiAdapter } from './openai-adapter'
import type { AiAdapter, AiProvider } from './types'

export type {
  AiAdapter,
  AiProvider,
  StreamResult,
  TextMessage,
  UserContentBlock,
  ImageBlock,
} from './types'

let _adapter: AiAdapter | null = null
let _cachedProvider: AiProvider | null = null

export function getAiAdapter(provider: AiProvider): AiAdapter {
  if (_adapter && _cachedProvider === provider) return _adapter
  _adapter = provider === 'openai' ? openaiAdapter : anthropicAdapter
  _cachedProvider = provider
  return _adapter
}

export function invalidateAiAdapterCache(): void {
  _adapter = null
  _cachedProvider = null
}
