# Story 3.4 — Stripe Webhook: Processamento de Pagamentos

**Epic:** 3 — Credits & Payments
**Status:** Ready
**Created by:** SM (story-development-cycle workflow)
**Story ID:** sol-3.4

---

## User Story

As a product owner,
I want successful payments to automatically add credits to the student's account,
so that the purchase flow is seamless and reliable.

---

## Acceptance Criteria

1. `POST /api/webhooks/stripe` valida assinatura do webhook com `STRIPE_WEBHOOK_SECRET`
2. Evento `checkout.session.completed` dispara `addCredits(userId, amount, stripePaymentId)` em transação atômica
3. Idempotência garantida — `stripe_payment_id` tem constraint unique, duplo disparo não duplica créditos
4. Endpoint retorna `200` rapidamente (processamento síncrono, sem filas no MVP)
5. Falhas logadas com `stripe_payment_id` para reprocessamento manual se necessário

---

## Scope

**IN:**
- `POST /api/webhooks/stripe` — recebe e processa eventos Stripe
- Validação de assinatura HMAC via `stripe.webhooks.constructEvent`
- Handler para evento `checkout.session.completed`
- Chamada a `addCredits(userId, amount, stripePaymentId)` (já implementado em Story 3.1)
- Tratamento de webhook duplicado (Prisma unique constraint `P2002` → ignora silenciosamente)
- Logging de falhas com `stripePaymentId` para reprocessamento manual

**OUT:**
- Filas assíncronas (Kafka, BullMQ, etc.) — não no MVP
- Outros tipos de evento Stripe (refunds, disputes, etc.)
- Notificações por email pós-pagamento

---

## Dependencies

| Dependency | Story | Status |
|------------|-------|--------|
| `addCredits(userId, amount, stripePaymentId)` | 3.1 | ✅ Done |
| `CreditTransaction.stripePaymentId @unique` | 3.1 | ✅ Done |
| Checkout session com metadata (`userId`, `creditsAmount`) | 3.3 | ✅ Done |
| `getStripeClient()` lazy init | 3.3 | ✅ Done |

---

## Technical Notes

### Webhook Signature Validation
```typescript
// Raw body MUST be read as text — não usar req.json()
const rawBody = await req.text();
const signature = req.headers.get('stripe-signature');
const event = getStripeClient().webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
```

### Metadata do Checkout (Story 3.3)
```typescript
// Enviado ao criar a sessão Stripe
metadata: {
  userId: user.id,       // string
  packageId: pkg.id,     // string
  creditsAmount: String(pkg.credits),  // string (parseInt no webhook)
}
```

### Idempotência
- `CreditTransaction.stripePaymentId` é `@unique` no schema Prisma
- Se Stripe disparar o mesmo evento duas vezes, a segunda tentativa lança `PrismaClientKnownRequestError` com `code === 'P2002'`
- O handler captura esse código e retorna `200` com `{ received: true, duplicate: true }`

### stripePaymentId
- `session.payment_intent` — ID da PaymentIntent criada pelo checkout (ex: `pi_3R...`)
- Pode ser `null` para pagamentos com balance (não aplicável aqui)

### Next.js App Router — Raw Body
- Next.js 14 App Router **não** faz buffer do body automaticamente para Route Handlers
- `await req.text()` funciona corretamente para obter o raw body

---

## File List

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/app/api/webhooks/stripe/route.ts` | CREATE | POST handler para webhook Stripe |
| `apps/web/.env` | UPDATE | `STRIPE_WEBHOOK_SECRET` já presente (valor placeholder) |

---

## Business Value

Fecha o loop de pagamento: sem esse webhook, créditos nunca são adicionados após a compra. O fluxo completo (Checkout → Pagamento → Créditos adicionados) só funciona com essa Story implementada.

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Webhook sem assinatura válida | `constructEvent` lança se assinatura inválida → `400` |
| Evento duplicado (Stripe retry) | Unique constraint em `stripePaymentId` → ignora silenciosamente |
| `STRIPE_WEBHOOK_SECRET` não configurado | Check explícito → `500` + log |
| `payment_intent` null | Log de erro + `400` |

---

## Definition of Done

- [ ] `POST /api/webhooks/stripe` responde `200` para webhook válido
- [ ] Assinatura inválida retorna `400`
- [ ] Créditos adicionados ao usuário após `checkout.session.completed`
- [ ] Webhook duplicado retorna `200` sem duplicar créditos
- [ ] Logs estruturados com `userId`, `credits`, `stripePaymentId`
- [ ] `STRIPE_WEBHOOK_SECRET` documentado no `.env.example`
