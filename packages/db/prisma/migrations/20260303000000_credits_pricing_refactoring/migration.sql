-- Story P.1: Credits Pricing Refactoring
-- Migra de centavos/câmbio para créditos por tokens

-- ─── 1. User: balanceCents → credits ────────────────────────────────────────

ALTER TABLE "User" RENAME COLUMN "balanceCents" TO "credits";

-- Conversão de dados existentes: cada 29.9 centavos = 1 crédito
-- (baseado no Starter: 2990 centavos = 100 créditos → 2990/100 = 29.9)
-- DISCUTIR TAXA DE CONVERSÃO COM PO ANTES DE RODAR EM PRODUÇÃO.
UPDATE "User" SET "credits" = FLOOR("credits" / 29.9) WHERE "credits" > 0;

-- ─── 2. CreditTransaction: remover colunas legado ──────────────────────────

ALTER TABLE "CreditTransaction" DROP COLUMN IF EXISTS "exchangeRate";
ALTER TABLE "CreditTransaction" DROP COLUMN IF EXISTS "grossAmountCents";
ALTER TABLE "CreditTransaction" DROP COLUMN IF EXISTS "costUsd";
ALTER TABLE "CreditTransaction" DROP COLUMN IF EXISTS "maxOutputTokens";

-- ─── 3. CreditTransaction: adicionar snapshot de config ─────────────────────

ALTER TABLE "CreditTransaction" ADD COLUMN "creditsPerMInput" INT;
ALTER TABLE "CreditTransaction" ADD COLUMN "creditsPerMOutput" INT;

-- ─── 4. Criar tabela PricingConfig ──────────────────────────────────────────

CREATE TABLE "PricingConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" INT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PricingConfig_key_key" ON "PricingConfig"("key");

-- ─── 5. Criar tabela CreditPackage ──────────────────────────────────────────

CREATE TABLE "CreditPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INT NOT NULL,
    "priceBrl" INT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditPackage_pkey" PRIMARY KEY ("id")
);

-- ─── 6. Remover tabela ExchangeRate ─────────────────────────────────────────

DROP TABLE IF EXISTS "ExchangeRate";

-- ─── 7. Seed: PricingConfig defaults ────────────────────────────────────────

INSERT INTO "PricingConfig" ("id", "key", "value", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'CREDITS_PER_M_INPUT',  500,  NOW(), NOW()),
  (gen_random_uuid()::text, 'CREDITS_PER_M_OUTPUT', 2000, NOW(), NOW()),
  (gen_random_uuid()::text, 'MAX_OUTPUT_TOKENS',    8192, NOW(), NOW());

-- ─── 8. Seed: CreditPackage defaults ────────────────────────────────────────

INSERT INTO "CreditPackage" ("id", "name", "credits", "priceBrl", "description", "active", "sortOrder", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'Starter', 100,  2990,  '~30 scripts com a IA',  true, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'Pro',     250,  6990,  '~70 scripts com a IA',  true, 1, NOW(), NOW()),
  (gen_random_uuid()::text, 'Max',     600,  14990, '~200 scripts com a IA', true, 2, NOW(), NOW());
