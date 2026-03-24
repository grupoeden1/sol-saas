import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { retrieveKnowledge } from '@/lib/knowledge/retriever';

// ─── Schemas ───────────────────────────────────────────────────────────────

const SearchSchema = z.object({
  query: z.string().min(1).max(2000),
  collections: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(20).optional(),
  minScore: z.number().min(0).max(1).optional(),
});

// ─── POST — Semantic search ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = SearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { query, collections, limit, minScore } = parsed.data;

  const result = await retrieveKnowledge(query, {
    maxChunks: limit ?? 10,
    maxTokens: 5000, // Higher for admin testing
    minScore: minScore ?? 0.2,
    collections,
  });

  return NextResponse.json({
    query,
    results: result.chunks,
    totalTokens: result.totalTokens,
    searchTimeMs: result.searchTimeMs,
  });
}
