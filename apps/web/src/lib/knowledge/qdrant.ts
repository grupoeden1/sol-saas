import { QdrantClient } from '@qdrant/js-client-rest';

// ─── Constants ──────────────────────────────────────────────────────────────

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || 'sol_qdrant_dev';
export const EMBEDDING_DIMENSIONS = 3072; // text-embedding-3-large

// ─── Singleton Client ───────────────────────────────────────────────────────

let client: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (!client) {
    client = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
    });
  }
  return client;
}

// ─── Health Check ───────────────────────────────────────────────────────────

export async function isQdrantAvailable(): Promise<boolean> {
  try {
    const qdrant = getQdrantClient();
    await qdrant.getCollections();
    return true;
  } catch {
    return false;
  }
}

// ─── Collection Operations ──────────────────────────────────────────────────

export async function ensureCollection(name: string): Promise<void> {
  const qdrant = getQdrantClient();

  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((c) => c.name === name);

  if (!exists) {
    await qdrant.createCollection(name, {
      vectors: {
        size: EMBEDDING_DIMENSIONS,
        distance: 'Cosine',
      },
    });
  }
}

export async function deleteQdrantCollection(name: string): Promise<void> {
  const qdrant = getQdrantClient();
  try {
    await qdrant.deleteCollection(name);
  } catch (err) {
    console.warn(`[Qdrant] Failed to delete collection ${name}:`, err instanceof Error ? err.message : err);
  }
}

// ─── Point Operations ───────────────────────────────────────────────────────

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export async function upsertPoints(collection: string, points: QdrantPoint[]): Promise<void> {
  if (points.length === 0) return;

  const qdrant = getQdrantClient();
  await qdrant.upsert(collection, {
    wait: true,
    points: points.map((p) => ({
      id: p.id,
      vector: p.vector,
      payload: p.payload,
    })),
  });
}

export async function deletePointsByDocumentId(collection: string, documentId: string): Promise<void> {
  const qdrant = getQdrantClient();
  await qdrant.delete(collection, {
    wait: true,
    filter: {
      must: [{ key: 'documentId', match: { value: documentId } }],
    },
  });
}

// ─── Search ─────────────────────────────────────────────────────────────────

export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

export async function searchPoints(
  collection: string,
  vector: number[],
  limit: number,
  minScore?: number,
): Promise<SearchResult[]> {
  const qdrant = getQdrantClient();

  const results = await qdrant.search(collection, {
    vector,
    limit,
    score_threshold: minScore,
    with_payload: true,
  });

  return results.map((r) => ({
    id: typeof r.id === 'string' ? r.id : String(r.id),
    score: r.score,
    payload: (r.payload as Record<string, unknown>) ?? {},
  }));
}

// ─── UUID Generation ────────────────────────────────────────────────────────

export function generatePointId(): string {
  return crypto.randomUUID();
}
