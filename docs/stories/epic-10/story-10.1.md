# User Story: Database Schema — Campanhas e One-Click Payment

**ID:** 10.1
**Epic:** 10 - Promoções & Upsell One-Click
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Epic 1 (Foundation), Epic 9 (Assinaturas Recorrentes)

---

## Statement

As a developer,
I want the database schema for promotional campaigns, delivery tracking, and one-click payment support,
so that all promo data can be stored and queried for segmentation, delivery, and conversion tracking.

---

## Context

O Epic 10 requer 2 novos modelos Prisma (`PromoCampaign` e `PromoDelivery`) para gerenciar campanhas promocionais segmentadas e rastrear a entrega de popups/upsell aos usuários. O `PromoCampaign` define a oferta, filtros de segmentação e ciclo de vida (DRAFT → ACTIVE → PAUSED → ENDED). O `PromoDelivery` rastreia cada entrega individual com eventos (viewed, clicked, converted, dismissed) e garante unicidade por campanha+usuário. Além disso, o `TransactionType` enum recebe o valor `promo_purchase` para registrar compras originadas de campanhas. Três novas configurações são adicionadas ao `PricingConfig`: `SUBSCRIPTIONS_ENABLED`, `UPSELL_ENABLED` e `UPSELL_LOW_CREDITS_THRESHOLD`.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Migration Prisma cria enum `OfferType` com valores: `CREDIT_PACKAGE`, `SUBSCRIPTION_PLAN`, `CUSTOM` | TODO |
| 2 | Migration Prisma cria enum `CampaignStatus` com valores: `DRAFT`, `ACTIVE`, `PAUSED`, `ENDED` | TODO |
| 3 | Migration Prisma cria tabela `promo_campaigns` com: `id` (String, cuid), `name` (String), `title` (String), `message` (String), `offer_type` (enum OfferType), `offer_id` (String, nullable), `discount_percent` (Int, nullable, 0-100), `filters` (Json — critérios de segmentação), `status` (enum CampaignStatus, default DRAFT), `starts_at` (DateTime, nullable), `ends_at` (DateTime, nullable), `created_at`, `updated_at` | TODO |
| 4 | Migration Prisma cria tabela `promo_deliveries` com: `id` (String, cuid), `campaign_id` (String, FK → promo_campaigns), `user_id` (String, FK → users), `viewed_at` (DateTime, nullable), `clicked_at` (DateTime, nullable), `converted_at` (DateTime, nullable), `dismissed_at` (DateTime, nullable). Constraint unique composto: `(campaign_id, user_id)` | TODO |
| 5 | Enum `TransactionType` é estendido com o valor `promo_purchase` | TODO |
| 6 | Relações Prisma: `promoCampaign.deliveries` (1:N), `promoDelivery.campaign`, `promoDelivery.user`, `user.promoDeliveries` | TODO |
| 7 | Seed de `PricingConfig` adiciona: `SUBSCRIPTIONS_ENABLED` (Boolean, default: false), `UPSELL_ENABLED` (Boolean, default: false), `UPSELL_LOW_CREDITS_THRESHOLD` (Int, default: 50) | TODO |
| 8 | Índices compostos para queries de segmentação performáticas: `(status, starts_at, ends_at)` em `promo_campaigns`, `(campaign_id, user_id)` em `promo_deliveries` | TODO |

---

## Technical Notes

- **Schema:** `packages/db/prisma/schema.prisma`
- **Enums novos:** `OfferType` (CREDIT_PACKAGE, SUBSCRIPTION_PLAN, CUSTOM), `CampaignStatus` (DRAFT, ACTIVE, PAUSED, ENDED)
- **Enum estendido:** `TransactionType` — adicionar `promo_purchase`
- **Seed:** `packages/db/prisma/seed.ts` — PricingConfig seeds para SUBSCRIPTIONS_ENABLED, UPSELL_ENABLED, UPSELL_LOW_CREDITS_THRESHOLD
- **Migration:** `prisma migrate dev --name add_promo_campaigns`
- **NFR12:** Índices compostos para queries de segmentação performáticas
- **Referência:** PRD Addendum v11.0 — Epic 10, Data Models

---

## Tasks / Subtasks

- [ ] Adicionar enums `OfferType` e `CampaignStatus` ao schema Prisma
- [ ] Adicionar `promo_purchase` ao enum `TransactionType`
- [ ] Criar modelo `PromoCampaign` com todos os campos e relações
- [ ] Criar modelo `PromoDelivery` com unique constraint `(campaignId, userId)`
- [ ] Adicionar relações em `User` para `promoDeliveries`
- [ ] Criar índices compostos para performance de queries
- [ ] Adicionar seeds de PricingConfig (SUBSCRIPTIONS_ENABLED, UPSELL_ENABLED, UPSELL_LOW_CREDITS_THRESHOLD)
- [ ] Executar migration e verificar schema gerado
- [ ] Rodar seed e verificar dados inseridos

---

## Definition of Done

- [ ] Migration executada sem erros
- [ ] Todos os modelos e enums criados conforme PRD
- [ ] Unique constraint `(campaignId, userId)` em `promo_deliveries` validado
- [ ] Seeds de PricingConfig inseridos corretamente
- [ ] Índices compostos criados e verificados
- [ ] `prisma generate` gera tipos TypeScript corretos
- [ ] Testes de integração do schema passam

---

## Dependencies

- Epic 1 (Foundation) — banco e Prisma configurados, modelo User e PricingConfig existem
- Epic 9 (Story 9.1) — enum `TransactionType` já inclui `subscription_renewal` (este schema adiciona `promo_purchase`)
