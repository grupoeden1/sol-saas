import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';

// ─── GET — Document processing status ──────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.kbDocument.findUnique({
    where: { id },
    select: {
      processingStatus: true,
      chunkCount: true,
      totalTokens: true,
      errorMessage: true,
      processingTimeMs: true,
    },
  });

  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(doc);
}
