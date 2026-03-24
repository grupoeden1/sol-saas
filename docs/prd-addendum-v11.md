# SOL PRD Addendum — Epics 9, 10 & 11

**Version:** 11.0
**Date:** 2026-03-05
**Author:** Morgan (PM)
**Depends on:** PRD v10.0 (Epics 1-8 definidos, Epics 1-3 implementados, Claude API migrado)

---

## Contexto

Este adendo define 3 novos Epics focados em **monetização avançada** e **crescimento orgânico** do SOL. Os Epics 9, 10 e 11 são independentes dos Epics 6 (Quiz), 7 (Video) e 8 (Feedback Loop) do PRD v10.0 — podem ser implementados em qualquer ordem.

**Estado atual do sistema:**
- IA: Anthropic Claude API (claude-sonnet-4-5-20250929 / claude-haiku-4-5-20251001)
- TransactionType enum: `purchase`, `consumption`, `adjustment`
- `credit_transactions` já tem campo `modules_used` (string[], nullable)
- Checkout existente: Stripe Checkout Sessions (mode=payment, sem Customer)
- Modelo de créditos: créditos por tokens, configuráveis via admin

---

## Epic 9 — Assinaturas Recorrentes

### Objetivo

Permitir que alunos assinem planos mensais com créditos automáticos, gerando MRR (Monthly Recurring Revenue) para o SOL.

### Functional Requirements

- **FR34:** O sistema deve suportar planos de assinatura mensal com quantidade fixa de créditos por mês, gerenciados via painel admin. Cada plano tem nome, créditos mensais, preço em centavos (BRL), e status ativo/inativo
- **FR35:** O admin deve poder criar/editar/ativar/desativar planos de assinatura no painel `/admin/subscriptions`. Ao criar ou editar um plano, o sistema deve auto-provisionar Product e Price no Stripe via API (`stripe.products.create`, `stripe.prices.create` com `recurring.interval=month`). Alteração de preço cria novo Price e arquiva o anterior (Prices são imutáveis no Stripe)
- **FR36:** O aluno deve poder assinar um plano via Stripe Checkout (`mode=subscription`). O checkout deve criar um Stripe Customer (se não existir), salvar `stripe_customer_id` no usuário, e usar `setup_future_usage: 'off_session'` para permitir cobranças futuras
- **FR37:** O sistema deve processar webhooks do Stripe para renovações automáticas: `invoice.payment_succeeded` credita créditos mensais via `addCredits(type: 'subscription_renewal')`, `invoice.payment_failed` marca status como `PAST_DUE`, `customer.subscription.updated` e `customer.subscription.deleted` atualizam status da assinatura
- **FR38:** O aluno deve poder gerenciar sua assinatura: cancelar (cancel_at_period_end, não imediato), reativar (se cancelamento pendente), e trocar de plano (upgrade/downgrade). Todas as operações via Stripe API

### Impacto Retroativo (CRÍTICO)

O Checkout de pacotes avulsos existente (Epic 3, Story 3.3) DEVE ser atualizado para:
1. Criar Stripe Customer se user não tem `stripe_customer_id`
2. Salvar `stripe_customer_id` no usuário
3. Adicionar `payment_intent_data.setup_future_usage: 'off_session'`
4. Passar `customer: stripeCustomerId` na sessão

Isso garante que o payment method seja salvo para uso futuro (one-click, Epic 10).

### Data Models

**SubscriptionPlan:**
- `id` (String, cuid)
- `name` (String)
- `creditsMonthly` (Int)
- `priceInCents` (Int)
- `stripeProductId` (String?, unique)
- `stripePriceId` (String?, unique)
- `active` (Boolean, default: false)
- `sortOrder` (Int, default: 0)
- `createdAt`, `updatedAt`

**UserSubscription:**
- `id` (String, cuid)
- `userId` (String, FK → users, unique — 1 assinatura ativa por user)
- `planId` (String, FK → subscription_plans)
- `stripeSubscriptionId` (String, unique)
- `stripeCustomerId` (String)
- `status` (Enum: ACTIVE | CANCELED | PAST_DUE | PAUSED)
- `currentPeriodStart` (DateTime)
- `currentPeriodEnd` (DateTime)
- `cancelAtPeriodEnd` (Boolean, default: false)
- `createdAt`, `updatedAt`

**StripeProductRecord:**
- `id` (String, cuid)
- `planId` (String, FK → subscription_plans)
- `stripeProductId` (String)
- `stripePriceId` (String, unique)
- `priceInCents` (Int)
- `status` (Enum: ACTIVE | ARCHIVED)
- `createdAt`

**Campos novos em tabelas existentes:**
- `users.stripeCustomerId` (String?, unique)

**Enum TransactionType — ADICIONAR:**
- `subscription_renewal`

### Stories

- **Story 9.1** — Database Schema: Assinaturas e Produtos Stripe
- **Story 9.2** — Auto-Provisionamento de Produtos Stripe via Admin
- **Story 9.3** — Checkout de Assinatura e Webhook de Renovação (inclui refatoração do Checkout existente)
- **Story 9.4** — Gerenciamento de Assinatura pelo Aluno

### API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET/POST/PUT/PATCH | `/api/admin/subscriptions` | CRUD planos com auto-provisionamento Stripe |
| POST | `/api/payments/subscribe` | Stripe Checkout `mode=subscription` |
| POST | `/api/subscription/cancel` | Cancelar assinatura (cancel_at_period_end) |
| POST | `/api/subscription/reactivate` | Reativar assinatura cancelada |
| POST | `/api/subscription/change-plan` | Upgrade/downgrade de plano |

---

## Epic 10 — Promoções & Upsell One-Click

### Objetivo

Permitir que o admin crie campanhas promocionais segmentadas e ofereça compras com 1 clique, elevando ticket médio e reativando usuários inativos.

### Functional Requirements

- **FR39:** O admin deve poder criar campanhas promocionais segmentadas em `/admin/promos` com filtros combináveis (AND): créditos restantes (range min/max), última atividade (dias sem uso), total de mensagens (range min/max). Preview mostra contagem de usuários impactados. Campanhas têm ciclo de vida: DRAFT → ACTIVE → PAUSED → ENDED
- **FR40:** O sistema deve suportar compra com 1 clique via `stripe.paymentIntents.create` com `confirm: true`, `payment_method` salvo e `off_session: true`. Se falhar (sem payment method salvo), fallback para checkout normal. Frontend: "Comprar com 1 clique" quando tem payment method, "Comprar" quando não tem
- **FR41:** O sistema deve entregar popups/upsell ao aluno quando campanhas ativas se aplicam ao seu perfil. Regras: 1 popup por campanha por usuário (unique constraint), nunca durante streaming de chat ou geração de roteiro, máximo 1 por sessão. Tracking de eventos: viewed, clicked, converted, dismissed
- **FR42:** O sistema deve exibir upsell automático inline (banner, não popup) quando `credits <= UPSELL_LOW_CREDITS_THRESHOLD` (configurável via admin)

### Data Models

**PromoCampaign:**
- `id` (String, cuid)
- `name` (String)
- `title` (String) — título exibido no popup
- `message` (String) — mensagem do popup
- `offerType` (Enum: CREDIT_PACKAGE | SUBSCRIPTION_PLAN | CUSTOM)
- `offerId` (String?) — ID do pacote ou plano oferecido
- `discountPercent` (Int?, 0-100)
- `filters` (Json) — critérios de segmentação
- `status` (Enum: DRAFT | ACTIVE | PAUSED | ENDED)
- `startsAt` (DateTime?)
- `endsAt` (DateTime?)
- `createdAt`, `updatedAt`

**PromoDelivery:**
- `id` (String, cuid)
- `campaignId` (String, FK → promo_campaigns)
- `userId` (String, FK → users)
- `viewedAt` (DateTime?)
- `clickedAt` (DateTime?)
- `convertedAt` (DateTime?)
- `dismissedAt` (DateTime?)
- `@@unique([campaignId, userId])` — 1 entrega por campanha por user

**Enum TransactionType — ADICIONAR:**
- `promo_purchase`

**Admin Settings novos:**
- `SUBSCRIPTIONS_ENABLED` (Boolean, default: false)
- `UPSELL_ENABLED` (Boolean, default: false)
- `UPSELL_LOW_CREDITS_THRESHOLD` (Int, default: 50)

### Stories

- **Story 10.1** — Database Schema: Campanhas e One-Click Payment
- **Story 10.2** — One-Click Payment Engine (depende de 9.3 — stripe_customer_id + payment method)
- **Story 10.3** — Painel Admin: Criação e Gerenciamento de Campanhas
- **Story 10.4** — Engine de Entrega de Popups e Upsell Automático

### API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/payments/one-click` | PaymentIntent com confirm:true, off_session:true |
| GET/POST/PUT/PATCH | `/api/admin/promos` | CRUD campanhas segmentadas |
| GET | `/api/promos/active` | Campanha aplicável ao user logado |
| POST | `/api/promos/track` | Tracking de eventos de popup (viewed/clicked/converted/dismissed) |

---

## Epic 11 — Programa de Indicação (Referral)

### Objetivo

Aquisição orgânica de novos alunos via programa de indicação com bônus em créditos para indicador e indicado.

### Functional Requirements

- **FR43:** Todo novo usuário deve receber um `referral_code` único (8 caracteres uppercase) gerado automaticamente no cadastro. O código é exibido no dashboard do aluno
- **FR44:** O fluxo de cadastro deve aceitar código de referral via URL (`/?ref=CODIGO` → `/register?ref=CODIGO`). O código é persistido em cookie httpOnly por 30 dias. Validação: código existe, programa ativo, indicador não atingiu limite. Auto-indicação proibida silenciosamente. Cadastro sem referral continua funcionando normalmente
- **FR45:** O bônus de referral é atribuído na **primeira compra** do indicado (não no cadastro). Ambos (indicador e indicado) recebem créditos via `addCredits(type: 'referral')`. Bônus atribuído apenas 1 vez — segunda compra não re-ativa. Se programa desativado entre cadastro e compra → reward status = EXPIRED. Rewards pendentes usam valores **atuais** do admin (não snapshot do momento do cadastro)
- **FR46:** O aluno deve ter uma seção "Indique e Ganhe" no dashboard com: código + link compartilhável + botão copiar, Web Share API (mobile) + fallback copiar (desktop), contador de indicações + créditos ganhos, lista de indicações com email mascarado e status. Visível apenas se `REFERRAL_ENABLED = true`
- **FR47:** O admin deve ter controle total do programa de referral em `/admin/referral`: toggle on/off (`REFERRAL_ENABLED`), campos editáveis (créditos indicador, créditos indicado, limite por usuário), métricas (total indicações, créditos distribuídos, top indicadores, taxa de conversão), lista de indicações com filtro por status

### Data Models

**ReferralReward:**
- `id` (String, cuid)
- `referrerId` (String, FK → users) — quem indicou
- `referredId` (String, FK → users) — quem foi indicado
- `triggerTransactionId` (String?, FK → credit_transactions) — a compra que disparou o bônus
- `referrerCredits` (Int) — créditos dados ao indicador
- `referredCredits` (Int) — créditos dados ao indicado
- `status` (Enum: PENDING | CREDITED | EXPIRED)
- `createdAt`, `updatedAt`
- `@@unique([referrerId, referredId])` — 1 reward por par

**Campos novos em tabelas existentes:**
- `users.referralCode` (String, unique) — gerado automaticamente
- `users.referredBy` (String?, FK → users) — quem indicou este user

**Enum TransactionType — ADICIONAR:**
- `referral`

**Admin Settings novos:**
- `REFERRAL_ENABLED` (Boolean, default: false)
- `REFERRAL_REFERRER_CREDITS` (Int, default: 100)
- `REFERRAL_REFERRED_CREDITS` (Int, default: 50)
- `REFERRAL_MAX_PER_USER` (Int, default: 20)

### Stories

- **Story 11.1** — Database Schema: Referral Program
- **Story 11.2** — Fluxo de Cadastro com Referral (modifica Story 1.3)
- **Story 11.3** — Atribuição de Bônus na Primeira Compra
- **Story 11.4** — Interface do Aluno: Compartilhar e Acompanhar Indicações
- **Story 11.5** — Painel Admin: Controle do Programa de Referral

### API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/referral/stats` | Stats do aluno (indicações, créditos ganhos) |
| GET/PUT | `/api/admin/referral` | Configuração do programa |
| GET | `/api/admin/referral/list` | Lista de indicações com filtros |

---

## Integrações Stripe Expandidas

### Novos Webhooks

| Event | Ação |
|-------|------|
| `invoice.payment_succeeded` | Credita créditos mensais via `addCredits(type: 'subscription_renewal')` |
| `invoice.payment_failed` | Marca UserSubscription status = PAST_DUE |
| `customer.subscription.updated` | Atualiza status e período da assinatura |
| `customer.subscription.deleted` | Marca UserSubscription status = CANCELED |

### Novas APIs Stripe

- `stripe.products.create/update` — auto-provisionamento de planos
- `stripe.prices.create` — preços recorrentes (`recurring.interval=month`)
- `stripe.customers.create` — criação de Customer
- `stripe.customers.listPaymentMethods` — listar payment methods salvos
- `stripe.paymentIntents.create` — one-click com `confirm:true`, `off_session:true`

---

## Ordem de Implementação Recomendada

1. **Epic 9 primeiro** — estabelece Stripe Customer e payment methods (pré-requisito para Epic 10)
2. **Epic 10.1-10.2** — schema de campanhas + one-click engine (depende de 9.3)
3. **Epic 11 completo** — referral é independente
4. **Epic 10.3-10.4** — admin de campanhas + popups (depende de 10.1-10.2)

---

## Enum TransactionType Final (após Epics 9-11)

```
purchase              // Compra avulsa de pacote (existente)
consumption           // Uso de créditos em chat/roteiro (existente)
adjustment            // Ajuste manual pelo admin (existente)
subscription_renewal  // Renovação de assinatura mensal (Epic 9)
promo_purchase        // Compra via campanha promocional (Epic 10)
referral              // Bônus de indicação (Epic 11)
```

---

## Non-Functional Requirements Adicionais

- **NFR10:** Todas as operações de assinatura e pagamento one-click devem usar idempotência do Stripe para prevenir cobranças duplicadas
- **NFR11:** O programa de referral deve validar limites e status no servidor (nunca confiar em dados do frontend)
- **NFR12:** Campanhas promocionais devem usar índices compostos para queries de segmentação performáticas
