# User Story: Painel Admin — Criação e Gerenciamento de Campanhas

**ID:** 10.3
**Epic:** 10 - Promoções & Upsell One-Click
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 10.1 (Schema de Campanhas)

---

## Statement

As an admin,
I want to create, manage, and monitor promotional campaigns with user segmentation filters,
so that I can target specific user groups with relevant offers and track campaign performance.

---

## Context

O painel admin em `/admin/promos` permite ao admin gerenciar todo o ciclo de vida de campanhas promocionais. Na criação, o admin define título, mensagem, tipo de oferta (pacote de créditos, plano de assinatura ou custom), desconto opcional, e filtros de segmentação combináveis (AND). Os filtros disponíveis são: créditos restantes (range min/max), última atividade (dias sem uso) e total de mensagens (range min/max). Um preview mostra a contagem de usuários impactados antes de ativar a campanha. As campanhas seguem o ciclo DRAFT → ACTIVE → PAUSED → ENDED, com métricas em tempo real: total de entregas, visualizações, cliques, conversões, receita gerada e taxa de conversão.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Página `/admin/promos` lista todas as campanhas com: nome, status, tipo de oferta, datas, e métricas resumidas (entregas, conversões, receita) | TODO |
| 2 | Formulário de criação permite definir: `name`, `title`, `message`, `offerType` (CREDIT_PACKAGE \| SUBSCRIPTION_PLAN \| CUSTOM), `offerId` (seletor de pacote ou plano), `discountPercent` (0-100, opcional), `startsAt`, `endsAt` | TODO |
| 3 | Filtros de segmentação combináveis (AND): créditos restantes (min/max), última atividade em dias (min/max dias sem uso), total de mensagens (min/max). Todos opcionais e combináveis | TODO |
| 4 | Preview: ao definir/alterar filtros, exibe contagem de usuários que serão impactados pela campanha. API `POST /api/admin/promos/preview` retorna `{ userCount }` | TODO |
| 5 | Ciclo de vida de campanha: DRAFT → ACTIVE (pode voltar a PAUSED), PAUSED → ACTIVE (pode reativar), ACTIVE/PAUSED → ENDED (terminal). Apenas campanhas ACTIVE entregam popups | TODO |
| 6 | Métricas por campanha exibidas em dashboard: total de entregas (`deliveries`), visualizações (`views`), cliques (`clicks`), conversões (`conversions`), receita gerada (`revenue` em BRL), taxa de conversão (`rate` = conversions/views) | TODO |
| 7 | CRUD completo via API: `GET /api/admin/promos` (listar), `POST /api/admin/promos` (criar), `PUT /api/admin/promos/:id` (editar), `PATCH /api/admin/promos/:id` (alterar status) | TODO |
| 8 | Validações: `discountPercent` entre 0-100, `endsAt` deve ser posterior a `startsAt`, `offerId` válido para o `offerType` selecionado, apenas admin autenticado pode acessar | TODO |

---

## Technical Notes

- **Frontend:** `apps/web/src/app/admin/promos/page.tsx` (ou similar conforme estrutura)
- **API Routes:** `apps/api/src/routes/admin/promos.ts`
- **Preview query:** Query Prisma com filtros dinâmicos sobre `users` + `credit_transactions` + `conversations` para contar usuários impactados
- **Métricas:** Agregação sobre `promo_deliveries` por campanha: `COUNT(*)` deliveries, `COUNT(viewedAt)` views, `COUNT(clickedAt)` clicks, `COUNT(convertedAt)` conversions
- **Receita:** Somar `amount` das transactions com `type: promo_purchase` vinculadas à campanha
- **NFR12:** Usar índices compostos criados no Story 10.1 para queries performáticas
- **Referência:** PRD Addendum v11.0 — FR39

---

## Tasks / Subtasks

- [ ] Criar API `GET /api/admin/promos` com listagem e métricas resumidas
- [ ] Criar API `POST /api/admin/promos` com validação de campos e filtros
- [ ] Criar API `PUT /api/admin/promos/:id` para edição de campanhas em DRAFT
- [ ] Criar API `PATCH /api/admin/promos/:id` para transição de status (DRAFT→ACTIVE, ACTIVE→PAUSED, PAUSED→ACTIVE, →ENDED)
- [ ] Criar API `POST /api/admin/promos/preview` que retorna contagem de usuários para filtros fornecidos
- [ ] Implementar query de segmentação com filtros combináveis (créditos, atividade, mensagens)
- [ ] Implementar agregação de métricas por campanha (deliveries, views, clicks, conversions, revenue, rate)
- [ ] Criar página `/admin/promos` com listagem de campanhas
- [ ] Criar formulário de criação/edição com seletores de oferta e filtros
- [ ] Implementar preview de usuários impactados no formulário
- [ ] Criar dashboard de métricas por campanha
- [ ] Adicionar validações server-side (discount range, datas, offerId)

---

## Definition of Done

- [ ] CRUD de campanhas funciona end-to-end via admin
- [ ] Filtros de segmentação combinam corretamente com AND
- [ ] Preview mostra contagem correta de usuários impactados
- [ ] Transições de status respeitam ciclo de vida (DRAFT→ACTIVE→PAUSED→ENDED)
- [ ] Métricas por campanha calculadas e exibidas corretamente
- [ ] Validações server-side impedem dados inválidos
- [ ] Apenas admins autenticados podem acessar as rotas
- [ ] Queries de segmentação usam índices compostos (performance)
- [ ] Testes unitários e de integração passam

---

## Dependencies

- Story 10.1 — modelos PromoCampaign, PromoDelivery, enums OfferType e CampaignStatus existem
