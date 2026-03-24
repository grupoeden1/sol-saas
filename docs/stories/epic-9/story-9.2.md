# User Story: Auto-Provisionamento de Produtos Stripe via Admin

**ID:** 9.2
**Epic:** 9 - Assinaturas Recorrentes
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 9.1 (Database Schema: Assinaturas e Produtos Stripe)

---

## Statement

As an admin,
I want to create and manage subscription plans with automatic Stripe Product and Price provisioning,
so that plans are always synchronized between the database and Stripe.

---

## Context

O admin precisa de um CRUD completo para planos de assinatura em `/admin/subscriptions`. A funcionalidade critica e o auto-provisionamento: ao criar ou editar um plano, o sistema automaticamente cria Product e Price no Stripe via API (`stripe.products.create`, `stripe.prices.create` com `recurring.interval=month`). Prices no Stripe sao imutaveis — se o admin alterar o preco de um plano, o sistema deve criar um novo Price e arquivar o anterior (tanto no Stripe via `stripe.prices.update({ active: false })` quanto no `StripeProductRecord`). O plano so fica disponivel para assinatura quando `active: true` e possui `stripeProductId` + `stripePriceId` validos.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Rota GET `/api/admin/subscriptions` retorna lista de planos com paginacao, incluindo dados do Stripe (productId, priceId) e contagem de assinantes ativos | TODO |
| 2 | Rota POST `/api/admin/subscriptions` cria plano no banco e auto-provisiona `stripe.products.create` + `stripe.prices.create` (recurring, interval: month, currency: brl). Salva `stripeProductId` e `stripePriceId` no plano. Cria registro em `StripeProductRecord` com status ACTIVE | TODO |
| 3 | Rota PUT `/api/admin/subscriptions` atualiza plano. Se `priceInCents` mudou: cria novo `stripe.prices.create`, arquiva Price anterior via `stripe.prices.update({ active: false })`, atualiza `stripePriceId` no plano, cria novo `StripeProductRecord` (ACTIVE) e marca anterior como ARCHIVED | TODO |
| 4 | Rota PATCH `/api/admin/subscriptions` alterna `active` do plano. Plano so pode ser ativado se possui `stripeProductId` e `stripePriceId` validos. Desativacao nao cancela assinaturas existentes | TODO |
| 5 | Interface admin em `/admin/subscriptions` com: listagem de planos (nome, creditos, preco, status, assinantes), formulario de criacao/edicao, toggle ativar/desativar, indicador visual de sincronizacao com Stripe | TODO |
| 6 | Validacoes: nome obrigatorio (min 3 chars), creditos > 0, preco > 0 (em centavos). Erros do Stripe sao tratados com rollback (plano nao salvo se Stripe falhar) | TODO |
| 7 | Historico de precos visivel no admin: lista de `StripeProductRecords` por plano mostrando preco, status e data | TODO |
| 8 | Todas as rotas protegidas por middleware de autenticacao admin | TODO |

---

## Technical Notes

- **Stripe APIs:** `stripe.products.create`, `stripe.products.update`, `stripe.prices.create`, `stripe.prices.update`
- **Price immutability:** Prices no Stripe nao podem ser editadas. Alteracao de preco = novo Price + arquivar anterior
- **Transacao:** Operacoes de banco + Stripe devem ser atomicas (criar no Stripe primeiro, se sucesso salvar no banco; se banco falhar, fazer cleanup no Stripe)
- **Rota base:** `/api/admin/subscriptions` — RESTful com GET (list), POST (create), PUT (update), PATCH (toggle active)
- **Componentes:** Reutilizar padrao de admin existente (tabela, formularios, modais)
- **Referencia:** PRD Addendum v11.0 — FR35, API Routes

---

## Tasks / Subtasks

- [ ] Criar service `subscriptionPlanService` com logica de CRUD + Stripe
- [ ] Implementar funcao `provisionStripeProduct` (create Product + Price)
- [ ] Implementar funcao `updateStripePrice` (create new Price + archive old)
- [ ] Criar rota GET `/api/admin/subscriptions` com listagem e contagem
- [ ] Criar rota POST `/api/admin/subscriptions` com auto-provisionamento
- [ ] Criar rota PUT `/api/admin/subscriptions` com logica de price immutability
- [ ] Criar rota PATCH `/api/admin/subscriptions` para toggle active
- [ ] Criar pagina admin `/admin/subscriptions` com listagem
- [ ] Criar formulario de criacao/edicao de plano
- [ ] Implementar toggle ativar/desativar com validacao
- [ ] Adicionar historico de precos (StripeProductRecords) na UI
- [ ] Testes unitarios para service de provisionamento
- [ ] Testes de integracao para rotas API

---

## Definition of Done

- [ ] CRUD completo funciona via API e interface admin
- [ ] Criar plano provisiona Product + Price no Stripe automaticamente
- [ ] Alterar preco cria novo Price e arquiva anterior (banco e Stripe)
- [ ] Plano so ativa com stripeProductId e stripePriceId validos
- [ ] Rollback funciona se operacao Stripe falhar
- [ ] Historico de precos visivel no admin
- [ ] Todas as rotas protegidas por autenticacao admin
- [ ] Testes unitarios e de integracao passam

---

## Dependencies

- Story 9.1 — modelos SubscriptionPlan, StripeProductRecord e enums existem
