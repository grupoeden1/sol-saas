import { getActiveKbCollections } from '@sol/db';
import { generateEmbedding } from './embeddings';
import { isQdrantAvailable, searchPoints } from './qdrant';
import { estimateTokens } from '@sol/db/token-counter';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RetrievedChunk {
  text: string;
  score: number;
  sourceTitle: string;
  sourceType: string;
  collectionName: string;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  totalTokens: number;
  searchTimeMs: number;
}

export interface RetrievalOptions {
  maxChunks?: number;
  maxTokens?: number;
  minScore?: number;
  collections?: string[]; // qdrantName list; if empty, search all active
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_MAX_CHUNKS = 5;
const DEFAULT_MAX_TOKENS = 2000;
const DEFAULT_MIN_SCORE = 0.3;

// ─── Retrieval ──────────────────────────────────────────────────────────────

/**
 * Retrieve relevant knowledge chunks from Qdrant for a given query.
 *
 * Searches across all active collections (or specified ones) and returns
 * the top-ranked chunks, respecting a hard token cap.
 *
 * Returns empty result gracefully if Qdrant is unavailable.
 */
export async function retrieveKnowledge(
  query: string,
  options?: RetrievalOptions,
): Promise<RetrievalResult> {
  const startTime = Date.now();

  const maxChunks = options?.maxChunks ?? DEFAULT_MAX_CHUNKS;
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const minScore = options?.minScore ?? DEFAULT_MIN_SCORE;

  // Check Qdrant availability
  const available = await isQdrantAvailable();
  if (!available) {
    return { chunks: [], totalTokens: 0, searchTimeMs: Date.now() - startTime };
  }

  // Determine which collections to search
  let collectionsToSearch: { qdrantName: string; name: string }[];

  if (options?.collections && options.collections.length > 0) {
    collectionsToSearch = options.collections.map((qn) => ({ qdrantName: qn, name: qn }));
  } else {
    collectionsToSearch = await getActiveKbCollections();
  }

  if (collectionsToSearch.length === 0) {
    return { chunks: [], totalTokens: 0, searchTimeMs: Date.now() - startTime };
  }

  // Generate embedding for the query
  const queryVector = await generateEmbedding(query);

  // Search all collections in parallel
  const searchPromises = collectionsToSearch.map(async (col) => {
    try {
      const results = await searchPoints(col.qdrantName, queryVector, maxChunks, minScore);
      return results.map((r) => ({
        ...r,
        collectionName: col.name,
      }));
    } catch {
      // If a collection fails (e.g., deleted), skip it
      return [];
    }
  });

  const allResults = (await Promise.all(searchPromises)).flat();

  // Sort by score descending
  allResults.sort((a, b) => b.score - a.score);

  // Apply token budget
  const chunks: RetrievedChunk[] = [];
  let totalTokens = 0;

  for (const result of allResults) {
    if (chunks.length >= maxChunks) break;

    const text = (result.payload?.text as string) || '';
    const tokens = estimateTokens(text);

    if (totalTokens + tokens > maxTokens) break;

    chunks.push({
      text,
      score: result.score,
      sourceTitle: (result.payload?.sourceTitle as string) || 'Desconhecido',
      sourceType: (result.payload?.sourceType as string) || 'UNKNOWN',
      collectionName: result.collectionName,
    });

    totalTokens += tokens;
  }

  return {
    chunks,
    totalTokens,
    searchTimeMs: Date.now() - startTime,
  };
}
