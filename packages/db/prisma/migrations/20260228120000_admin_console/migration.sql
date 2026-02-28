-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'adjustment';

-- AlterTable
ALTER TABLE "CreditTransaction" ADD COLUMN "grossAmountCents" INTEGER,
                                ADD COLUMN "adminEmail" TEXT;

-- CreateIndex
CREATE INDEX "CreditTransaction_type_idx" ON "CreditTransaction"("type");

-- Backfill: approximate grossAmountCents for existing purchase transactions
-- Formula: gross = amount / CREDIT_PERCENTAGE (default 0.40)
UPDATE "CreditTransaction"
SET "grossAmountCents" = ROUND("amount"::numeric / 0.40)
WHERE "type" = 'purchase'
  AND "grossAmountCents" IS NULL;
