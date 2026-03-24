-- AlterTable
ALTER TABLE "CreditTransaction" ADD COLUMN "assemblyAiSeconds" DOUBLE PRECISION;
ALTER TABLE "CreditTransaction" ADD COLUMN "assemblyAiCredits" INTEGER;
ALTER TABLE "CreditTransaction" ADD COLUMN "embeddingTokens" INTEGER;
ALTER TABLE "CreditTransaction" ADD COLUMN "embeddingCredits" INTEGER;
