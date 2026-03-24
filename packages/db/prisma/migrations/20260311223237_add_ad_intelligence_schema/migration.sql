-- CreateEnum
CREATE TYPE "ReferenceSource" AS ENUM ('META_AD_LIBRARY', 'TIKTOK', 'YOUTUBE', 'INSTAGRAM', 'MANUAL_UPLOAD', 'ENRICHMENT');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('VIDEO', 'IMAGE');

-- CreateTable
CREATE TABLE "CreativeReference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizSessionId" TEXT,
    "source" "ReferenceSource" NOT NULL,
    "sourceUrl" TEXT,
    "sourceId" TEXT,
    "mediaType" "MediaType" NOT NULL,
    "mediaUrl" TEXT,
    "adCopy" TEXT,
    "startDate" TIMESTAMP(3),
    "daysActive" INTEGER,
    "engagementMetrics" JSONB,
    "platform" TEXT NOT NULL,
    "formatClassification" TEXT,
    "formatCorrected" TEXT,
    "structureAnalysis" TEXT,
    "advertiserName" TEXT,
    "searchQuery" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreativeReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchCache" (
    "id" TEXT NOT NULL,
    "queryHash" TEXT NOT NULL,
    "source" "ReferenceSource" NOT NULL,
    "results" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiConfiguration" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "apiKeyEnv" TEXT NOT NULL,
    "rateLimitPerHour" INTEGER NOT NULL,
    "config" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ApiConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "profileHandle" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "lastFetchedAt" TIMESTAMP(3),
    "topPosts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreativeReference_source_searchQuery_idx" ON "CreativeReference"("source", "searchQuery");

-- CreateIndex
CREATE INDEX "CreativeReference_userId_createdAt_idx" ON "CreativeReference"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CreativeReference_quizSessionId_idx" ON "CreativeReference"("quizSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SearchCache_queryHash_key" ON "SearchCache"("queryHash");

-- CreateIndex
CREATE INDEX "SearchCache_expiresAt_idx" ON "SearchCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiConfiguration_provider_key" ON "ApiConfiguration"("provider");

-- CreateIndex
CREATE INDEX "CompetitorProfile_userId_platform_idx" ON "CompetitorProfile"("userId", "platform");

-- AddForeignKey
ALTER TABLE "CreativeReference" ADD CONSTRAINT "CreativeReference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeReference" ADD CONSTRAINT "CreativeReference_quizSessionId_fkey" FOREIGN KEY ("quizSessionId") REFERENCES "QuizSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorProfile" ADD CONSTRAINT "CompetitorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
