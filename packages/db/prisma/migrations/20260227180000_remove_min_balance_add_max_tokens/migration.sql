-- Story 3.6v2: Remove minBalanceCents (gate model makes it unnecessary), add maxOutputTokens for audit

-- 1. Drop CHECK constraint that references minBalanceCents
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "user_balance_above_min";

-- 2. Remove minBalanceCents column (no longer needed — gate + WHERE >= 0 prevents negative balance)
ALTER TABLE "User" DROP COLUMN "minBalanceCents";

-- 3. Add maxOutputTokens to CreditTransaction for audit trail
ALTER TABLE "CreditTransaction" ADD COLUMN "maxOutputTokens" INTEGER;
