-- AlterTable
ALTER TABLE "CreditTransaction" ADD COLUMN     "attachmentTokens" INTEGER,
ADD COLUMN     "attachmentTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "hasAttachments" BOOLEAN NOT NULL DEFAULT false;
