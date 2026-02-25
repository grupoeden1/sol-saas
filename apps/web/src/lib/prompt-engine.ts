import OpenAI from "openai";
import type { ChatMessage, StepResult } from "./steps/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Call OpenAI with automatic retry on JSON parse failures.
 * Falls back to Anthropic if ANTHROPIC_API_KEY is set and OpenAI fails.
 */
export async function callAI(
  systemPrompt: string,
  messages: ChatMessage[],
  model: string
): Promise<StepResult> {
  const aiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
  ];

  // Try OpenAI with up to 2 attempts on JSON parse failure
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: aiMessages,
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);

      return {
        message: parsed.message || "Sem resposta",
        ready_to_advance: parsed.ready_to_advance === true,
        tokens: response.usage?.total_tokens,
        model: response.model,
      };
    } catch (err) {
      if (attempt === 1) {
        // Second attempt also failed — try Anthropic fallback
        if (process.env.ANTHROPIC_API_KEY) {
          return callAnthropic(systemPrompt, messages);
        }
        throw err;
      }
      // First attempt failed — retry once
    }
  }

  throw new Error("All AI attempts failed");
}

/**
 * Anthropic fallback via raw fetch (no SDK required).
 */
async function callAnthropic(
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<StepResult> {
  const anthropicMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system:
        systemPrompt +
        "\n\nIMPORTANTE: Responda APENAS com JSON válido, sem markdown ou texto fora do JSON.",
      messages: anthropicMessages,
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error ${response.status}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
    usage?: { input_tokens: number; output_tokens: number };
    model?: string;
  };

  const text = data.content[0]?.text || "{}";

  try {
    const parsed = JSON.parse(text);
    return {
      message: parsed.message || "Sem resposta",
      ready_to_advance: parsed.ready_to_advance === true,
      tokens: data.usage
        ? data.usage.input_tokens + data.usage.output_tokens
        : undefined,
      model: data.model,
    };
  } catch {
    return { message: text, ready_to_advance: false };
  }
}
