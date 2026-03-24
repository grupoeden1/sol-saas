-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('PAID', 'ORGANIC');

-- CreateEnum
CREATE TYPE "PerformanceStatus" AS ENUM ('PRODUCED', 'PUBLISHED', 'METRICS', 'ANALYZED');

-- CreateEnum
CREATE TYPE "Classification" AS ENUM ('TERRIBLE', 'BAD', 'AVERAGE', 'GOOD', 'EXCELLENT');

-- AlterTable
ALTER TABLE "QuizSession" ADD COLUMN     "awarenessLevel" INTEGER,
ADD COLUMN     "sophisticationLevel" INTEGER;

-- CreateTable
CREATE TABLE "ScriptPerformance" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "status" "PerformanceStatus" NOT NULL DEFAULT 'PRODUCED',
    "niche" TEXT NOT NULL,
    "modulesUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "awarenessLevel" INTEGER NOT NULL,
    "sophisticationLevel" INTEGER NOT NULL,
    "classification" "Classification",
    "executionScore" INTEGER,
    "executionAnalysis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScriptPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceMetrics" (
    "id" TEXT NOT NULL,
    "scriptPerformanceId" TEXT NOT NULL,
    "snapshotDay" INTEGER NOT NULL,
    "impressions" INTEGER,
    "ctr" DOUBLE PRECISION,
    "cpc" DOUBLE PRECISION,
    "cpm" DOUBLE PRECISION,
    "cpa" DOUBLE PRECISION,
    "roas" DOUBLE PRECISION,
    "hookRate" DOUBLE PRECISION,
    "retention" DOUBLE PRECISION,
    "views" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "saves" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionAnalysis" (
    "id" TEXT NOT NULL,
    "scriptPerformanceId" TEXT NOT NULL,
    "videoUrl" TEXT,
    "originalScript" TEXT NOT NULL,
    "comparisonResult" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "improvementSuggestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceThreshold" (
    "id" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "metricKey" TEXT NOT NULL,
    "terribleMax" DOUBLE PRECISION NOT NULL,
    "badMax" DOUBLE PRECISION NOT NULL,
    "averageMax" DOUBLE PRECISION NOT NULL,
    "goodMax" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "PerformanceThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScriptPerformance_conversationId_key" ON "ScriptPerformance"("conversationId");

-- CreateIndex
CREATE INDEX "ScriptPerformance_niche_classification_idx" ON "ScriptPerformance"("niche", "classification");

-- CreateIndex
CREATE INDEX "ScriptPerformance_contentType_createdAt_idx" ON "ScriptPerformance"("contentType", "createdAt");

-- CreateIndex
CREATE INDEX "ScriptPerformance_awarenessLevel_sophisticationLevel_idx" ON "ScriptPerformance"("awarenessLevel", "sophisticationLevel");

-- CreateIndex
CREATE INDEX "ScriptPerformance_userId_idx" ON "ScriptPerformance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceMetrics_scriptPerformanceId_snapshotDay_key" ON "PerformanceMetrics"("scriptPerformanceId", "snapshotDay");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionAnalysis_scriptPerformanceId_key" ON "ExecutionAnalysis"("scriptPerformanceId");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceThreshold_contentType_metricKey_key" ON "PerformanceThreshold"("contentType", "metricKey");

-- AddForeignKey
ALTER TABLE "ScriptPerformance" ADD CONSTRAINT "ScriptPerformance_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptPerformance" ADD CONSTRAINT "ScriptPerformance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceMetrics" ADD CONSTRAINT "PerformanceMetrics_scriptPerformanceId_fkey" FOREIGN KEY ("scriptPerformanceId") REFERENCES "ScriptPerformance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionAnalysis" ADD CONSTRAINT "ExecutionAnalysis_scriptPerformanceId_fkey" FOREIGN KEY ("scriptPerformanceId") REFERENCES "ScriptPerformance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
