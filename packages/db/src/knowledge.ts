import { prisma } from './index'

// ─── Slug Generator ────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

// ─── Collection Operations ──────────────────────────────────────────────────

export async function listKbCollections() {
  return prisma.kbCollection.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { documents: true } },
    },
  })
}

export async function getKbCollection(slug: string) {
  return prisma.kbCollection.findUnique({
    where: { slug },
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
  })
}

export async function getKbCollectionById(id: string) {
  return prisma.kbCollection.findUnique({
    where: { id },
    include: {
      _count: { select: { documents: true } },
    },
  })
}

export async function createKbCollection(data: {
  name: string
  description?: string
  tags?: string[]
}) {
  const baseSlug = generateSlug(data.name)
  // Ensure unique slug
  let slug = baseSlug
  let attempt = 0
  while (await prisma.kbCollection.findUnique({ where: { slug } })) {
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 25)
  const qdrantName = `kb_${id}`

  return prisma.kbCollection.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      tags: data.tags ?? [],
      qdrantName,
    },
  })
}

export async function updateKbCollection(
  id: string,
  data: { name?: string; description?: string; tags?: string[]; isActive?: boolean },
) {
  return prisma.kbCollection.update({
    where: { id },
    data,
  })
}

export async function deleteKbCollection(id: string) {
  const collection = await prisma.kbCollection.findUnique({
    where: { id },
    select: { qdrantName: true },
  })
  if (!collection) throw new Error('Collection not found')

  // Prisma cascade handles KbDocument -> KbChunk
  await prisma.kbCollection.delete({ where: { id } })
  return { qdrantName: collection.qdrantName }
}

// ─── Document Operations ────────────────────────────────────────────────────

export async function createKbDocument(data: {
  collectionId: string
  title: string
  fileName?: string
  sourceType: 'PDF' | 'DOCX' | 'TXT' | 'VIDEO'
  fileSize?: number
}) {
  return prisma.kbDocument.create({ data })
}

export async function getKbDocument(id: string) {
  return prisma.kbDocument.findUnique({
    where: { id },
    include: {
      collection: { select: { id: true, name: true, qdrantName: true } },
      chunks: {
        orderBy: { chunkIndex: 'asc' },
        select: { id: true, chunkIndex: true, text: true, tokenCount: true, qdrantPointId: true },
      },
    },
  })
}

export async function updateKbDocumentStatus(
  id: string,
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
  meta?: {
    textContent?: string
    chunkCount?: number
    totalTokens?: number
    embeddingTokens?: number
    processingTimeMs?: number
    errorMessage?: string
    videoTranscription?: string
    videoAnalysis?: string
  },
) {
  return prisma.kbDocument.update({
    where: { id },
    data: { processingStatus: status, ...meta },
  })
}

export async function deleteKbDocument(id: string) {
  const doc = await prisma.kbDocument.findUnique({
    where: { id },
    select: {
      collection: { select: { qdrantName: true } },
      chunks: { select: { qdrantPointId: true } },
    },
  })
  if (!doc) throw new Error('Document not found')

  await prisma.kbDocument.delete({ where: { id } })

  return {
    qdrantCollectionName: doc.collection.qdrantName,
    qdrantPointIds: doc.chunks.map((c) => c.qdrantPointId).filter(Boolean) as string[],
  }
}

// ─── Chunk Operations ───────────────────────────────────────────────────────

export async function createKbChunks(
  documentId: string,
  chunks: { text: string; tokenCount: number; qdrantPointId: string; chunkIndex: number }[],
) {
  await prisma.kbChunk.createMany({
    data: chunks.map((c) => ({
      documentId,
      chunkIndex: c.chunkIndex,
      text: c.text,
      tokenCount: c.tokenCount,
      qdrantPointId: c.qdrantPointId,
    })),
  })
}

// ─── RAG Helpers ────────────────────────────────────────────────────────────

export async function getActiveKbCollections() {
  return prisma.kbCollection.findMany({
    where: { isActive: true },
    select: { qdrantName: true, name: true },
  })
}
