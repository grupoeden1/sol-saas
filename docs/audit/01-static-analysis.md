# Static Analysis Report — SOL SaaS

**Date:** 2026-03-03
**Scope:** Full codebase (`sol-saas/`)
**Phase:** 1 — Static Analysis (Research Only)
**Reference docs:** `docs/architecture.md` (v7.0), `docs/prd.md` (v9.0), `packages/db/prisma/schema.prisma`

---

## 1. INCONSISTENCIES: DOCS vs CODE

### SA-001 — Schema: `CreditPackage.priceInCents` documented but field is `priceBrl`
- **Severity:** MEDIUM
- **File:** `docs/architecture.md` line ~312 vs `packages/db/prisma/schema.prisma` line 120
- **Description:** The architecture doc defines `CreditPackage` with `priceInCents: number`, but the Prisma schema uses `priceBrl Int`. The field name diverged during implementation. All code (checkout route, admin packages, seed, admin UI) consistently uses `priceBrl`. The doc is out of date.
- **Suggested fix:** Update `docs/architecture.md` to use `priceBrl` instead of `priceInCents` in the CreditPackage model definition. Also update the Purchase workflow section (line ~843) which references `package.priceInCents`.

### SA-002 — Schema: `PricingConfig.updatedBy` documented but missing from Prisma schema
- **Severity:** LOW
- **File:** `docs/architecture.md` line ~304 vs `packages/db/prisma/schema.prisma` line 108-114
- **Description:** The architecture doc defines `PricingConfig` with an `updatedBy: string` field (email of the admin who changed it). The actual Prisma schema has no `updatedBy` field — only `id`, `key`, `value`, `createdAt`, `updatedAt`. The admin pricing PUT route does not record who made the change.
- **Suggested fix:** Either add `updatedBy String?` to the `PricingConfig` model and record the admin email on update, or remove the field from the architecture doc. Adding it improves auditability.

### SA-003 — Schema: `CreditTransaction` doc has fields not in Prisma schema
- **Severity:** MEDIUM
- **File:** `docs/architecture.md` lines 258-282 vs `packages/db/prisma/schema.prisma` lines 77-100
- **Description:** The architecture doc lists `pipelineType`, `assemblyAiCostUsd`, `elevenLabsCostUsd`, and `videoDurationSeconds` as fields of `CreditTransaction`. None of these exist in the actual Prisma schema. Additionally, the `deductCredits` function signature in `docs/architecture.md` (line ~491) accepts these in metadata, but the actual `DeductMetadata` interface in `packages/db/src/credits.ts` does not include them.
- **Suggested fix:** Remove these fields from the architecture doc (they appear to be planned for a future iteration), or add them to the schema if video-related cost tracking is needed.

### SA-004 — Seed data: Package credits/prices diverge from docs
- **Severity:** LOW
- **File:** `docs/architecture.md` line ~190-194 vs `packages/db/prisma/seed.ts` lines 62-64
- **Description:** The architecture doc specifies: Starter=100 credits/R$29.90, Pro=500 credits/R$99.90, Max=1200 credits/R$199.90. The seed creates: Starter=100/R$29.90, Pro=250/R$69.90, Max=600/R$149.90. The seed values were likely tuned post-documentation.
- **Suggested fix:** Update the architecture doc's credit package table to match actual seed values, or vice versa.

### SA-005 — API: `X-Credits-Used` header documented but never sent
- **Severity:** MEDIUM
- **File:** `docs/architecture.md` lines 425, 728, 837 vs `apps/web/src/app/api/chat/route.ts` lines 328-335
- **Description:** The architecture doc specifies two response headers: `X-Credits-Remaining` and `X-Credits-Used`. The chat API route only sends `X-Credits-Remaining` with the user's credits *before* deduction (set at line 333 before streaming begins). `X-Credits-Used` is never sent. The quiz/generate route also omits `X-Credits-Used`. Furthermore, `X-Credits-Remaining` shows the pre-deduction balance since the header is set before streaming starts, not the post-deduction balance as documented.
- **Suggested fix:** Since SSE headers are set before streaming begins and credits are deducted after streaming completes, the credit info is already embedded in the final SSE `done` event payload (`credits` field). Document this as the mechanism instead, or add trailer headers if the framework supports it.

### SA-006 — Missing `GET /api/conversations` route documentation in architecture
- **Severity:** LOW
- **File:** `docs/architecture.md` (API Specification section) vs `apps/web/src/app/api/conversations/route.ts`
- **Description:** The `GET /api/conversations` endpoint exists in code and lists all conversations for the authenticated user. This route is not documented in the API Specification section of the architecture doc.
- **Suggested fix:** Add documentation for `GET /api/conversations` in the API Specification section.

### SA-007 — Missing `GET /api/conversations/[id]/messages` route documentation
- **Severity:** LOW
- **File:** `docs/architecture.md` vs `apps/web/src/app/api/conversations/[conversationId]/messages/route.ts`
- **Description:** The `GET /api/conversations/[conversationId]/messages` endpoint exists but is not documented in the architecture doc's API Specification.
- **Suggested fix:** Add documentation for this endpoint.

### SA-008 — Missing `PATCH /api/quiz/session/[id]` route documentation
- **Severity:** LOW
- **File:** `docs/architecture.md` line ~698 vs `apps/web/src/app/api/quiz/session/[id]/route.ts` line 80
- **Description:** The architecture doc documents `GET /api/quiz/session/[id]` but the implementation also exports a `PATCH` handler for updating quiz session status (complete/abandon). This PATCH handler is undocumented.
- **Suggested fix:** Add documentation for `PATCH /api/quiz/session/[id]` in the API Specification.

### SA-009 — `Conversation` doc interface missing `quizSessionId`
- **Severity:** LOW
- **File:** `docs/architecture.md` lines 247-253
- **Description:** The first `Conversation` interface definition (lines 247-253) omits `quizSessionId`. It is only added in the "updated v9.0" section (lines 396-408). This dual definition can confuse developers reading the doc linearly.
- **Suggested fix:** Remove the first (outdated) definition and keep only the v9.0 version, or merge them.

### SA-010 — Admin metrics interface mismatch between doc and code
- **Severity:** MEDIUM
- **File:** `docs/architecture.md` lines 622-661 vs `packages/db/src/admin.ts`
- **Description:** The architecture doc specifies `getUserMetrics()` returning `usersWithoutCredits` (credits = 0) and `newUsers30d`. The implementation returns `lowBalanceUsers` (credits < 1, functionally the same but named differently) and `newUsersThisMonth`/`newUsersLastMonth` instead of a single `newUsers30d`. The `getUsageMetrics()` doc specifies `messagesToday`, `messages7d`, `topModel`, `topModelPercent`, `avgTokensPerMessage`, `messagesWithAttachments`, `messagesWithoutAttachments`. The implementation returns `totalTokens`, `tokensThisMonth`, `tokensLastMonth`, `totalMessages` — a significantly different structure. The `getFinancialMetrics()` doc specifies `grossProfitCents`, `grossMarginPercent`, `markupPercent`, `creditsSold`, `totalRetainedCredits`. The implementation returns `totalCreditsConsumed`, `totalAdjustmentCredits` — again significantly different.
- **Suggested fix:** Synchronize the architecture doc's admin metrics interface with the actual implementation in `packages/db/src/admin.ts`.

---

## 2. TECH-STACK VIOLATIONS

### SA-011 — `as unknown as` in Prisma singleton
- **Severity:** LOW
- **File:** `packages/db/src/index.ts` line 6
- **Description:** `const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }` uses `as unknown as`, which the PRD (NFR2) and architecture doc explicitly prohibit ("sem `as unknown`"). This is the standard Next.js Prisma singleton pattern, but it technically violates the stated rule.
- **Suggested fix:** This is a widely accepted pattern and the only instance in the codebase. Document it as an explicit exception in the architecture doc, or use a `declare global` approach:
  ```typescript
  declare global { var prisma: PrismaClient | undefined }
  ```

### SA-012 — `as` type assertions in quiz answer route
- **Severity:** LOW
- **File:** `apps/web/src/app/api/quiz/answer/route.ts` lines 84, 85, 90
- **Description:** Uses `as 'INITIAL' | 'AD_CREATIVE' | ...` and `as 'TEXT' | 'SINGLE_SELECT' | ...` type assertions after Zod validation. While functionally safe (Zod already validated the enum), these `as` casts bypass TypeScript's type checker.
- **Suggested fix:** Use Zod's `z.enum()` output type directly instead of casting. Since the values are already validated by Zod, the parsed output should already have the correct type.

### SA-013 — `as { status: string }` in quiz session PATCH handler
- **Severity:** MEDIUM
- **File:** `apps/web/src/app/api/quiz/session/[id]/route.ts` line 113
- **Description:** `const { status } = body as { status: string }` casts the request body without Zod validation. This is the only API route that parses a JSON body without Zod schema validation, violating the project's validation pattern and potentially allowing arbitrary input.
- **Suggested fix:** Add a Zod schema for the PATCH body:
  ```typescript
  const patchSchema = z.object({ status: z.enum(['COMPLETED', 'ABANDONED']) })
  ```

### SA-014 — Middleware does not protect `/onboarding`, `/quiz`, `/roteiros` pages
- **Severity:** HIGH
- **File:** `apps/web/src/middleware.ts` lines 7-10
- **Description:** The middleware only protects routes starting with `/dashboard`, `/chat`, `/credits`, and `/admin`. The `/onboarding`, `/quiz`, and `/roteiros` routes are NOT protected by middleware. While these pages use `auth()` in their Server Components, an unauthenticated user can still navigate to these URLs and see a loading state or error before being redirected. More critically, it means the middleware doesn't enforce authentication consistently.
- **Suggested fix:** Add `/onboarding`, `/quiz`, and `/roteiros` to the middleware's `isProtectedRoute` check:
  ```typescript
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/chat') ||
    req.nextUrl.pathname.startsWith('/credits') ||
    req.nextUrl.pathname.startsWith('/onboarding') ||
    req.nextUrl.pathname.startsWith('/quiz') ||
    req.nextUrl.pathname.startsWith('/roteiros') ||
    isAdminRoute;
  ```

### SA-015 — `conversations.ts` in packages/db is unused
- **Severity:** LOW
- **File:** `packages/db/src/conversations.ts`
- **Description:** The `conversations.ts` module exports `createConversation`, `getConversationWithMessages`, `listConversations`, and `addMessage`. However, no API route or page imports these functions — all conversation operations are done via direct `prisma.*` calls in the API routes. This is dead code that adds maintenance overhead and may diverge from actual usage patterns.
- **Suggested fix:** Either migrate API routes to use these repository functions (preferred — aligns with the "Repository Pattern" described in the architecture doc) or remove the dead code.

---

## 3. ROUTES WITHOUT AUTHENTICATION

### Route Authentication Audit

| Route | Methods | Auth Check | Classification |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handlers | PUBLIC (OK) |
| `/api/auth/register` | POST | None (public registration) | PUBLIC (OK) |
| `/api/webhooks/stripe` | POST | Stripe signature verification | PUBLIC (OK — webhook) |
| `/api/chat` | POST | `auth()` at line 35 | PROTECTED |
| `/api/conversations` | GET | `auth()` at line 6 | PROTECTED |
| `/api/conversations/[id]/messages` | GET | `auth()` at line 9 | PROTECTED |
| `/api/payments/checkout` | POST | `auth()` wrapper at line 12 | PROTECTED |
| `/api/admin/add-credits` | POST | `auth()` + ADMIN check | PROTECTED |
| `/api/admin/pricing` | GET, PUT | `auth()` + ADMIN check | PROTECTED |
| `/api/admin/packages` | GET, POST | `auth()` + ADMIN check | PROTECTED |
| `/api/admin/packages/[id]` | PUT | `auth()` + ADMIN check | PROTECTED |
| `/api/onboarding` | GET, POST | `auth()` at lines 21, 51 | PROTECTED |
| `/api/onboarding/[id]` | PUT, DELETE | `auth()` via helper at line 20 | PROTECTED |
| `/api/quiz` | GET, POST | `auth()` at lines 13, 75 | PROTECTED |
| `/api/quiz/answer` | POST | `auth()` at line 25 | PROTECTED |
| `/api/quiz/generate` | POST | `auth()` at line 31 | PROTECTED |
| `/api/quiz/session/[id]` | GET, PATCH | `auth()` at lines 10, 84 | PROTECTED |
| `/api/video/upload` | POST | `auth()` at line 19 | PROTECTED |
| `/api/video/status/[id]` | GET | `auth()` at line 10 | PROTECTED |

**Result:** All private routes correctly call `auth()`. No BLOCKER-level authentication gaps found. The three public routes (NextAuth handlers, register, Stripe webhook) are correctly public.

### SA-016 — Register route allows unlimited account creation (no rate limiting)
- **Severity:** HIGH
- **File:** `apps/web/src/app/api/auth/register/route.ts`
- **Description:** The registration endpoint has no rate limiting. An attacker could create thousands of accounts via automated requests. Combined with the `credits: 0` default, this is lower-impact than if free credits were given, but it still pollutes the user table and could be used for credential stuffing or email enumeration timing attacks.
- **Suggested fix:** Add rate limiting (e.g., by IP address, max 5 registrations per IP per hour). Consider using a middleware-based solution or an in-memory store like `lru-cache`.

---

## 4. PRODUCTION RISKS

### SA-017 — No rate limiting on any API route
- **Severity:** BLOCKER
- **File:** All files in `apps/web/src/app/api/`
- **Description:** Zero rate limiting exists anywhere in the codebase. No `rate-limit`, `lru-cache`, or similar dependency. Critical routes exposed:
  - `POST /api/chat` — each call triggers an OpenAI API call (costs real money)
  - `POST /api/quiz/generate` — same, potentially expensive prompts
  - `POST /api/auth/register` — unlimited account creation
  - `POST /api/video/upload` — disk write + AssemblyAI + OpenAI Vision calls
  - `POST /api/webhooks/stripe` — Stripe signature protects it, but no IP-level protection
- **Suggested fix:** Implement per-IP rate limiting at minimum on `/api/chat`, `/api/quiz/generate`, `/api/video/upload`, and `/api/auth/register`. Options: (a) use `next-rate-limit` or `upstash/ratelimit` middleware, (b) Nginx rate limiting in the Docker Compose reverse proxy, (c) custom in-memory rate limiter.

### SA-018 — Console.log leaks admin email addresses
- **Severity:** MEDIUM
- **File:** `apps/web/src/app/api/admin/pricing/route.ts` line 66, `apps/web/src/app/api/admin/add-credits/route.ts` lines 53-55, `apps/web/src/app/api/admin/packages/route.ts` line 54, `apps/web/src/app/api/admin/packages/[id]/route.ts` line 44
- **Description:** Multiple admin routes log `session.user.email` to stdout. In production, these logs may be stored in log aggregation systems accessible to wider teams or exposed in container logs. Example: `console.log(\`[Admin] Pricing config updated by ${session.user.email}:\`, body)`.
- **Suggested fix:** Use a structured logger (e.g., `pino`) with log levels. In production, either mask email addresses or use user IDs instead. At minimum, ensure log storage has appropriate access controls.

### SA-019 — Revenue calculation JOIN is fragile and incorrect for changed packages
- **Severity:** HIGH
- **File:** `packages/db/src/admin.ts` lines 200-216
- **Description:** Revenue is calculated by JOINing `CreditTransaction` with `CreditPackage` on `ct.amount = cp.credits`. This is fragile because: (1) if an admin changes a package's credit amount, historical transactions that matched the old value will no longer JOIN correctly, producing incorrect revenue figures; (2) two different packages could have the same credit amount, causing double-counting; (3) adjustment transactions have positive amounts that could accidentally match a package. The correct approach is to record the package ID and price in the transaction at purchase time.
- **Suggested fix:** Add `packageId String?` and `pricePaidCents Int?` fields to `CreditTransaction`. Populate them in the webhook handler. Calculate revenue directly from `SUM(pricePaidCents)` where `type = 'purchase'`. This is a schema change requiring a migration.

### SA-020 — GET /api/conversations returns ALL conversations without pagination
- **Severity:** MEDIUM
- **File:** `apps/web/src/app/api/conversations/route.ts` lines 19-27
- **Description:** The `GET /api/conversations` endpoint returns all conversations for a user without any pagination (`take` or `skip`). For power users with hundreds of conversations, this becomes a performance issue and a potential large payload.
- **Suggested fix:** Add pagination support: `?page=1&pageSize=20`, using `take` and `skip` in the Prisma query.

### SA-021 — GET /api/quiz returns ALL quiz sessions without pagination
- **Severity:** LOW
- **File:** `apps/web/src/app/api/quiz/route.ts` lines 89-106
- **Description:** The `GET /api/quiz` endpoint returns all quiz sessions for a user without pagination. Similar to SA-020 but likely lower volume since quiz sessions are created less frequently than conversations.
- **Suggested fix:** Add pagination support.

### SA-022 — Chat history loaded without limit could become expensive
- **Severity:** MEDIUM
- **File:** `apps/web/src/app/api/chat/route.ts` lines 148-152
- **Description:** The chat route loads previous messages with `take: 20`, which is reasonable. However, the architecture doc specifies "resumo das últimas 10 mensagens" (summary of last 10 messages). Using 20 messages instead of 10 doubles the token input cost for the credit gate calculation, effectively charging users more than necessary for long conversations.
- **Suggested fix:** Reduce `take` to 10 to match the documented behavior, or update the documentation. Consider implementing message summarization for very long conversations.

### SA-023 — Video processing has no credit check
- **Severity:** HIGH
- **File:** `apps/web/src/app/api/video/upload/route.ts`
- **Description:** The video upload route triggers background processing that makes multiple OpenAI API calls (frame analysis via GPT-4o Vision + structure consolidation via GPT-4o) without any credit check or deduction. These calls cost real money but are not metered to the user. A user with 0 credits could upload a video and consume significant OpenAI API resources.
- **Suggested fix:** Either (a) add a credit gate before starting video processing (estimate cost based on video duration), or (b) deduct credits as part of the quiz/generate flow and include video processing cost in the gate calculation. At minimum, check that the user has a positive credit balance before accepting a video upload.

### SA-024 — Video upload has no concurrent processing limit
- **Severity:** MEDIUM
- **File:** `apps/web/src/app/api/video/upload/route.ts` line 128
- **Description:** The video processing is fire-and-forget (`processVideo(videoPath, videoAnalysis.id).catch(...)`) with no limit on concurrent processing. A user could upload multiple videos simultaneously, consuming disk space, memory, and OpenAI API quota. There is no check for existing in-progress analyses for the same quiz session.
- **Suggested fix:** (a) Check for existing QUEUED/PROCESSING VideoAnalysis for the quiz session before creating a new one. (b) Implement a processing queue with a concurrency limit (e.g., max 3 concurrent video processing jobs).

### SA-025 — Hardcoded password in seed script
- **Severity:** LOW
- **File:** `packages/db/prisma/seed.ts` line 31
- **Description:** The seed script contains a hardcoded password `'dev12345'` for the dev user. While the seed script has a production guard (`process.env.NODE_ENV === 'production'` check), this password could be committed to a public repository or used accidentally in staging environments.
- **Suggested fix:** Use an environment variable for the seed password: `process.env.DEV_SEED_PASSWORD ?? 'dev12345'`, and document in `.env.example`.

### SA-026 — No CSRF protection on state-changing API routes
- **Severity:** MEDIUM
- **File:** All POST/PUT/DELETE API routes
- **Description:** The API routes rely solely on JWT session cookies for authentication. There is no CSRF token validation. While `SameSite` cookie policy provides some protection in modern browsers, older browsers or misconfigured cookie settings could be vulnerable.
- **Suggested fix:** NextAuth v5 includes CSRF protection for its own routes, but custom API routes should validate the `Origin` or `Referer` header, or implement CSRF tokens. At minimum, verify that session cookies are set with `SameSite: Lax` or `Strict`.

### SA-027 — `X-Credits-Remaining` header leaks pre-deduction balance
- **Severity:** LOW
- **File:** `apps/web/src/app/api/chat/route.ts` line 333
- **Description:** The `X-Credits-Remaining` header is set to `String(user.credits)` *before* the streaming and deduction occur. This means the client receives the pre-deduction balance, not the actual remaining balance. The real balance is sent in the SSE `done` event payload. This is misleading but not a security issue since the user's own balance is not sensitive to them.
- **Suggested fix:** Either remove the header (the SSE `done` event already contains the correct balance) or document this behavior clearly.

### SA-028 — Stripe webhook does not verify user exists before adding credits
- **Severity:** LOW
- **File:** `apps/web/src/app/api/webhooks/stripe/route.ts` lines 52-56
- **Description:** The webhook calls `addCredits(userId, ...)` using the `userId` from Stripe session metadata. If the user was deleted between purchase and webhook delivery, `addCredits` would try to update a non-existent user and throw an unhandled Prisma error (the `user.update` in `addCredits` would fail). This is an edge case but could cause webhook processing failures.
- **Suggested fix:** Add a user existence check before calling `addCredits`, or handle the Prisma `P2025` (record not found) error in the webhook handler.

### SA-029 — `formData.get('video') as File | null` unsafe cast
- **Severity:** LOW
- **File:** `apps/web/src/app/api/video/upload/route.ts` line 34
- **Description:** `const video = formData.get('video') as File | null` is an unsafe cast. `formData.get()` returns `FormDataEntryValue | null` which could be a string. While `instanceof File` check would be safer, the current code proceeds directly with `.type`, `.size`, and `.arrayBuffer()` which would fail at runtime if a string were passed.
- **Suggested fix:** Add explicit type checking:
  ```typescript
  const videoEntry = formData.get('video')
  if (!videoEntry || !(videoEntry instanceof File)) {
    return Response.json({ error: 'Campo video é obrigatório' }, { status: 400 })
  }
  ```

### SA-030 — N+1 pattern in video frame analysis
- **Severity:** MEDIUM
- **File:** `apps/web/src/lib/video/processor.ts` lines 157-185
- **Description:** The `describeFrames` function makes sequential OpenAI API calls — one per frame (up to 10 frames). Each call is a separate HTTP request with full round-trip latency. This N+1 pattern means 10 frames = 10 sequential API calls, significantly increasing processing time (potentially 30-60 seconds just for frame description).
- **Suggested fix:** Batch frames into a single multi-image OpenAI request (GPT-4o Vision supports multiple images in one message). This reduces N API calls to 1, significantly improving processing time and reducing overhead.

### SA-031 — Sensitive data in InsufficientBalanceError message
- **Severity:** LOW
- **File:** `packages/db/src/credits.ts` lines 20-25
- **Description:** `InsufficientBalanceError` includes the userId in its message: `Créditos insuficientes: usuário ${userId} tem ${current} créditos, necessário ${required}`. This error message is logged via `console.warn` in the chat route. While not a major concern (server-side only), the userId is internal data that should be treated as potentially sensitive.
- **Suggested fix:** Omit userId from the error message or mask it. The userId is available from the calling context if needed for debugging.

### SA-032 — No input length validation on `answerValue` in quiz answer route
- **Severity:** MEDIUM
- **File:** `apps/web/src/app/api/quiz/answer/route.ts` line 17
- **Description:** The `answerValue` field in the Zod schema is `z.string()` with no maximum length. An attacker could submit megabytes of text as an answer value, which would be stored in the database (`@db.Text` has no limit) and later included in the prompt for script generation, potentially causing expensive token consumption.
- **Suggested fix:** Add `.max(5000)` or a similar reasonable limit to `answerValue` in the Zod schema.

### SA-033 — Video upload does not check for existing VideoAnalysis before creating a new one
- **Severity:** MEDIUM
- **File:** `apps/web/src/app/api/video/upload/route.ts` lines 118-125
- **Description:** The `prisma.videoAnalysis.create()` at line 119 does not check if a VideoAnalysis already exists for the quiz session. The schema has `quizSessionId String @unique` on VideoAnalysis, so a second upload for the same quiz session will throw a Prisma unique constraint error (P2002) which is not caught. This returns a 500 error instead of a meaningful message.
- **Suggested fix:** Use `upsert` or check for existing VideoAnalysis and either reject the duplicate or delete the old one before creating a new one.

### SA-034 — Checkout route uses `payment_method_types: ['card']` — missing PIX
- **Severity:** MEDIUM
- **File:** `apps/web/src/app/api/payments/checkout/route.ts` line 51
- **Description:** The Stripe Checkout session is created with `payment_method_types: ['card']` only. The PRD (FR8) specifies "Stripe Checkout (cartao e PIX)" and the buy page UI mentions "Pagamento via cartao de credito" only. PIX is a critical payment method for the Brazilian market and was explicitly required.
- **Suggested fix:** Add PIX support: `payment_method_types: ['card', 'boleto']` or use Stripe's automatic payment methods. Note: Stripe PIX in Brazil uses `pix` type (available since 2022). Update to: `payment_method_types: ['card', 'pix']` and ensure the Stripe account has PIX enabled.

---

## Summary

| Severity | Count | IDs |
|---|---|---|
| **BLOCKER** | 1 | SA-017 |
| **HIGH** | 4 | SA-014, SA-016, SA-019, SA-023 |
| **MEDIUM** | 11 | SA-001, SA-003, SA-005, SA-010, SA-013, SA-018, SA-020, SA-022, SA-024, SA-026, SA-030, SA-032, SA-033, SA-034 |
| **LOW** | 11 | SA-002, SA-004, SA-006, SA-007, SA-008, SA-009, SA-011, SA-012, SA-015, SA-021, SA-025, SA-027, SA-028, SA-029, SA-031 |
| **TOTAL** | **34** | |

### Priority Actions

1. **BLOCKER — SA-017:** Implement rate limiting on public-facing and cost-generating routes (`/api/chat`, `/api/quiz/generate`, `/api/video/upload`, `/api/auth/register`). This is the single most critical finding — without it, a malicious actor can drain the OpenAI API budget.

2. **HIGH — SA-023:** Add credit verification to the video upload/processing pipeline. Currently, video processing burns OpenAI API credits without any user credit check.

3. **HIGH — SA-019:** Fix the revenue calculation JOIN. The current approach will produce incorrect financial metrics as soon as a package's credit amount changes.

4. **HIGH — SA-014:** Extend middleware to cover `/onboarding`, `/quiz`, and `/roteiros` for consistent authentication enforcement.

5. **HIGH — SA-016:** Add rate limiting to the registration endpoint to prevent automated account creation.
