# User Story: Database Schema — Referral Program

**ID:** 11.1
**Epic:** 11 - Programa de Indicacao (Referral)
**Status:** DONE
**Agent:** @sm (draft) -> @dev (implement) -> @qa (review)
**Depends on:** Epic 1 (Foundation)

---

## Statement

As a developer,
I want the database schema for the referral program including the ReferralReward table, user referral fields, and admin configuration seeds,
so that all referral data can be stored and queried reliably.

---

## Context

O programa de indicacao requer um novo modelo `ReferralReward` para rastrear o par indicador/indicado e o status do bonus (PENDING, CREDITED, EXPIRED). Cada usuario recebe um `referralCode` unico de 8 caracteres uppercase gerado automaticamente no cadastro, e um campo opcional `referredBy` (FK para users) indicando quem o indicou. O enum `TransactionType` precisa do novo valor `referral` para registrar creditos de indicacao. Quatro chaves de configuracao em `PricingConfig` controlam o programa: `REFERRAL_ENABLED`, `REFERRAL_REFERRER_CREDITS`, `REFERRAL_REFERRED_CREDITS`, `REFERRAL_MAX_PER_USER`.

---

## Acceptance Criteria

| # | Criterio | Status |
|---|----------|--------|
| 1 | Migration Prisma cria tabela `referral_rewards` com: `id` (String, cuid), `referrer_id` (String, FK -> users) quem indicou, `referred_id` (String, FK -> users) quem foi indicado, `trigger_transaction_id` (String?, FK -> credit_transactions) a compra que disparou o bonus, `referrer_credits` (Int) creditos dados ao indicador, `referred_credits` (Int) creditos dados ao indicado, `status` (Enum: PENDING \| CREDITED \| EXPIRED), `created_at`, `updated_at` | TODO |
| 2 | Constraint unique `@@unique([referrer_id, referred_id])` garante 1 reward por par indicador/indicado | TODO |
| 3 | Campo `users.referral_code` (String, unique) adicionado — gerado automaticamente (8 caracteres uppercase alfanumericos) | TODO |
| 4 | Campo `users.referred_by` (String?, FK -> users) adicionado — nullable, indica quem indicou este usuario | TODO |
| 5 | Enum `TransactionType` recebe novo valor `referral` | TODO |
| 6 | Seed em `PricingConfig` cria 4 chaves: `REFERRAL_ENABLED` (Boolean, default: false), `REFERRAL_REFERRER_CREDITS` (Int, default: 100), `REFERRAL_REFERRED_CREDITS` (Int, default: 50), `REFERRAL_MAX_PER_USER` (Int, default: 20) | TODO |
| 7 | Relacoes: `user.referralRewardsGiven` (rewards como indicador), `user.referralRewardsReceived` (rewards como indicado), `user.referrer` (quem indicou), `user.referrals` (usuarios indicados), `referralReward.triggerTransaction` | TODO |
| 8 | Indice em `referral_rewards.status` para queries de filtragem por status | TODO |

---

## Technical Notes

- **Schema:** `packages/db/prisma/schema.prisma`
- **Enum novo:** `ReferralRewardStatus` (PENDING, CREDITED, EXPIRED)
- **Enum modificado:** `TransactionType` — adicionar `referral`
- **Seed:** `packages/db/prisma/seed.ts` — 4 chaves PricingConfig para referral
- **Migration:** `prisma migrate dev --name add_referral_program`
- **Geracao de referralCode:** usar funcao utilitaria que gera 8 chars uppercase (A-Z0-9), com retry em caso de colisao de unicidade
- **Referencia:** PRD Addendum v11.0 — Epic 11, Story 11.1

---

## Tasks / Subtasks

- [ ] Criar enum `ReferralRewardStatus` (PENDING, CREDITED, EXPIRED) no schema Prisma
- [ ] Adicionar valor `referral` ao enum `TransactionType`
- [ ] Adicionar campos `referralCode` (String, unique) e `referredBy` (String?, FK) ao modelo User
- [ ] Criar modelo `ReferralReward` com todos os campos e relacoes
- [ ] Adicionar constraint unique `@@unique([referrerId, referredId])`
- [ ] Adicionar indice em `referralRewards.status`
- [ ] Criar funcao utilitaria `generateReferralCode()` (8 chars uppercase alfanumericos)
- [ ] Atualizar seed para incluir 4 chaves PricingConfig de referral
- [ ] Rodar migration e verificar schema gerado
- [ ] Rodar `prisma generate` e verificar tipos TypeScript

---

## Definition of Done

- [ ] Migration executa sem erros em banco limpo
- [ ] Migration executa sem erros em banco com dados existentes (retrocompatibilidade)
- [ ] Todos os campos e relacoes estao corretos no schema gerado
- [ ] Seed cria as 4 chaves de PricingConfig corretamente
- [ ] Enum `TransactionType` inclui `referral`
- [ ] Funcao `generateReferralCode()` gera codigos unicos de 8 caracteres
- [ ] Tipos TypeScript gerados pelo Prisma estao acessiveis
- [ ] Testes unitarios para geracao de referralCode (formato, unicidade)

---

## Dependencies

- Epic 1 (Foundation) — banco Prisma configurado, modelo User e PricingConfig existem
- Tabela `credit_transactions` existe (FK para triggerTransactionId)
