import { estimateTokens } from '@sol/db/token-counter';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Chunk {
  text: string;
  tokenCount: number;
  index: number;
}

export interface ChunkOptions {
  maxTokens?: number;
  overlapTokens?: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_OVERLAP_TOKENS = 50;

// ─── Chunking ───────────────────────────────────────────────────────────────

/**
 * Split text into overlapping chunks optimized for RAG retrieval.
 *
 * Strategy:
 * 1. Split by paragraphs (\n\n)
 * 2. If a paragraph exceeds maxTokens, split by sentences
 * 3. If a sentence exceeds maxTokens, split by words
 * 4. Merge small segments into chunks respecting maxTokens
 * 5. Add overlap between consecutive chunks
 */
export function chunkText(text: string, options?: ChunkOptions): Chunk[] {
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const overlapTokens = options?.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;

  if (!text || text.trim().length === 0) return [];

  // Split into paragraphs
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Break paragraphs into segments that fit within maxTokens
  const segments: string[] = [];
  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);
    if (paraTokens <= maxTokens) {
      segments.push(para);
    } else {
      // Split by sentences
      const sentences = splitSentences(para);
      for (const sentence of sentences) {
        const sentTokens = estimateTokens(sentence);
        if (sentTokens <= maxTokens) {
          segments.push(sentence);
        } else {
          // Split by words as last resort
          const words = sentence.split(/\s+/);
          let current = '';
          for (const word of words) {
            const candidate = current ? `${current} ${word}` : word;
            if (estimateTokens(candidate) > maxTokens && current) {
              segments.push(current);
              current = word;
            } else {
              current = candidate;
            }
          }
          if (current) segments.push(current);
        }
      }
    }
  }

  // Merge segments into chunks respecting maxTokens
  const chunks: Chunk[] = [];
  let currentText = '';
  let currentTokens = 0;

  for (const segment of segments) {
    const segTokens = estimateTokens(segment);
    const separator = currentText ? '\n\n' : '';
    const candidateText = currentText + separator + segment;
    const candidateTokens = estimateTokens(candidateText);

    if (candidateTokens > maxTokens && currentText) {
      // Save current chunk
      chunks.push({
        text: currentText,
        tokenCount: currentTokens,
        index: chunks.length,
      });

      // Start new chunk with overlap from previous
      const overlapText = getOverlapText(currentText, overlapTokens);
      if (overlapText) {
        currentText = overlapText + '\n\n' + segment;
        currentTokens = estimateTokens(currentText);
      } else {
        currentText = segment;
        currentTokens = segTokens;
      }
    } else {
      currentText = candidateText;
      currentTokens = candidateTokens;
    }
  }

  // Save last chunk
  if (currentText) {
    chunks.push({
      text: currentText,
      tokenCount: currentTokens,
      index: chunks.length,
    });
  }

  return chunks;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function splitSentences(text: string): string[] {
  // Split on sentence boundaries: period, exclamation, question mark followed by space or end
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.filter((p) => p.trim().length > 0);
}

function getOverlapText(text: string, targetTokens: number): string {
  if (targetTokens <= 0) return '';

  // Take text from the end, respecting word boundaries
  const words = text.split(/\s+/);
  let result = '';

  for (let i = words.length - 1; i >= 0; i--) {
    const candidate = words.slice(i).join(' ');
    if (estimateTokens(candidate) > targetTokens) {
      break;
    }
    result = candidate;
  }

  return result;
}
