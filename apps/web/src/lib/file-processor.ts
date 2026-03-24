import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import sharp from 'sharp'
import { countRawTokens, calculateImageCost } from '@sol/db/token-counter'

// ─── Constants ──────────────────────────────────────────────────────────────

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_FILES_PER_MSG = 3
export const MAX_DOC_CHARS = 50_000

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

const IMAGE_MIMES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProcessedFile =
  | {
      type: 'image'
      width: number
      height: number
      base64: string
      mimeType: string
      tokens: number
    }
  | {
      type: 'document'
      text: string
      filename: string
      tokens: number
    }

// ─── Validation ─────────────────────────────────────────────────────────────

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    return {
      valid: false,
      error: `Tipo de arquivo não suportado: ${file.type}. Tipos aceitos: JPEG, PNG, GIF, WEBP, PDF, TXT, MD, DOCX.`,
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `Arquivo '${file.name}' excede o limite de 10MB (${sizeMB}MB).`,
    }
  }

  return { valid: true }
}

// ─── Extraction functions ───────────────────────────────────────────────────

export async function extractTextFromPDF(
  buffer: Buffer,
): Promise<{ text: string; isEmpty: boolean }> {
  const result = await pdfParse(buffer)
  const text = result.text?.trim() ?? ''
  return { text, isEmpty: text.length < 10 }
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

export function extractTextFromPlain(buffer: Buffer): string {
  return buffer.toString('utf-8')
}

export async function getImageDimensions(
  buffer: Buffer,
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(buffer).metadata()
  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
  }
}

// ─── Processing ─────────────────────────────────────────────────────────────

export async function processFile(file: File): Promise<ProcessedFile> {
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (IMAGE_MIMES.has(file.type)) {
    const { width, height } = await getImageDimensions(buffer)
    const tokens = calculateImageCost(width, height, 'auto')
    const base64 = buffer.toString('base64')

    return { type: 'image', width, height, base64, mimeType: file.type, tokens }
  }

  // Document processing
  let text: string

  if (file.type === 'application/pdf') {
    const result = await extractTextFromPDF(buffer)
    if (result.isEmpty) {
      throw new Error(
        'Este PDF não contém texto legível. Envie como imagem ou digite o conteúdo.',
      )
    }
    text = result.text
  } else if (
    file.type ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    text = await extractTextFromDOCX(buffer)
  } else {
    text = extractTextFromPlain(buffer)
  }

  if (text.trim().length === 0) {
    throw new Error(
      `Documento '${file.name}' está vazio ou não contém texto legível.`,
    )
  }

  if (text.length > MAX_DOC_CHARS) {
    throw new Error(
      `Documento '${file.name}' muito grande (${text.length} caracteres). Máximo: 50.000 caracteres (~25 páginas).`,
    )
  }

  const tokens = countRawTokens(text)

  return { type: 'document', text, filename: file.name, tokens }
}

export async function processFiles(files: File[]): Promise<ProcessedFile[]> {
  if (files.length > MAX_FILES_PER_MSG) {
    throw new Error('Máximo de 3 arquivos por mensagem.')
  }

  const results: ProcessedFile[] = []

  for (const file of files) {
    try {
      const processed = await processFile(file)
      results.push(processed)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Erro em '${file.name}': ${error.message}`)
      }
      throw error
    }
  }

  return results
}
