# User Story: Checkout de Assinatura e Webhook de Renovação

**ID:** 9.3
**Epic:** 9 - Assinaturas Recorrentes
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 9.2 (Auto-Provisionamento de Produtos Stripe via Admin)

---

## Statement

As a student,
I want to subscribe to a monthly plan via Stripe Checkout and have my credits automatically renewed each month,
so that I always have credits available without manual purchases.

---

## Context

Esta story implementa o fluxo completo de assinatura: checkout via Stripe (`mode=subscription`), processamento de webhooks para renovacoes automaticas, e a refatoracao CRITICA do checkout existente (Story 3.3). O checkout de assinatura cria um Stripe Customer (se nao existir), salva `stripe_customer_id` no usuario, e redireciona para Stripe Checkout com `mode=subscription`. Os webhooks processam renovacoes (`invoice.payment_succeeded` → credita creditos), falhas (`invoice.payment_failed` → PAST_DUE), atualizacoes (`customer.subscription.updated`) e cancelamentos (`customer.subscription.deleted`). **IMPACTO RETROATIVO CRITICO:** O checkout de pacotes avulsos existente (Story 3.3) DEVE ser refatorado para criar Stripe Customer, salvar `stripeCustomerId`, usar `setup_future_usage: 'off_session'`, e passar `customer` na sessao — pre-requisito para one-click payments (Epic 10).

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Rota POST `/api/payments/subscribe` aceita `planId`, valida plano ativo com `stripePriceId`, cria Stripe Customer se user nao tem `stripeCustomerId`, e retorna `sessionUrl` do Stripe Checkout com `mode: 'subscription'` | TODO |
| 2 | Stripe Checkout Session criada com: `mode: 'subscription'`, `customer: stripeCustomerId`, `line_items: [{ price: stripePriceId, quantity: 1 }]`, `success_url`, `cancel_url`, `metadata: { userId, planId }` | TODO |
| 3 | Apos checkout bem-sucedido, `UserSubscription` criada com status ACTIVE, `stripeSubscriptionId`, `stripeCustomerId`, periodo atual, e `cancelAtPeriodEnd: false` | TODO |
| 4 | Webhook `invoice.payment_succeeded`: identifica assinatura, credita `creditsMonthly` do plano via `addCredits(type: 'subscription_renewal')`, atualiza `currentPeriodStart` e `currentPeriodEnd` | TODO |
| 5 | Webhook `invoice.payment_failed`: marca `UserSubscription.status` como `PAST_DUE` | TODO |
| 6 | Webhook `customer.subscription.updated`: atualiza `status`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd` da `UserSubscription` | TODO |
| 7 | Webhook `customer.subscription.deleted`: marca `UserSubscription.status` como `CANCELED` | TODO |
| 8 | **REFATORACAO CRITICA (Story 3.3):** Checkout de pacotes avulsos atualizado para: (a) criar Stripe Customer se user nao tem `stripeCustomerId`, (b) salvar `stripeCustomerId` no usuario, (c) adicionar `payment_intent_data.setup_future_usage: 'off_session'`, (d) passar `customer: stripeCustomerId` na sessao | TODO |
| 9 | Funcao utilitaria `getOrCreateStripeCustomer(userId)` criada e reutilizada tanto no checkout de assinatura quanto no checkout avulso refatorado | TODO |
| 10 | Validacao: usuario nao pode assinar se ja tem `UserSubscription` com status ACTIVE | TODO |
| 11 | Idempotencia: webhooks verificam se evento ja foi processado (prevenir creditos duplicados em retry do Stripe) | TODO |
| 12 | Verificacao de assinatura do webhook Stripe com `stripe.webhooks.constructEvent` usando webhook secret | TODO |

---

## Technical Notes

- **Stripe Checkout:** `mode: 'subscription'` (diferente do `mode: 'payment'` usado nos pacotes avulsos)
- **Stripe Customer:** Criado via `stripe.customers.create({ email, name, metadata: { userId } })`. ID salvo em `users.stripeCustomerId`
- **Funcao compartilhada:** `getOrCreateStripeCustomer(userId)` — busca user, se tem `stripeCustomerId` retorna, senao cria no Stripe e salva
- **Webhooks existentes:** O handler de webhooks existente (Story 3.3) deve ser expandido para incluir os 4 novos eventos
- **Idempotencia:** Usar `stripeSubscriptionId` + `invoice.id` como chave para prevenir processamento duplicado
- **setup_future_usage:** Parametro critico no checkout avulso refatorado — salva payment method para uso futuro (one-click, Epic 10)
- **Referencia:** PRD Addendum v11.0 — FR36, FR37, Impacto Retroativo

---

## Tasks / Subtasks

- [ ] Criar funcao utilitaria `getOrCreateStripeCustomer(userId)`
- [ ] **REFATORAR checkout avulso (Story 3.3):** adicionar Customer creation, `setup_future_usage`, `customer` param
- [ ] Criar rota POST `/api/payments/subscribe`
- [ ] Implementar criacao de Stripe Checkout Session com `mode: 'subscription'`
- [ ] Criar `UserSubscription` apos checkout bem-sucedido (via webhook `checkout.session.completed`)
- [ ] Implementar handler webhook `invoice.payment_succeeded` com `addCredits`
- [ ] Implementar handler webhook `invoice.payment_failed` com status PAST_DUE
- [ ] Implementar handler webhook `customer.subscription.updated`
- [ ] Implementar handler webhook `customer.subscription.deleted`
- [ ] Adicionar logica de idempotencia nos webhooks
- [ ] Adicionar validacao de assinatura ativa existente
- [ ] Testes unitarios para `getOrCreateStripeCustomer`
- [ ] Testes unitarios para cada webhook handler
- [ ] Testes de integracao para fluxo completo de assinatura

---

## Definition of Done

- [ ] Checkout de assinatura funciona end-to-end (selecionar plano → Stripe → creditos creditados)
- [ ] Checkout avulso refatorado cria Stripe Customer e salva payment method
- [ ] 4 webhooks processados corretamente (payment_succeeded, payment_failed, subscription.updated, subscription.deleted)
- [ ] Creditos creditados automaticamente na renovacao via `addCredits(type: 'subscription_renewal')`
- [ ] Idempotencia previne creditos duplicados
- [ ] Validacao impede assinatura duplicada
- [ ] `getOrCreateStripeCustomer` reutilizado em ambos os checkouts
- [ ] Testes unitarios e de integracao passam

---

## Dependencies

- Story 9.2 — planos com `stripePriceId` valido existem
- Story 3.3 — checkout avulso existente (sera refatorado)
