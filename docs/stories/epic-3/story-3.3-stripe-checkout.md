# Story 3.3 — Pacotes de Créditos & Stripe Checkout

**Epic:** 3 — Créditos & Pagamentos
**Story ID:** 3.3
**Priority:** High
**Estimate:** 5-8 story points
**Status:** Draft

---

## User Story

**As a** student,
**I want** to choose a credit package and be redirected to a secure payment page,
**so that** I can buy credits easily.

---

## Context

Esta story implementa o fluxo completo de compra de créditos via Stripe Checkout. O aluno acessa `/credits/buy`, escolhe um pacote, é redirecionado para o Stripe Checkout (cartão + PIX), e retorna para `/credits/success` ou `/credits/error`.

**Estado atual (baseline):**
- `/credits/buy/page.tsx`: ✅ existe como placeholder ("será implementado no Epic 3")
- `/credits/layout.tsx`: ✅ existe (wraps AppLayout)
- `deductCredits()`/`addCredits()`: ✅ Story 3.1
- Saldo zero → 402 bloqueio: ✅ Story 3.2
- Stripe SDK: ❌ **esta story**
- `POST /api/payments/checkout`: ❌ **esta story**
- `/credits/success` + `/credits/error`: ❌ **esta story**
- Vars Stripe no `.env`: ❌ **esta story** (comentadas em `.env.example`)

**Decisão arquitetural (pacotes de créditos):**
- Pacotes definidos em `src/lib/credits-config.ts` — array tipado com `id`, `credits`, `price` (cents BRL), `label`
- Sem tabela de preços no banco no MVP — configuração estática é suficiente
- `POST /api/payments/checkout` recebe `{ packageId }` e busca pacote em `credits-config.ts`
- `metadata.creditsAmount` na sessão Stripe → usado pelo webhook (Story 3.4) para saber quantos créditos adicionar
- PIX: `payment_method_types: ['card', 'pix']` — requer conta Stripe com PIX habilitado no dashboard

---

## Acceptance Criteria

### AC1: Página `/credits/buy` lista pacotes disponíveis

- [ ] Página exibe mínimo 3 pacotes (50, 150, 500 créditos) com nome, preço e quantidade de créditos
- [ ] Cada pacote tem botão "Comprar" que dispara checkout
- [ ] Pacote "popular" destacado visualmente
- [ ] Página é protegida (redirect `/login` se não autenticado)
- [ ] Layout consistente com AppLayout (header com badge de créditos visível)

**Test:** Acessar `/credits/buy` autenticado → ver 3 pacotes com preços e botões de compra.

---

### AC2: `POST /api/payments/checkout` cria sessão Stripe Checkout

- [ ] Aceita `{ packageId: string }` no body
- [ ] Valida autenticação — retorna 401 se não autenticado
- [ ] Valida `packageId` — retorna 400 se pacote não existe
- [ ] Cria sessão Stripe Checkout com:
  - `payment_method_types: ['card', 'pix']`
  - `mode: 'payment'`
  - `line_items` com preço e nome do pacote
  - `success_url: /credits/success?session_id={CHECKOUT_SESSION_ID}`
  - `cancel_url: /credits/error`
  - `metadata: { userId, packageId, creditsAmount }`
- [ ] Retorna `{ sessionUrl: string }` com 200
- [ ] Erros Stripe logados com `packageId` para diagnóstico

**Test:** POST com `{ packageId: 'pro' }` → retorna `{ sessionUrl: "https://checkout.stripe.com/..." }`.

---

### AC3: Frontend redireciona para Stripe Checkout

- [ ] Ao clicar "Comprar", frontend chama `POST /api/payments/checkout`
- [ ] Após receber `sessionUrl`, redireciona via `window.location.href = sessionUrl`
- [ ] Loading state visível no botão durante chamada à API
- [ ] Erro da API exibido inline (mensagem amigável, não alert nativo)

**Test:** Clicar "Comprar" → botão mostra loading → redirecionamento para Stripe (em test mode).

---

### AC4: Stripe Checkout aceita cartão e PIX

- [ ] `payment_method_types` inclui `'card'` e `'pix'`
- [ ] `currency: 'brl'` configurado
- [ ] Preços em centavos (`price` em `credits-config.ts` em centavos BRL)

**Test:** Verificar na sessão Stripe criada que `payment_method_types` contém ambos.

---

### AC5: Página `/credits/success` exibe confirmação

- [ ] Página em `/credits/success` acessível após redirecionamento do Stripe
- [ ] Exibe mensagem amigável ("Pagamento confirmado! Seus créditos serão adicionados em breve.")
- [ ] Link "Ir para o chat" para `/chat`
- [ ] **Nota:** créditos adicionados pelo webhook (Story 3.4), não nesta página

**Test:** Acessar `/credits/success` → ver confirmação e link para o chat.

---

### AC6: Página `/credits/error` exibe erro com link para retry

- [ ] Página em `/credits/error` acessível após cancelamento ou erro no Stripe
- [ ] Exibe mensagem de erro ("Pagamento não concluído. Você pode tentar novamente.")
- [ ] Link "Tentar novamente" para `/credits/buy`
- [ ] Link "Ir para o chat" para `/chat`

**Test:** Acessar `/credits/error` → ver mensagem e links de retry.

---

## Technical Implementation Notes

### Stripe client singleton

```typescript
// apps/web/src/lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});
```

### Credits config

```typescript
// apps/web/src/lib/credits-config.ts
export interface CreditPackage {
  id: string;
  credits: number;
  price: number; // centavos BRL (ex: 1990 = R$19,90)
  label: string;
  description: string;
  popular?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'starter', credits: 50, price: 1990, label: 'Starter', description: '50 mensagens com a IA' },
  { id: 'pro', credits: 150, price: 4990, label: 'Pro', description: '150 mensagens com a IA', popular: true },
  { id: 'max', credits: 500, price: 14990, label: 'Max', description: '500 mensagens com a IA' },
];

export function findPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find(p => p.id === id);
}
```

### Checkout flow

```
POST /api/payments/checkout
  ├─ auth check → 401 se não autenticado
  ├─ parse { packageId }
  ├─ findPackage(packageId) → 400 se não existe
  ├─ stripe.checkout.sessions.create({
  │     payment_method_types: ['card', 'pix'],
  │     mode: 'payment',
  │     currency: 'brl',
  │     line_items: [{ price_data: {...}, quantity: 1 }],
  │     success_url: `${NEXTAUTH_URL}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
  │     cancel_url: `${NEXTAUTH_URL}/credits/error`,
  │     metadata: { userId, packageId, creditsAmount: credits },
  │   })
  └─ return { sessionUrl: session.url }
```

### Frontend buy page

```
/credits/buy/page.tsx (Server Component)
  ├─ auth() → redirect /login se não autenticado
  └─ render CREDIT_PACKAGES grid
      └─ BuyButton (Client Component)
          ├─ onClick → POST /api/payments/checkout { packageId }
          ├─ loading state no botão
          └─ redirect → window.location.href = sessionUrl
```

---

## Files to Create/Modify

| File | Action | Mudança |
|------|--------|---------|
| `apps/web/src/lib/stripe.ts` | CREATE | Stripe singleton client |
| `apps/web/src/lib/credits-config.ts` | CREATE | Pacotes de créditos tipados |
| `apps/web/src/app/api/payments/checkout/route.ts` | CREATE | Endpoint Stripe Checkout |
| `apps/web/src/app/credits/buy/page.tsx` | MODIFY | Substituir placeholder por listagem real |
| `apps/web/src/app/credits/buy/components/BuyButton.tsx` | CREATE | Client Component botão de compra |
| `apps/web/src/app/credits/success/page.tsx` | CREATE | Página de sucesso pós-pagamento |
| `apps/web/src/app/credits/error/page.tsx` | CREATE | Página de erro/cancelamento |
| `.env.example` | MODIFY | Descomentar vars Stripe |
| `.env` | MODIFY | Adicionar vars Stripe (test keys) |

---

## Dependencies

- **Blocked by:** Story 3.1 (`addCredits` disponível) ✅ Done
- **Blocked by:** Story 3.2 (sistema de dedução funcionando) ✅ Done
- **Blocks:** Story 3.4 (webhook Stripe usa `metadata` criado aqui)

---

## Testing Checklist

- [ ] `/credits/buy` autenticado → 3 pacotes visíveis com preços
- [ ] `/credits/buy` não autenticado → redirect `/login`
- [ ] POST `/api/payments/checkout` com `packageId` válido → `sessionUrl` retornado
- [ ] POST `/api/payments/checkout` com `packageId` inválido → 400
- [ ] POST `/api/payments/checkout` sem autenticação → 401
- [ ] Stripe session criada com `metadata.creditsAmount` correto
- [ ] `/credits/success` acessível → mensagem de confirmação + link para chat
- [ ] `/credits/error` acessível → mensagem de erro + links retry
- [ ] `pnpm typecheck` sem erros
- [ ] Nenhuma `STRIPE_SECRET_KEY` hardcoded no código

---

## Definition of Done

- [ ] Stripe SDK instalado (`stripe` em `@sol/web`)
- [ ] `credits-config.ts` com 3 pacotes definidos
- [ ] `stripe.ts` singleton criado
- [ ] `/credits/buy` exibe pacotes reais (não placeholder)
- [ ] `POST /api/payments/checkout` funcional com teste em Stripe test mode
- [ ] `/credits/success` e `/credits/error` criadas
- [ ] Vars Stripe documentadas em `.env.example`
- [ ] TypeScript strict, sem erros no typecheck
