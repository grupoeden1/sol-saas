import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { listKbCollections, createKbCollection } from '@sol/db';
import { ensureCollection } from '@/lib/knowledge/qdrant';

// ─── Schemas ───────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

// ─── GET — List collections ────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const collections = await listKbCollections();

  return NextResponse.json({
    collections: collections.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      tags: c.tags,
      isActive: c.isActive,
      documentCount: c._count.documents,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

// ─── POST — Create collection ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const collection = await createKbCollection(parsed.data);

  // Create corresponding Qdrant collection
  try {
    await ensureCollection(collection.qdrantName);
  } catch (err) {
    console.warn('[KB API] Failed to create Qdrant collection:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ collection }, { status: 201 });
}
