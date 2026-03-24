-- CreateEnum
CREATE TYPE "KbDocumentType" AS ENUM ('PDF', 'DOCX', 'TXT', 'VIDEO');

-- CreateEnum
CREATE TYPE "KbProcessingStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "KbCollection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "qdrantName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KbCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KbDocument" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT,
    "sourceType" "KbDocumentType" NOT NULL,
    "fileSize" INTEGER,
    "textContent" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "embeddingTokens" INTEGER NOT NULL DEFAULT 0,
    "processingStatus" "KbProcessingStatus" NOT NULL DEFAULT 'QUEUED',
    "processingTimeMs" INTEGER,
    "errorMessage" TEXT,
    "videoTranscription" TEXT,
    "videoAnalysis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KbDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KbChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "qdrantPointId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KbChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KbCollection_slug_key" ON "KbCollection"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "KbCollection_qdrantName_key" ON "KbCollection"("qdrantName");

-- CreateIndex
CREATE INDEX "KbCollection_isActive_idx" ON "KbCollection"("isActive");

-- CreateIndex
CREATE INDEX "KbDocument_collectionId_idx" ON "KbDocument"("collectionId");

-- CreateIndex
CREATE INDEX "KbDocument_processingStatus_idx" ON "KbDocument"("processingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "KbChunk_qdrantPointId_key" ON "KbChunk"("qdrantPointId");

-- CreateIndex
CREATE INDEX "KbChunk_documentId_idx" ON "KbChunk"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "KbChunk_documentId_chunkIndex_key" ON "KbChunk"("documentId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "KbDocument" ADD CONSTRAINT "KbDocument_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "KbCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KbChunk" ADD CONSTRAINT "KbChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KbDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
