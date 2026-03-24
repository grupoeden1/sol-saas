export type AiProvider = 'anthropic' | 'openai'

export interface ImageBlock {
  type: 'image'
  base64: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
}

export type UserContentBlock = { type: 'text'; text: string } | ImageBlock

export interface TextMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface StreamResult {
  textStream: AsyncIterable<string>
  usage: () => Promise<{ inputTokens: number; outputTokens: number }>
}

export interface AiAdapter {
  stream(params: {
    model: string
    systemPrompt: string
    messages: TextMessage[]
    userContent: UserContentBlock[] | string
    maxTokens: number
    temperature?: number
  }): Promise<StreamResult>

  complete(params: {
    model: string
    systemPrompt?: string
    messages: Array<{ role: 'user' | 'assistant'; content: UserContentBlock[] | string }>
    maxTokens: number
    temperature?: number
    signal?: AbortSignal
  }): Promise<{ text: string; inputTokens: number; outputTokens: number }>
}
