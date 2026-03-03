import { encoding_for_model, type TiktokenModel } from 'tiktoken'

// ─── countTokens ───────────────────────────────────────────────────────────

/**
 * Conta tokens de um array de mensagens usando tiktoken.
 * Inclui overhead de formatação por mensagem (~4 tokens) e priming (~2 tokens).
 */
export function countTokens(
  messages: Array<{ role: string; content: string }>,
  model: string,
): number {
  let enc
  try {
    enc = encoding_for_model(model as TiktokenModel)
  } catch {
    enc = encoding_for_model('gpt-4o' as TiktokenModel)
  }

  try {
    let total = 0
    for (const msg of messages) {
      total += 4 // overhead por mensagem (role, name, separadores)
      total += enc.encode(msg.content).length
    }
    total += 2 // assistant reply priming
    return total
  } finally {
    enc.free()
  }
}

// ─── countRawTokens ──────────────────────────────────────────────────────

/**
 * Conta tokens de um texto puro, sem overhead de mensagem.
 * Usado para contar tokens de output isoladamente.
 */
export function countRawTokens(text: string, model: string): number {
  let enc
  try {
    enc = encoding_for_model(model as TiktokenModel)
  } catch {
    enc = encoding_for_model('gpt-4o' as TiktokenModel)
  }

  try {
    return enc.encode(text).length
  } finally {
    enc.free()
  }
}

// ─── calculateImageCost ──────────────────────────────────────────────────────

/**
 * Calcula custo em tokens de uma imagem para a OpenAI Vision API.
 *
 * @see https://platform.openai.com/docs/guides/vision
 */
export function calculateImageCost(
  width: number,
  height: number,
  detail: 'low' | 'high' | 'auto',
): number {
  if (detail === 'auto') {
    return width > 512 || height > 512
      ? calculateImageCost(width, height, 'high')
      : 85
  }

  if (detail === 'low') return 85

  let w = width
  let h = height

  if (w > 2048 || h > 2048) {
    const scale = 2048 / Math.max(w, h)
    w = Math.floor(w * scale)
    h = Math.floor(h * scale)
  }

  const shortSide = Math.min(w, h)
  if (shortSide > 768) {
    const scale = 768 / shortSide
    w = Math.floor(w * scale)
    h = Math.floor(h * scale)
  }

  const tilesX = Math.ceil(w / 512)
  const tilesY = Math.ceil(h / 512)

  return (tilesX * tilesY * 170) + 85
}
