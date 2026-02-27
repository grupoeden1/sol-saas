# Static Analysis Report — SOL SaaS

**Date:** 2026-02-27
**Scope:** Full codebase (`sol-saas/`)
**Agent:** @architect (Aria)
**Workflow:** quality-audit v1.0.0 — Etapa 1

---

## 1. Inconsistências Docs ↔ Código

### SA-300 | MEDIUM | Schema: Session e Message não documentados na arquitetura
- **Arquivo:** `packages/db/prisma/schema.prisma:30-62`
- **Descrição:** Modelos `Session`, `Message` e enums `MessageRole`, `TransactionType` ausentes de `docs/architecture.md`.
- **Correção:** Adicionar ao Data Models de `docs/architecture.md`.

### SA-301 | MEDIUM | Schema: Enum `Role` e campo `User.role` não documentados
- **Arquivo:** `packages/db/prisma/schema.prisma:16,69-72`
- **Descrição:** Enum `Role` (`USER`, `ADMIN`) e campo `role` no User ausentes da arquitetura.
- **Correção:** Adicionar `role: Role` ao User interface documentado.

### SA-302 | LOW | Schema: `type` field usa enum em vez de string
- **Arquivo:** `packages/db/prisma/schema.prisma:78`
- **Descrição:** Docs descrevem `type: 'purchase' | 'consumption'` mas implementação usa enum `TransactionType`.
- **Correção:** Atualizar docs para refletir enum.

### SA-303 | MEDIUM | Rotas de API não documentadas
- **Arquivo:** `docs/architecture.md:174-240`
- **Descrição:** Docs só documentam `/api/chat` e `/api/payments/checkout`. Faltam: `/api/auth/register`, `/api/auth/[...nextauth]`, `/api/conversations`, `/api/conversations/[id]/messages`, `/api/webhooks/stripe`.
- **Correção:** Documentar todas as rotas na seção API Specification.

### SA-304 | INFO | Docker Compose usa PostgreSQL 17 em vez de 16 documentado
- **Arquivo:** `docker-compose.yml:5`
- **Descrição:** Docs especificam PostgreSQL 16, código usa `postgres:17-alpine`.
- **Correção:** Atualizar docs.

---

## 2. Violações de Tech-Stack

### SA-305 | INFO | Único `as unknown` — padrão Prisma aceito
- **Arquivo:** `packages/db/src/index.ts:6`
- **Descrição:** `globalThis as unknown as { prisma: PrismaClient | undefined }` — padrão singleton Prisma.

### SA-306 | INFO | Zero `any`, `@ts-ignore`, `@ts-expect-error` encontrados
- **Descrição:** Codebase 100% TypeScript strict. Excelente.

### SA-307 | LOW | `as TiktokenModel` type casts em token-counter
- **Arquivo:** `packages/db/src/token-counter.ts:34,37,62,64`
- **Descrição:** Cast necessário para compatibilidade tiktoken. Fallback via try/catch.

### SA-308 | LOW | `as string` casts no session callback
- **Arquivo:** `apps/web/src/lib/auth.ts:63-65`
- **Descrição:** Três casts `as string` no callback de session do NextAuth. Aceitável.

### SA-309 | LOW | Lógica de créditos borderline no chat page
- **Arquivo:** `apps/web/src/app/chat/page.tsx`
- **Descrição:** Check `balanceCents <= 0` no frontend é UI state, não business logic.

---

## 3. Rotas sem Autenticação

### SA-310 | INFO | Todas as rotas privadas têm auth — zero blockers

| Rota | Método | Auth | Status |
|------|--------|------|--------|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handler | PUBLIC (OK) |
| `/api/auth/register` | POST | Nenhum (by design) | PUBLIC (OK) |
| `/api/chat` | POST | `auth()` | PRIVATE (OK) |
| `/api/conversations` | GET | `auth()` | PRIVATE (OK) |
| `/api/conversations/[id]/messages` | GET | `auth()` | PRIVATE (OK) |
| `/api/payments/checkout` | POST | `auth()` | PRIVATE (OK) |
| `/api/webhooks/stripe` | POST | Stripe signature | PUBLIC (OK) |

### SA-311 | MEDIUM | Middleware exclui todas as rotas `/api/` da proteção
- **Arquivo:** `apps/web/src/middleware.ts:26-28`
- **Descrição:** Pattern exclui `/api/` do middleware. Cada rota implementa auth individualmente.
- **Correção:** Adicionar linting ou CI check que garanta auth em novas rotas.

---

## 4. Riscos de Produção

### SA-312 | BLOCKER | Chaves reais no arquivo `.env`
- **Arquivo:** `.env`
- **Descrição:** Arquivo contém chaves reais (OpenAI `sk-proj-...`, Stripe `sk_test_...`, AUTH_SECRET). Se `.gitignore` falhar, todas as chaves são expostas.
- **Correção:** (1) Rotacionar todas as chaves. (2) Verificar git history. (3) Usar secrets manager em produção.

### SA-313 | HIGH | Zero rate limiting em qualquer rota
- **Arquivo:** Codebase inteiro
- **Descrição:** Nenhuma implementação de rate limiting. Docs prometem "Rate Limiting por IP no Chat" mas não existe. Rotas vulneráveis: register (spam), chat (cost amplification), checkout (session spam).
- **Correção:** Implementar com `@upstash/ratelimit` ou Redis.

### SA-314 | MEDIUM | console.log expõe metadados de custo em produção
- **Arquivo:** `apps/web/src/app/api/chat/route.ts:104,131,178`
- **Descrição:** Logs expõem model, tokens, custos em centavos.
- **Correção:** Usar logger estruturado com log levels.

### SA-315 | MEDIUM | Webhook loga detalhes financeiros
- **Arquivo:** `apps/web/src/app/api/webhooks/stripe/route.ts:47-51,61-63`
- **Descrição:** Logs incluem `amountCents`, `marginPercent`.
- **Correção:** Reduzir verbosidade em produção.

### SA-316 | LOW | CSP inclui `'unsafe-eval'` em script-src
- **Arquivo:** `apps/web/next.config.mjs:36`
- **Descrição:** Headers bem configurados mas `'unsafe-eval'` enfraquece proteção XSS.
- **Correção:** Investigar remoção.

### SA-317 | LOW | Validação Zod presente nas rotas corretas
- **Descrição:** Register, chat, checkout têm Zod. Coverage adequada.

### SA-318 | MEDIUM | Seed com credenciais hardcoded e bcrypt rounds inconsistentes
- **Arquivo:** `packages/db/prisma/seed.ts:26`
- **Descrição:** Senha `dev12345` com 10 rounds (register usa 12).
- **Correção:** Usar 12 rounds. Guard `NODE_ENV !== 'production'`.

### SA-319 | LOW | `.env` não inclui `FALLBACK_USD_BRL_RATE` e `CREDIT_MARGIN_PERCENT`
- **Arquivo:** `.env`
- **Descrição:** Variáveis documentadas em `.env.example` mas ausentes.

---

## 5. Implementação RBAC

### SA-320 | INFO | Role enum e integração JWT implementados corretamente
- **Descrição:** Schema, auth callbacks, JWT e session corretamente configurados.

### SA-321 | MEDIUM | Middleware redireciona non-admin para `/login` em vez de `/dashboard`
- **Arquivo:** `apps/web/src/middleware.ts:18-20`
- **Descrição:** Usuário autenticado sem ADMIN role vai para `/login`. Deveria ir para `/dashboard`.
- **Correção:** Redirect para `/dashboard`.

### SA-322 | LOW | Admin page duplica auth check (defense-in-depth — bom)
- **Arquivo:** `apps/web/src/app/admin/page.tsx:24-32`

### SA-323 | LOW | Admin page usa mock data hardcoded
- **Arquivo:** `apps/web/src/app/admin/page.tsx:9-21`
- **Descrição:** Dados fictícios. Placeholder de desenvolvimento.

### SA-324 | MEDIUM | Session type declara `role` como `string` em vez de union type
- **Arquivo:** `apps/web/src/types/next-auth.d.ts:8,15,23`
- **Descrição:** `role: string` não pega erro de comparação `'admin'` vs `'ADMIN'`.
- **Correção:** Mudar para `role: 'USER' | 'ADMIN'`.

---

## Resumo

| Severidade | Count | IDs |
|-----------|-------|-----|
| **BLOCKER** | 1 | SA-312 |
| **HIGH** | 1 | SA-313 |
| **MEDIUM** | 9 | SA-300, SA-301, SA-303, SA-311, SA-314, SA-315, SA-318, SA-321, SA-324 |
| **LOW** | 8 | SA-302, SA-307, SA-308, SA-309, SA-316, SA-317, SA-319, SA-322, SA-323 |
| **INFO** | 5 | SA-304, SA-305, SA-306, SA-310, SA-320 |
| **Total** | **24** | |
