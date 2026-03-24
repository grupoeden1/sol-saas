// ─── Token estimation ──────────────────────────────────────────────────────
// Replaced tiktoken with simple heuristic estimation.
// Actual token counts come from the Anthropic API response (usage.input_tokens / output_tokens).

/**
 * Estimates tokens for an array of messages.
 * Uses ~4 chars per token heuristic + overhead per message.
 * This is used ONLY for the pre-call credit gate estimation.
 * Real billing uses actual usage from the API response.
 */
export function countTokens(
  messages: Array<{ role: string; content: string }>,
  _model?: string,
): number {
  let total = 0
  for (const msg of messages) {
    total += 4 // overhead per message (role, separators)
    total += estimateTokens(msg.content)
  }
  total += 2 // assistant reply priming
  return total
}

/**
 * Estimates tokens for a raw text string.
 * Used for pre-call gate estimation only.
 */
export function countRawTokens(text: string, _model?: string): number {
  return estimateTokens(text)
}

/**
 * Simple token estimation: ~4 characters per token.
 * Conservative estimate suitable for credit gate checks.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// ─── calculateImageCost ──────────────────────────────────────────────────────

/**
 * Estimates token cost of an image for Claude Vision API.
 * Claude charges based on image size:
 * - Images are resized to fit within a 1568x1568 bounding box
 * - Cost is approximately (width * height) / 750 tokens
 * @see https://docs.anthropic.com/en/docs/build-with-claude/vision#image-costs
 */
export function calculateImageCost(
  width: number,
  height: number,
  _detail?: 'low' | 'high' | 'auto',
): number {
  let w = width
  let h = height

  // Scale down to fit within 1568x1568
  if (w > 1568 || h > 1568) {
    const scale = 1568 / Math.max(w, h)
    w = Math.floor(w * scale)
    h = Math.floor(h * scale)
  }

  // Claude's approximate formula
  return Math.ceil((w * h) / 750)
}
