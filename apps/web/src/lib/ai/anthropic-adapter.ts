import Anthropic from '@anthropic-ai/sdk'
import type { AiAdapter, StreamResult, UserContentBlock } from './types'

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

function toAnthropicContent(
  content: UserContentBlock[] | string,
): Anthropic.ContentBlockParam[] | string {
  if (typeof content === 'string') return content
  return content.map((block): Anthropic.ContentBlockParam => {
    if (block.type === 'text') return { type: 'text', text: block.text }
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: block.mimeType,
        data: block.base64,
      },
    }
  })
}

export const anthropicAdapter: AiAdapter = {
  async stream({ model, systemPrompt, messages, userContent, maxTokens, temperature = 0.7 }) {
    const apiMessages: Anthropic.MessageParam[] = [
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: toAnthropicContent(userContent) },
    ]

    const streamInstance = getClient().messages.stream({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: apiMessages,
      temperature,
    })

    async function* textStream() {
      for await (const event of streamInstance) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield event.delta.text
        }
      }
    }

    const result: StreamResult = {
      textStream: textStream(),
      usage: async () => {
        const final = await streamInstance.finalMessage()
        return {
          inputTokens: final.usage.input_tokens,
          outputTokens: final.usage.output_tokens,
        }
      },
    }

    return result
  },

  async complete({ model, systemPrompt, messages, maxTokens, temperature = 0, signal }) {
    const response = await getClient().messages.create(
      {
        model,
        max_tokens: maxTokens,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        temperature,
        messages: messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: toAnthropicContent(m.content),
        })),
      },
      signal ? { signal } : undefined,
    )
    const text =
      response.content[0]?.type === 'text' ? response.content[0].text : ''
    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }
  },
}
