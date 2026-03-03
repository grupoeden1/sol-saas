/*
  Warnings:

  - A unique constraint covering the columns `[quizSessionId]` on the table `Conversation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Path1" AS ENUM ('AD', 'ORGANIC');

-- CreateEnum
CREATE TYPE "Path2" AS ENUM ('MODELED', 'FROM_SCRATCH');

-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "QuizSection" AS ENUM ('INITIAL', 'AD_CREATIVE', 'ORGANIC_VIDEO', 'MODELED_VIDEO', 'FROM_SCRATCH_VIDEO');

-- CreateEnum
CREATE TYPE "AnswerType" AS ENUM ('TEXT', 'SINGLE_SELECT', 'MULTI_SELECT', 'UPLOAD');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "quizSessionId" TEXT;

-- CreateTable
CREATE TABLE "OnboardingProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "onboardingProfileId" TEXT NOT NULL,
    "path1" "Path1",
    "path2" "Path2",
    "status" "QuizStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "QuizSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAnswer" (
    "id" TEXT NOT NULL,
    "quizSessionId" TEXT NOT NULL,
    "section" "QuizSection" NOT NULL,
    "questionKey" TEXT NOT NULL,
    "answerType" "AnswerType" NOT NULL,
    "answerValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAnalysis" (
    "id" TEXT NOT NULL,
    "quizSessionId" TEXT NOT NULL,
    "quizAnswerId" TEXT NOT NULL,
    "transcription" TEXT,
    "frameDescriptions" TEXT,
    "structureAnalysis" TEXT,
    "fullDescription" TEXT,
    "processingStatus" "VideoStatus" NOT NULL DEFAULT 'QUEUED',
    "processingTimeMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnboardingProfile_userId_idx" ON "OnboardingProfile"("userId");

-- CreateIndex
CREATE INDEX "QuizSession_userId_idx" ON "QuizSession"("userId");

-- CreateIndex
CREATE INDEX "QuizSession_onboardingProfileId_idx" ON "QuizSession"("onboardingProfileId");

-- CreateIndex
CREATE INDEX "QuizAnswer_quizSessionId_idx" ON "QuizAnswer"("quizSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAnswer_quizSessionId_questionKey_key" ON "QuizAnswer"("quizSessionId", "questionKey");

-- CreateIndex
CREATE UNIQUE INDEX "VideoAnalysis_quizSessionId_key" ON "VideoAnalysis"("quizSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoAnalysis_quizAnswerId_key" ON "VideoAnalysis"("quizAnswerId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_quizSessionId_key" ON "Conversation"("quizSessionId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_quizSessionId_fkey" FOREIGN KEY ("quizSessionId") REFERENCES "QuizSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingProfile" ADD CONSTRAINT "OnboardingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSession" ADD CONSTRAINT "QuizSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSession" ADD CONSTRAINT "QuizSession_onboardingProfileId_fkey" FOREIGN KEY ("onboardingProfileId") REFERENCES "OnboardingProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_quizSessionId_fkey" FOREIGN KEY ("quizSessionId") REFERENCES "QuizSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAnalysis" ADD CONSTRAINT "VideoAnalysis_quizSessionId_fkey" FOREIGN KEY ("quizSessionId") REFERENCES "QuizSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAnalysis" ADD CONSTRAINT "VideoAnalysis_quizAnswerId_fkey" FOREIGN KEY ("quizAnswerId") REFERENCES "QuizAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
