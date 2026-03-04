# Fix Report — Quality Audit v4 2026-03-03

**Agent:** @dev (Claude)
**Workflow:** quality-audit — Phase 3
**Input:** 01-static-analysis.md (34 findings), 02-quality-review.md (21 findings)
**Status:** **PASS** (10 BLOCKER+HIGH auto-fixed, 35 MEDIUM+LOW → backlog)

---

## Resumo Executivo

| Categoria | Total | Auto-fixed | Backlog |
|-----------|-------|------------|---------|
| BLOCKER   | 2     | 2          | 0       |
| HIGH      | 7     | 7          | 0       |
| MEDIUM*   | 2     | 2          | 0       |
| MEDIUM    | 18    | 0          | 18      |
| LOW       | 17    | 0          | 17      |
| **Total** | **46**| **11**     | **35**  |

*SA-013 e QA-011 foram promovidos para auto-fix por serem quick-wins de segurança.

---

## Correções Aplicadas (v4 — 2026-03-03)

### Fix 1 | QA-001 (BLOCKER) — CHECK constraint credits >= 0

**Arquivo:** `packages/db/prisma/migrations/20260303230000_add_credits_non_negative_check/migration.sql`

**Problema:** Constraint `user_credits_non_negative` criada em migration 20260225, dropada durante pricing refactoring, nunca re-adicionada. Banco sem safety net contra créditos negativos.

**Correção:** Nova migration: `ALTER TABLE "User" ADD CONSTRAINT "user_credits_non_negative" CHECK ("credits" >= 0);`

**TypeCheck:** PASS

---

### Fix 2 | SA-017 / SA-016 / QA-010 (BLOCKER + HIGH) — Rate limiting

**Arquivo:** `apps/web/src/lib/rate-limit.ts` (novo) + 4 rotas

**Problema:** Zero rate limiting em todo o codebase. Rotas que fazem chamadas OpenAI pagas expostas a abuso.

**Correção:** Rate limiter in-memory por IP com sliding window. Aplicado em:
- `POST /api/chat` — 30 req/min/IP
- `POST /api/auth/register` — 5 req/hora/IP
- `POST /api/quiz/generate` — 10 req/min/IP
- `POST /api/video/upload` — 5 req/min/IP

**TypeCheck:** PASS

---

### Fix 3 | QA-002 (HIGH) — addCredits validation

**Arquivo:** `packages/db/src/credits.ts`

**Problema:** `addCredits()` aceita valor 0 ou negativo sem validação. Corrompe saldo se pacote mal configurado.

**Correção:** Guard `if (credits <= 0) throw new Error(...)` no início da função.

**TypeCheck:** PASS

---

### Fix 4 | QA-003 (HIGH) — deductCredits validation

**Arquivo:** `packages/db/src/credits.ts`

**Problema:** `deductCredits()` aceita valor 0 ou negativo. Defense-in-depth.

**Correção:** Guard `if (creditsUsed <= 0) throw new Error(...)` no início da função.

**TypeCheck:** PASS

---

### Fix 5 | QA-004 (HIGH) — PIX payment method

**Arquivo:** `apps/web/src/app/api/payments/checkout/route.ts`

**Problema:** `payment_method_types: ['card']` — PIX ausente. Story 3.3 AC4 requer PIX.

**Correção:** `payment_method_types: ['card', 'pix']`

**TypeCheck:** PASS

---

### Fix 6 | SA-014 (HIGH) — Middleware missing routes

**Arquivo:** `apps/web/src/middleware.ts`

**Problema:** `/onboarding`, `/quiz`, `/roteiros` não protegidos pelo middleware. Usuário não autenticado vê loading/error antes de redirect.

**Correção:** Adicionados ao `isProtectedRoute` check.

**TypeCheck:** PASS

---

### Fix 7 | SA-023 (HIGH) — Video upload no credit check

**Arquivo:** `apps/web/src/app/api/video/upload/route.ts`

**Problema:** Video upload dispara chamadas OpenAI (GPT-4o Vision + consolidation) sem verificar créditos. Usuário com 0 créditos gasta budget da API.

**Correção:** Credit gate: `if (user.credits <= 0)` retorna 402 antes de salvar arquivo.

**TypeCheck:** PASS

---

### Fix 8 | QA-011 (MEDIUM → auto-fix) — Webhook pkg.credits validation

**Arquivo:** `apps/web/src/app/api/webhooks/stripe/route.ts`

**Problema:** Webhook não valida `pkg.credits > 0` antes de chamar `addCredits`. Pacote com 0 créditos corrompe saldo.

**Correção:** `if (!pkg || pkg.credits <= 0)` retorna 400.

**TypeCheck:** PASS

---

### Fix 9 | SA-013 (MEDIUM → auto-fix) — Zod no quiz session PATCH

**Arquivo:** `apps/web/src/app/api/quiz/session/[id]/route.ts`

**Problema:** `body as { status: string }` — unsafe cast sem Zod. Única rota API sem validação de input.

**Correção:** Schema Zod `z.object({ status: z.enum(['COMPLETED', 'ABANDONED']) })`.

**TypeCheck:** PASS

---

## Backlog de Débito Técnico (MEDIUM + LOW)

Registrado em [docs/stories/backlog/tech-debt.md](docs/stories/backlog/tech-debt.md)

**MEDIUM (17 itens):** docs mismatch (SA-001,003,005,010), revenue JOIN fragile (SA-019/QA-008), pagination (SA-020), console.log admin emails (SA-018), CSRF (SA-026), N+1 frame analysis (SA-030), answerValue length (SA-032), video duplicate (SA-033), checkout metadata (SA-034/QA-005), SSE field names (QA-006), $queryRawUnsafe (QA-007), File cast (QA-009), concurrent video (SA-024), chat history 20 vs 10 (SA-022).

**LOW (18 itens):** docs undocumented routes (SA-006,007,008,009), Prisma singleton as unknown (SA-011), type assertions (SA-012), dead code conversations.ts (SA-015), pagination quiz (SA-021), seed password (SA-025), X-Credits header (SA-027), webhook user exists (SA-028), InsufficientBalanceError message (SA-031), offline handling (QA-012), SSE timeout (QA-013), success page timing (QA-014), Stripe cast (QA-015), console.log (QA-016), role typing (QA-017), Prisma naming (QA-018).

---

## Verificação Final

| Check | Resultado |
|-------|-----------|
| TypeScript (`tsc --noEmit`) | **0 errors** |
| Files modified | 11 |
| BLOCKER+HIGH corrigidos | **10/10** |
| MEDIUM+LOW → backlog | **35** |

---

## Status: PASS

Todos os itens BLOCKER e HIGH foram corrigidos com typecheck passando.
Items MEDIUM e LOW registrados como débito técnico para sprints futuros.

---

## Histórico

- **v3 (2026-02-28):** 4 CRITICAL+HIGH corrigidos, 14 backlog
- **v4 (2026-03-03):** 10 BLOCKER+HIGH corrigidos, 35 backlog (codebase expandiu com Epics 5-7)
