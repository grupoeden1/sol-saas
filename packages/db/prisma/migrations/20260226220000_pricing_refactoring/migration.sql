-- Story 3.6: Refatoração do Sistema de Precificação
-- Migra de "1 crédito = 1 mensagem" para "saldo em centavos com custo variável por token"

-- 1. Drop old constraint (Story 3.1 — credits >= 0 não se aplica mais)
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "user_credits_non_negative";

-- 2. Rename User.credits → User.balanceCents (preserva dados existentes)
ALTER TABLE "User" RENAME COLUMN "credits" TO "balanceCents";

-- 3. Add User.minBalanceCents (limite de saldo negativo, default -R$2,00)
ALTER TABLE "User" ADD COLUMN "minBalanceCents" INTEGER NOT NULL DEFAULT -200;

-- 4. Add new constraint: saldo não pode ficar abaixo do limite mínimo
ALTER TABLE "User" ADD CONSTRAINT "user_balance_above_min" CHECK ("balanceCents" >= "minBalanceCents");

-- 5. Add audit fields to CreditTransaction
ALTER TABLE "CreditTransaction" ADD COLUMN "exchangeRate" DECIMAL;
ALTER TABLE "CreditTransaction" ADD COLUMN "inputTokens" INTEGER;
ALTER TABLE "CreditTransaction" ADD COLUMN "outputTokens" INTEGER;
ALTER TABLE "CreditTransaction" ADD COLUMN "modelUsed" TEXT;
ALTER TABLE "CreditTransaction" ADD COLUMN "costUsd" DECIMAL;

-- 6. Make CreditTransaction.description nullable (retrocompatibilidade com registros antigos)
ALTER TABLE "CreditTransaction" ALTER COLUMN "description" DROP NOT NULL;

-- 7. Create ExchangeRate table
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- 8. Unique constraint: uma cotação por par/dia
CREATE UNIQUE INDEX "ExchangeRate_currency_date_key" ON "ExchangeRate"("currency", "date");

-- 9. Data migration: valores existentes em credits (unidades de mensagem) → centavos
-- Multiplicar por 100 como fator de conversão razoável (1 crédito ≈ R$1,00)
-- Para ambiente de desenvolvimento, isso é adequado. Em produção, revisar valores.
UPDATE "User" SET "balanceCents" = "balanceCents" * 100 WHERE "balanceCents" > 0;
