import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getKbCollectionById, updateKbCollection, deleteKbCollection } from '@sol/db';
import { deleteQdrantCollection } from '@/lib/knowledge/qdrant';
import { prisma } from '@sol/db';

// ─── Schemas ───────────────────────────────────────────────────────────────

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isActive: z.boolean().optional(),
});

// ─── GET — Collection detail ───────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const collection = await prisma.kbCollection.findUnique({
    where: { id },
    include: {
      documents: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          fileName: true,
          sourceType: true,
          fileSize: true,
          chunkCount: true,
          totalTokens: true,
          processingStatus: true,
          errorMessage: true,
          createdAt: true,
        },
      },
      _count: { select: { documents: true } },
    },
  });

  if (!collection) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    collection: {
      ...collection,
      documentCount: collection._count.documents,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
      documents: collection.documents.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
      })),
    },
  });
}

// ─── PUT — Update collection ───────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await getKbCollectionById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await updateKbCollection(id, parsed.data);
  return NextResponse.json({ collection: updated });
}

// ─── DELETE — Delete collection ────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { qdrantName } = await deleteKbCollection(id);

    // Delete Qdrant collection (best-effort)
    await deleteQdrantCollection(qdrantName);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao deletar coleção' },
      { status: 400 },
    );
  }
}
