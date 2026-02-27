# Tech Debt Backlog — SOL SaaS

Last updated: 2026-02-27 (Quality Audit v2)
Items registered by @dev after quality-audit workflow.

---

## BLOCKER (Requires Architectural Decision)

### QA-109 / SA-313 / SA-200 | Rate Limiting on API Routes
- **Severidade:** BLOCKER
- **Arquivo:** All routes under `apps/web/src/app/api/`
- **Descrição:** Zero rate limiting. `/api/chat` faz chamadas OpenAI pagas por request. Vulnerável a spam, cost amplification, brute force.
- **Correção sugerida:** Adicionar `@upstash/ratelimit` ou middleware equivalente. Requer decisão: Upstash (hosted Redis) vs in-memory vs self-hosted Redis.
- **Prioridades:** `/api/chat` (10 req/min/user), `/api/auth/register` (5 req/min/IP), `/api/payments/checkout` (5 req/min/user).
- **Nota:** Não corrigido automaticamente — requer decisão do @architect sobre infraestrutura.

### QA-105 | Race Condition em deductCredits — Sem Row-Level Lock
- **Severidade:** BLOCKER
- **Arquivo:** `packages/db/src/credits.ts:86-128`
- **Descrição:** Read-check-write sem `FOR UPDATE` ou `SERIALIZABLE`. Double-spend possível sob concorrência.
- **Correção sugerida:** Adicionar `isolationLevel: Serializable` no `$transaction` ou usar `SELECT ... FOR UPDATE` via `$queryRaw`.
- **Nota:** Não corrigido automaticamente — requer decisão do @architect (SERIALIZABLE vs FOR UPDATE vs optimistic locking).

---

## HIGH (Pending Feature Stories)

### QA-102 | Admin Page com Mock Data (Story 4.1 AC7)
- **Severidade:** HIGH
- **Arquivo:** `apps/web/src/app/admin/page.tsx:8-21`
- **Descrição:** AC7 requer lista real de usuários. Implementação usa arrays hardcoded fictícios.
- **Correção sugerida:** Implementar queries Prisma para usuários, métricas e paginação.
- **Nota:** Requer implementação completa de Story 4.1.

### QA-103 | Zero Testes Automatizados
- **Severidade:** HIGH
- **Arquivo:** Codebase inteiro
- **Descrição:** PRD exige unit + integration tests. Nenhum `*.test.ts` ou `*.spec.ts` existe.
- **Correção sugerida:** Criar Story dedicada para test suite (Vitest + Testing Library).

### QA-104 / SA-312 | Rotacionar API Keys em .env
- **Severidade:** HIGH
- **Arquivo:** `.env`
- **Descrição:** OpenAI `sk-proj-...`, Stripe `sk_test_...`, AUTH_SECRET em plaintext. Nunca commitado no git mas presente em disco.
- **Correção sugerida:** (1) Rotacionar todas as chaves. (2) Usar secrets manager em produção.
- **Nota:** Tarefa operacional manual, não auto-fix.

---

## MEDIUM

### QA-107 / SA-309 | Frontend noCredits Threshold Mismatch
- **Severidade:** MEDIUM
- **Arquivo:** `apps/web/src/app/chat/page.tsx:240,245`
- **Descrição:** Frontend bloqueia em `balanceCents <= 0` mas backend permite negativo até `-200` (minBalanceCents). Mismatch funcional.
- **Correção sugerida:** Usar `balanceCents <= minBalanceCents` no frontend ou documentar comportamento.

### QA-106 / SA-009 | X-Balance-Remaining Header Stale
- **Severidade:** MEDIUM
- **Arquivo:** `apps/web/src/app/api/chat/route.ts:247`
- **Descrição:** Header envia saldo pré-dedução. SSE `done` event corrige depois. Docs dizem pós-dedução.
- **Correção sugerida:** Atualizar docs ou enviar header após dedução.

### QA-117 | Dashboard não implementa Story 3.5
- **Severidade:** MEDIUM
- **Arquivo:** `apps/web/src/app/dashboard/page.tsx`
- **Descrição:** PRD Story 3.5 AC1 requer: saldo, transações paginadas, lista de conversas. Dashboard é tela de boas-vindas com cards.
- **Correção sugerida:** Implementar Story 3.5 AC1.

### QA-118 / SA-314 | console.log Expõe Cost Metadata em Produção
- **Severidade:** MEDIUM
- **Arquivo:** `apps/web/src/app/api/chat/route.ts:104,131,178`
- **Descrição:** Logs expõem model, tokens, custos em centavos.
- **Correção sugerida:** Usar logger estruturado com log levels.

### QA-119 / SA-315 | Webhook Loga Detalhes Financeiros
- **Severidade:** MEDIUM
- **Arquivo:** `apps/web/src/app/api/webhooks/stripe/route.ts:47-51,61-63`
- **Descrição:** Logs incluem `amountCents`, `marginPercent`.
- **Correção sugerida:** Reduzir verbosidade em produção.

### SA-300 / SA-301 / SA-303 | Docs Architecture Incompleta
- **Severidade:** MEDIUM
- **Arquivo:** `docs/architecture.md`
- **Descrição:** Schema models (Session, Message, Role), 5+ API routes, e package exports não documentados.
- **Correção sugerida:** Atualizar docs/architecture.md com modelos, rotas, e exports.

### SA-311 / SA-207 | Middleware Excludes All API Routes
- **Severidade:** MEDIUM
- **Arquivo:** `apps/web/src/middleware.ts`
- **Descrição:** Nova rota API sem `auth()` individual = vulnerabilidade instantânea.
- **Correção sugerida:** Criar wrapper `withAuth` para defense-in-depth.

### QA-404 | Role Cast Without Filter
- **Severidade:** MEDIUM
- **Arquivo:** `apps/web/src/app/api/chat/route.ts:109`
- **Descrição:** `m.role as 'user' | 'assistant'` sem filtro. Novo role no enum passaria valor inválido à OpenAI.
- **Correção sugerida:** `.filter(m => m.role === 'user' || m.role === 'assistant')`.

### QA-502 | SSE Stream Drop Leaves Partial Message Unmarked
- **Severidade:** MEDIUM
- **Arquivo:** `apps/web/src/app/chat/page.tsx:360-418`
- **Descrição:** Network drop mid-stream → mensagem parcial visível sem indicação de incompletude.
- **Correção sugerida:** Append " [resposta incompleta]" ou ícone de warning.

### QA-503 | Empty OpenAI Response Shows Empty Bubble
- **Severidade:** MEDIUM
- **Arquivo:** `apps/web/src/app/api/chat/route.ts:149`
- **Descrição:** Resposta vazia da OpenAI gera bolha de chat vazia.
- **Correção sugerida:** Se `fullResponse === ''`, usar fallback.

### SA-107 | Direct Prisma Query in Layout Component
- **Severidade:** MEDIUM
- **Arquivo:** `apps/web/src/components/layout/AppLayout.tsx:15-19`
- **Descrição:** `prisma.user.findUnique()` direto no componente.
- **Correção sugerida:** Criar `getUserBalance(email)` em `packages/db/src/users.ts`.

### SA-210 | No CSRF Protection on POST Endpoints
- **Severidade:** MEDIUM
- **Arquivo:** All POST routes
- **Descrição:** Sem tokens CSRF. SameSite cookies mitigam em navegadores modernos.
- **Correção sugerida:** Verificar headers Origin/Referer ou adicionar CSRF tokens.

---

## LOW

### QA-114 | SSE Reader Sem Timeout/Abort
- **Severidade:** LOW
- **Arquivo:** `apps/web/src/app/chat/page.tsx:360-418`
- **Descrição:** Sem `AbortController` timeout. Hang silencioso = loading infinito.
- **Correção sugerida:** Adicionar AbortController com timeout de 60s.

### QA-115 | Página de Erro Sem session_id Feedback
- **Severidade:** LOW
- **Arquivo:** `apps/web/src/app/credits/error/page.tsx`

### QA-116 | Success Page Afirma Créditos Antes do Webhook
- **Severidade:** LOW
- **Arquivo:** `apps/web/src/app/credits/success/page.tsx:25`
- **Descrição:** "Créditos adicionados" exibido imediatamente. Webhook pode demorar.
- **Correção sugerida:** Polling status ou mensagem "processando".

### QA-120 / SA-316 | CSP Inclui `unsafe-eval`
- **Severidade:** LOW
- **Arquivo:** `apps/web/next.config.mjs:37`
- **Correção sugerida:** Investigar remoção de `unsafe-eval`.

### QA-112 / SA-307 | `as TiktokenModel` Casts
- **Severidade:** LOW
- **Arquivo:** `packages/db/src/token-counter.ts:34,37,62,64`
- **Descrição:** Cast necessário para compatibilidade tiktoken. Fallback via try/catch.

### SA-201 | Registration No Bot Protection
- **Severidade:** LOW
- **Arquivo:** `apps/web/src/app/api/auth/register/route.ts`
- **Descrição:** Sem CAPTCHA ou honeypot. Rate limiting é pré-requisito.

### SA-212 | JWT 7 Days for Financial App
- **Severidade:** LOW
- **Arquivo:** `apps/web/src/lib/auth.ts:49`
- **Descrição:** 7 dias sem rotação ou revogação para app com créditos financeiros.

### QA-508 | No Offline/Network Error Handling
- **Severidade:** LOW
- **Arquivo:** `apps/web/src/app/chat/page.tsx:317-431`
- **Descrição:** Sem check `navigator.onLine`.

---

## INFO

### QA-122 | PIX Não Habilitado no Stripe Checkout
- **Arquivo:** `apps/web/src/app/api/payments/checkout/route.ts:51`
- **Descrição:** `payment_method_types: ['card']`. PRD FR8 requer PIX + cartão.

### QA-113 / SA-305 | `as unknown` para Prisma Singleton
- **Arquivo:** `packages/db/src/index.ts:6`
- **Descrição:** Padrão Prisma aceito.

### SA-302 / SA-304 | Minor Docs Discrepancies
- **Descrição:** Enum vs string type em docs, PostgreSQL 16 vs 17 em Docker Compose.

---

## CORRIGIDOS (Audit v2)

| ID | Descrição | Status |
|----|-----------|--------|
| QA-100 / SA-321 | Admin redirect → /dashboard | **CORRIGIDO** |
| QA-101 / SA-318 | Seed: production guard + 12 rounds | **CORRIGIDO** |
| QA-108 | Register: não revelar email existente | **CORRIGIDO** |
| QA-110 / SA-324 | Role type `'USER' \| 'ADMIN'` | **CORRIGIDO** |
| QA-104 / SA-208 | Webhook error reveals config state | **CORRIGIDO** (audit v1) |
