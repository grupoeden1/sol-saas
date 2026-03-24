-- CreateEnum
CREATE TYPE "ReferenceSourceType" AS ENUM ('API_SEARCH', 'LINK_ANALYSIS', 'MANUAL_UPLOAD', 'NONE');

-- AlterTable
ALTER TABLE "QuizSession" ADD COLUMN     "referenceSource" "ReferenceSourceType";
