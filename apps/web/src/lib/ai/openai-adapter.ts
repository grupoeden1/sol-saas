import OpenAI from 'openai'
import type {
  AiAdapter,
  StreamResult,
  UserContentBlock,
} from './types'

let _client: OpenAI | null = null
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _client
}

function toOpenAIContent(
  content: UserContentBlock[] | string,
): string | OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  if (typeof content === 'string') return content
  return content.map((block): OpenAI.Chat.Completions.ChatCompletionContentPart => {
    if (block.type === 'text') return { type: 'text', text: block.text }
    return {
      type: 'image_url',
      image_url: { url: `data:${block.mimeType};base64,${block.base64}` },
    }
  })
}

export const openaiAdapter: AiAdapter = {
  async stream({ model, systemPrompt, messages, userContent, maxTokens, temperature = 0.7 }) {
    const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: toOpenAIContent(userContent) },
    ]

    const response = await getClient().chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: apiMessages,
      temperature,
      stream: true,
      stream_options: { include_usage: true },
    })

    let inputTokens = 0
    let outputTokens = 0

    async function* textStream() {
      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta?.content
        if (delta) yield delta
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens ?? 0
          outputTokens = chunk.usage.completion_tokens ?? 0
        }
      }
    }

    const result: StreamResult = {
      textStream: textStream(),
      usage: async () => ({ inputTokens, outputTokens }),
    }

    return result
  },

  async complete({ model, systemPrompt, messages, maxTokens, temperature = 0, signal }) {
    const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []
    if (systemPrompt) apiMessages.push({ role: 'system', content: systemPrompt })

    for (const m of messages) {
      if (m.role === 'assistant') {
        const text = typeof m.content === 'string' ? m.content : m.content.filter((b) => b.type === 'text').map((b) => (b as { type: 'text'; text: string }).text).join('')
        apiMessages.push({ role: 'assistant', content: text })
      } else {
        apiMessages.push({ role: 'user', content: toOpenAIContent(m.content) })
      }
    }

    const response = await getClient().chat.completions.create(
      {
        model,
        max_tokens: maxTokens,
        messages: apiMessages,
        temperature,
      },
      { signal: signal ?? null },
    )

    return {
      text: response.choices[0]?.message?.content ?? '',
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    }
  },
}
