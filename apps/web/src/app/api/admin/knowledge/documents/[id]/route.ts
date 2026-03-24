import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getKbDocument, deleteKbDocument } from '@sol/db';
import { deletePointsByDocumentId } from '@/lib/knowledge/qdrant';

// ─── GET — Document detail ─────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const doc = await getKbDocument(id);
  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ document: doc });
}

// ─── DELETE — Delete document ──────────────────────────────────────────────

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
    const { qdrantCollectionName } = await deleteKbDocument(id);

    // Delete points from Qdrant (best-effort)
    try {
      await deletePointsByDocumentId(qdrantCollectionName, id);
    } catch (err) {
      console.warn('[KB API] Failed to delete Qdrant points:', err instanceof Error ? err.message : err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao deletar documento' },
      { status: 400 },
    );
  }
}
