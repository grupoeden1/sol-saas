# Quality Review Report — SOL SaaS

**Date:** 2026-02-27
**Scope:** Full codebase
**Agent:** @qa (Quinn)
**Workflow:** quality-audit v1.0.0 — Etapa 2
**Input:** Static Analysis Report `docs/audit/01-static-analysis.md` (24 findings)

---

## Story 4.1 — Acceptance Criteria Review

| AC | Status | Notas |
|----|--------|-------|
| AC1: Enum Role + campo role @default(USER) | PASS | `schema.prisma:16,69-72` |
| AC2: Migration sem afetar existentes | PASS | `DEFAULT 'USER'` na migration |
| AC3: Middleware bloqueia non-admin | PASS (caveat QA-100) | Redirect vai para `/login` em vez de `/dashboard` |
| AC4: JWT/Session inclui role | PASS | `auth.ts:40,57,65` |
| AC5: Seed cria admin | PASS (caveat QA-101) | Email `dev@sol.local` vs PRD `admin@sol.com`, sem guard de produção |
| AC6: Promoção via SQL | PASS | Docs. |
| AC7: /admin com dados reais | **FAIL (QA-102)** | Mock data hardcoded, sem queries |
| AC8: Sem regressões | PASS (sem testes) | Zero test files (QA-103) |

---

## Findings

### QA-100 | MEDIUM | Security | Admin redirect envia user autenticado para /login
- **Arquivo:** `apps/web/src/middleware.ts:19-20`
- **Descrição:** User com role USER acessando /admin vai para /login (confuso). Deveria ir para /dashboard.
- **Relacionado:** SA-321

### QA-101 | MEDIUM | Security | Seed sem guard de produção + bcrypt rounds inconsistentes
- **Arquivo:** `packages/db/prisma/seed.ts`
- **Descrição:** Sem `NODE_ENV` check. Senha hardcoded com 10 rounds (register usa 12).
- **Relacionado:** SA-318

### QA-102 | HIGH | Regression | Admin page com mock data em vez de queries reais
- **Arquivo:** `apps/web/src/app/admin/page.tsx:8-21`
- **Descrição:** AC7 requer lista real de usuários. Implementação usa arrays hardcoded fictícios.
- **Relacionado:** AC7 (FAIL)

### QA-103 | HIGH | Regression | Zero testes automatizados no projeto
- **Arquivo:** Codebase inteiro
- **Descrição:** PRD exige unit + integration tests. Nenhum `*.test.ts` ou `*.spec.ts` existe.
- **Relacionado:** AC8

### QA-104 | HIGH | Security | Chaves reais em `.env` (não commitadas mas em disco)
- **Arquivo:** `.env`
- **Descrição:** OpenAI `sk-proj-...`, Stripe `sk_test_...`, AUTH_SECRET em plaintext.
- **Relacionado:** SA-312 (downgraded de BLOCKER — nunca commitado no git)

### QA-105 | HIGH | Logic | Race condition em deductCredits — sem row-level lock
- **Arquivo:** `packages/db/src/credits.ts:86-128`
- **Descrição:** Read-check-write sem `FOR UPDATE` ou `SERIALIZABLE`. Double-spend possível sob concorrência.
- **Correção:** Adicionar `isolationLevel: Serializable` ou `SELECT ... FOR UPDATE`.

### QA-106 | MEDIUM | Logic | X-Balance-Remaining header envia saldo pré-dedução
- **Arquivo:** `apps/web/src/app/api/chat/route.ts:247`
- **Descrição:** Header envia balance antes da dedução. SSE `done` event corrige depois.

### QA-107 | MEDIUM | Frontend | noCredits check usa `balanceCents <= 0` ignorando minBalanceCents
- **Arquivo:** `apps/web/src/app/chat/page.tsx:240,245`
- **Descrição:** Frontend bloqueia em 0 mas backend permite negativo até -200. Mismatch funcional.
- **Relacionado:** SA-309 (escalado de LOW para MEDIUM)

### QA-108 | MEDIUM | Security | Register revela existência de email (viola AC7 Story 1.3)
- **Arquivo:** `apps/web/src/app/api/auth/register/route.ts:30-34`
- **Descrição:** Retorna 409 "Email já cadastrado". PRD AC7: "não revelar se email existe".

### QA-109 | HIGH | Security | Zero rate limiting em todas as rotas
- **Arquivo:** Codebase inteiro
- **Descrição:** Sem rate limiting. Vulnerável a spam, cost amplification, brute force.
- **Relacionado:** SA-313

### QA-110 | LOW | TypeScript | `role: string` em vez de `'USER' | 'ADMIN'`
- **Arquivo:** `apps/web/src/types/next-auth.d.ts:8,15,23`
- **Relacionado:** SA-324

### QA-111 | LOW | TypeScript | `as string` casts no session callback
- **Arquivo:** `apps/web/src/lib/auth.ts:63-65`
- **Relacionado:** SA-308

### QA-112 | LOW | TypeScript | `as TiktokenModel` casts
- **Arquivo:** `packages/db/src/token-counter.ts:34,37,62,64`
- **Relacionado:** SA-307

### QA-113 | INFO | TypeScript | `as unknown` para Prisma singleton
- **Arquivo:** `packages/db/src/index.ts:6`
- **Relacionado:** SA-305

### QA-114 | LOW | Frontend | SSE reader sem timeout/abort
- **Arquivo:** `apps/web/src/app/chat/page.tsx:360-418`
- **Descrição:** Sem `AbortController` timeout. Hang silencioso = loading infinito.

### QA-115 | LOW | Frontend | Página de erro sem session_id feedback
- **Arquivo:** `apps/web/src/app/credits/error/page.tsx`

### QA-116 | LOW | Frontend | Success page afirma créditos adicionados antes do webhook
- **Arquivo:** `apps/web/src/app/credits/success/page.tsx:25`
- **Descrição:** "Créditos adicionados" exibido imediatamente. Webhook pode demorar.

### QA-117 | MEDIUM | Docs | Dashboard é welcome page, não implementa Story 3.5
- **Arquivo:** `apps/web/src/app/dashboard/page.tsx`
- **Descrição:** PRD Story 3.5 AC1 requer: saldo, transações paginadas, lista de conversas. Dashboard é tela de boas-vindas com cards.

### QA-118 | MEDIUM | Logic | console.log expõe cost metadata em produção
- **Arquivo:** `apps/web/src/app/api/chat/route.ts:104,131,178`
- **Relacionado:** SA-314

### QA-119 | MEDIUM | Logic | Webhook loga detalhes financeiros
- **Arquivo:** `apps/web/src/app/api/webhooks/stripe/route.ts:47-51,61-63`
- **Relacionado:** SA-315

### QA-120 | LOW | Security | CSP inclui `unsafe-eval`
- **Arquivo:** `apps/web/next.config.mjs:37`
- **Relacionado:** SA-316

### QA-121 | LOW | Docs | Rotas de API não documentadas
- **Arquivo:** `docs/architecture.md`
- **Relacionado:** SA-303

### QA-122 | INFO | Logic | PIX não habilitado no Stripe Checkout
- **Arquivo:** `apps/web/src/app/api/payments/checkout/route.ts:51`
- **Descrição:** `payment_method_types: ['card']`. PRD FR8 requer PIX + cartão.

### QA-123 | INFO | Docs | Schema models não documentados na arquitetura
- **Relacionado:** SA-300, SA-301, SA-302

---

## Cross-Reference: SA → QA

| SA-ID | QA Verdict | Notas |
|-------|-----------|-------|
| SA-312 (BLOCKER) | **Downgraded → HIGH (QA-104)** | `.env` nunca commitado no git |
| SA-309 (LOW) | **Escalado → MEDIUM (QA-107)** | Mismatch funcional frontend/backend |
| SA-323 (LOW) | **Escalado → HIGH (QA-102)** | AC7 explicitamente requer dados reais |
| Todos os outros | CONFIRMED | Sem mudança de severidade |

---

## Resumo

| Severidade | Count | IDs |
|-----------|-------|-----|
| **BLOCKER** | 0 | |
| **HIGH** | 5 | QA-102, QA-103, QA-104, QA-105, QA-109 |
| **MEDIUM** | 8 | QA-100, QA-101, QA-106, QA-107, QA-108, QA-117, QA-118, QA-119 |
| **LOW** | 7 | QA-110, QA-111, QA-112, QA-114, QA-115, QA-116, QA-120, QA-121 |
| **INFO** | 3 | QA-113, QA-122, QA-123 |
| **Total** | **23** | |

---

## Deduplicated Master Finding List para @dev

### AUTO-FIX (HIGH):
1. **QA-100/SA-321** — Admin redirect → /dashboard
2. **QA-101/SA-318** — Seed: production guard + 12 rounds
3. **QA-108** — Register: não revelar email existente
4. **QA-110/SA-324** — Role type union em vez de string

### REQUER DECISÃO ARQUITETURAL (HIGH — defer):
5. **QA-105** — Race condition deductCredits (SERIALIZABLE vs FOR UPDATE)
6. **QA-109/SA-313** — Rate limiting (Upstash vs Redis vs in-memory)

### BACKLOG (MEDIUM+LOW):
7. **QA-102** — Admin com dados reais (Story 4.1 pendente)
8. **QA-103** — Testes automatizados (nova Story necessária)
9. **QA-104** — Rotacionar API keys
10. **QA-106** — X-Balance-Remaining header stale
11. **QA-107** — Frontend noCredits threshold mismatch
12. **QA-117** — Dashboard Story 3.5 não implementada
13. **QA-118/SA-314** — Structured logging
14. **QA-119/SA-315** — Webhook log verbosity
15. Demais LOW/INFO
