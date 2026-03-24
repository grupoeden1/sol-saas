-- AlterTable
ALTER TABLE "VideoAnalysis" ADD COLUMN     "audioDurationSeconds" DOUBLE PRECISION,
ADD COLUMN     "framesAnalyzed" INTEGER,
ADD COLUMN     "modelUsed" TEXT,
ADD COLUMN     "totalInputTokens" INTEGER,
ADD COLUMN     "totalOutputTokens" INTEGER;
