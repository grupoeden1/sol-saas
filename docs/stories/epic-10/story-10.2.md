# User Story: One-Click Payment Engine

**ID:** 10.2
**Epic:** 10 - Promoções & Upsell One-Click
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 10.1 (Schema), Story 9.3 (stripe_customer_id + payment method salvo)

---

## Statement

As a student with a saved payment method,
I want to purchase credits or promotional offers with a single click,
so that I can quickly top up my balance without going through the full checkout flow.

---

## Context

O One-Click Payment Engine permite que alunos com payment method salvo (via Stripe Customer criado no Epic 9) realizem compras instantâneas usando `stripe.paymentIntents.create` com `confirm: true`, `payment_method` salvo e `off_session: true`. Se o usuário não tiver payment method salvo, o sistema faz fallback para o checkout normal (Stripe Checkout Sessions). O frontend adapta o botão: "Comprar com 1 clique" quando há payment method salvo, "Comprar" quando não há. Os créditos são adicionados via `addCredits` com `type: purchase` (compra normal) ou `type: promo_purchase` (compra originada de campanha promocional).

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | API `POST /api/payments/one-click` aceita `{ packageId, campaignId? }` e cria PaymentIntent com `confirm: true`, `payment_method` (default do customer), `off_session: true`, `currency: 'brl'` | TODO |
| 2 | Antes de criar PaymentIntent, a API verifica se o user tem `stripe_customer_id` e pelo menos 1 payment method salvo via `stripe.customers.listPaymentMethods`. Se não tiver, retorna `{ fallback: true, checkoutUrl }` com URL de checkout normal | TODO |
| 3 | PaymentIntent bem-sucedido (`status === 'succeeded'`) executa `addCredits` com `type: 'purchase'` (compra avulsa) ou `type: 'promo_purchase'` (se `campaignId` fornecido) e retorna `{ success: true, credits, newBalance }` | TODO |
| 4 | Se PaymentIntent falhar (cartão recusado, autenticação necessária), retorna erro apropriado e fallback para checkout normal | TODO |
| 5 | API usa idempotência do Stripe (`idempotencyKey`) para prevenir cobranças duplicadas (NFR10) | TODO |
| 6 | Frontend exibe "Comprar com 1 clique" quando user tem payment method salvo, "Comprar" quando não tem. Verificação via API `GET /api/payments/has-payment-method` ou campo no user session | TODO |
| 7 | Se `campaignId` fornecido e campanha tem `discountPercent`, o valor cobrado é calculado com desconto aplicado | TODO |
| 8 | Todas as operações são protegidas por autenticação e rate limiting | TODO |

---

## Technical Notes

- **API Route:** `apps/api/src/routes/payments/one-click.ts` (ou similar conforme estrutura)
- **Stripe APIs:** `stripe.customers.listPaymentMethods`, `stripe.paymentIntents.create`
- **PaymentIntent params:** `{ amount, currency: 'brl', customer, payment_method, confirm: true, off_session: true }`
- **Fallback:** Se falhar ou sem payment method, redirecionar para `POST /api/payments/checkout` existente
- **Idempotência:** Usar `stripe.paymentIntents.create({...}, { idempotencyKey })` com key baseada em `userId + packageId + timestamp`
- **Referência:** PRD Addendum v11.0 — FR40, NFR10

---

## Tasks / Subtasks

- [ ] Criar helper para verificar payment methods salvos do customer
- [ ] Implementar `POST /api/payments/one-click` com PaymentIntent confirm:true, off_session:true
- [ ] Implementar lógica de fallback para checkout normal quando sem payment method
- [ ] Implementar cálculo de desconto quando `campaignId` + `discountPercent` fornecidos
- [ ] Chamar `addCredits` com type correto (`purchase` vs `promo_purchase`)
- [ ] Adicionar idempotencyKey em todas as chamadas Stripe
- [ ] Criar endpoint ou campo de sessão para informar se user tem payment method salvo
- [ ] Implementar componente frontend com botão adaptativo ("Comprar com 1 clique" / "Comprar")
- [ ] Adicionar rate limiting no endpoint
- [ ] Tratar erros Stripe (card_declined, authentication_required, etc.)

---

## Definition of Done

- [ ] Compra com 1 clique funciona end-to-end para user com payment method salvo
- [ ] Fallback para checkout normal funciona para user sem payment method
- [ ] Créditos creditados corretamente com type `purchase` ou `promo_purchase`
- [ ] Desconto de campanha aplicado corretamente no valor cobrado
- [ ] Idempotência previne cobranças duplicadas
- [ ] Frontend exibe botão correto baseado em payment method salvo
- [ ] Erros Stripe tratados com mensagens user-friendly
- [ ] Rate limiting ativo no endpoint
- [ ] Testes unitários e de integração passam

---

## Dependencies

- Story 10.1 — modelos PromoCampaign, PromoDelivery e enum `promo_purchase` existem
- Story 9.3 — `stripe_customer_id` e payment method salvo via `setup_future_usage: 'off_session'` (pré-requisito para one-click)
