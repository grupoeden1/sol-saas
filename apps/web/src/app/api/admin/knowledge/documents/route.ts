import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createKbDocument, prisma } from '@sol/db';
import { saveKbFile } from '@/lib/knowledge/storage';
import { processKbDocument, processKbVideo } from '@/lib/knowledge/processor';

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_DOC_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

const DOC_MIME_MAP: Record<string, 'PDF' | 'DOCX' | 'TXT'> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'text/plain': 'TXT',
  'text/markdown': 'TXT',
};

const VIDEO_MIMES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
]);

// ─── POST — Upload document/video ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const collectionId = formData.get('collectionId') as string;
  const title = formData.get('title') as string;
  const file = formData.get('file') as File | null;

  if (!collectionId || !title || !file) {
    return NextResponse.json(
      { error: 'collectionId, title e file são obrigatórios' },
      { status: 400 },
    );
  }

  // Validate collection exists
  const collection = await prisma.kbCollection.findUnique({
    where: { id: collectionId },
    select: { id: true },
  });
  if (!collection) {
    return NextResponse.json({ error: 'Coleção não encontrada' }, { status: 404 });
  }

  // Determine type
  const isVideo = VIDEO_MIMES.has(file.type);
  const docType = DOC_MIME_MAP[file.type];

  if (!isVideo && !docType) {
    return NextResponse.json(
      {
        error: `Tipo de arquivo não suportado: ${file.type}. Aceitos: PDF, DOCX, TXT, MP4, MOV, AVI, WebM.`,
      },
      { status: 400 },
    );
  }

  // Validate size
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_DOC_SIZE;
  if (file.size > maxSize) {
    const sizeMB = Math.round(maxSize / (1024 * 1024));
    return NextResponse.json(
      { error: `Arquivo excede o limite de ${sizeMB}MB` },
      { status: 400 },
    );
  }

  // Create document record
  const doc = await createKbDocument({
    collectionId,
    title,
    fileName: file.name,
    sourceType: isVideo ? 'VIDEO' : docType!,
    fileSize: file.size,
  });

  // Save file to temp storage
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = await saveKbFile(buffer, doc.id, file.name);

  // Kick off background processing
  if (isVideo) {
    processKbVideo(doc.id, filePath).catch((err) => {
      console.error(`[KB Upload] Video processing failed for ${doc.id}:`, err);
    });
  } else {
    processKbDocument(doc.id, filePath).catch((err) => {
      console.error(`[KB Upload] Document processing failed for ${doc.id}:`, err);
    });
  }

  return NextResponse.json(
    { documentId: doc.id, status: 'QUEUED' },
    { status: 201 },
  );
}
