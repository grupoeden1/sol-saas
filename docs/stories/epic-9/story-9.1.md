# User Story: Database Schema — Assinaturas e Produtos Stripe

**ID:** 9.1
**Epic:** 9 - Assinaturas Recorrentes
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Epic 1 (Foundation)

---

## Statement

As a developer,
I want the database schema for subscription plans, user subscriptions and Stripe product records,
so that all recurring billing data can be stored and managed.

---

## Context

O Epic 9 (Assinaturas Recorrentes) requer 3 novos modelos Prisma e alterações em tabelas existentes. O `SubscriptionPlan` armazena os planos disponíveis com referência ao Stripe Product/Price. O `UserSubscription` vincula um usuário a uma assinatura Stripe ativa (constraint unique por user — apenas 1 assinatura ativa por vez). O `StripeProductRecord` mantém histórico de Products/Prices provisionados no Stripe, necessário porque Prices são imutáveis no Stripe (alteração de preço cria novo Price e arquiva o anterior). O campo `stripeCustomerId` é adicionado ao User para vincular ao Stripe Customer. O enum `TransactionType` ganha o valor `subscription_renewal` para rastrear créditos de renovação. Seeds incluem 3 planos iniciais inativos (active: false) para configuração posterior pelo admin.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Migration Prisma cria tabela `subscription_plans` com: `id` (String, cuid), `name` (String), `credits_monthly` (Int), `price_in_cents` (Int), `stripe_product_id` (String?, unique), `stripe_price_id` (String?, unique), `active` (Boolean, default: false), `sort_order` (Int, default: 0), `created_at`, `updated_at` | TODO |
| 2 | Migration cria tabela `user_subscriptions` com: `id` (String, cuid), `user_id` (String, FK → users, unique — 1 assinatura ativa por user), `plan_id` (String, FK → subscription_plans), `stripe_subscription_id` (String, unique), `stripe_customer_id` (String), `status` (Enum: ACTIVE \| CANCELED \| PAST_DUE \| PAUSED), `current_period_start` (DateTime), `current_period_end` (DateTime), `cancel_at_period_end` (Boolean, default: false), `created_at`, `updated_at` | TODO |
| 3 | Migration cria tabela `stripe_product_records` com: `id` (String, cuid), `plan_id` (String, FK → subscription_plans), `stripe_product_id` (String), `stripe_price_id` (String, unique), `price_in_cents` (Int), `status` (Enum: ACTIVE \| ARCHIVED), `created_at` | TODO |
| 4 | Campo `stripe_customer_id` (String?, unique) adicionado à tabela `users` | TODO |
| 5 | Enum `TransactionType` atualizado com valor `subscription_renewal` | TODO |
| 6 | Relações: `user.subscription` (1:1), `user.stripeCustomerId`, `subscriptionPlan.subscriptions` (1:N), `subscriptionPlan.stripeProductRecords` (1:N), `userSubscription.plan` (N:1), `userSubscription.user` (N:1) | TODO |
| 7 | Seed cria 3 planos iniciais (active: false): Basico (200 creditos, R$49.90 / 4990 centavos, sortOrder: 1), Profissional (600 creditos, R$119.90 / 11990 centavos, sortOrder: 2), Ilimitado (1500 creditos, R$249.90 / 24990 centavos, sortOrder: 3) | TODO |
| 8 | Indices: `user_subscriptions.user_id` (unique), `user_subscriptions.stripe_subscription_id` (unique), `subscription_plans.stripe_product_id` (unique), `subscription_plans.stripe_price_id` (unique), `stripe_product_records.stripe_price_id` (unique) | TODO |

---

## Technical Notes

- **Schema:** `packages/db/prisma/schema.prisma`
- **Enums novos:** `SubscriptionStatus` (ACTIVE, CANCELED, PAST_DUE, PAUSED), `StripeRecordStatus` (ACTIVE, ARCHIVED)
- **Enum atualizado:** `TransactionType` — adicionar `subscription_renewal`
- **Seed:** `packages/db/prisma/seed.ts` — 3 planos iniciais com active: false
- **Migration:** `prisma migrate dev --name add_subscriptions`
- **Referencia:** PRD Addendum v11.0 — Epic 9, Data Models

---

## Tasks / Subtasks

- [ ] Adicionar enums `SubscriptionStatus` e `StripeRecordStatus` ao schema Prisma
- [ ] Adicionar `subscription_renewal` ao enum `TransactionType`
- [ ] Criar modelo `SubscriptionPlan` no schema Prisma
- [ ] Criar modelo `UserSubscription` no schema Prisma
- [ ] Criar modelo `StripeProductRecord` no schema Prisma
- [ ] Adicionar campo `stripeCustomerId` ao modelo User
- [ ] Definir relacoes entre modelos
- [ ] Criar indices compostos e unique constraints
- [ ] Executar `prisma migrate dev --name add_subscriptions`
- [ ] Adicionar seeds dos 3 planos iniciais
- [ ] Validar migration e seeds com `prisma db seed`

---

## Definition of Done

- [ ] Migration executa sem erros em banco limpo
- [ ] Todos os 3 modelos criados com campos e tipos corretos
- [ ] Campo `stripeCustomerId` adicionado ao User
- [ ] Enum `TransactionType` inclui `subscription_renewal`
- [ ] Seeds criam 3 planos com valores corretos e active: false
- [ ] Relacoes e indices configurados corretamente
- [ ] `prisma generate` roda sem erros
- [ ] Testes de integridade do schema passam

---

## Dependencies

- Epic 1 (Foundation) — banco e Prisma configurados
