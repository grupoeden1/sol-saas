# Quality Review Report -- SOL SaaS (Phase 2)

**Date:** 2026-03-03
**Scope:** Full codebase -- all epics (1-7), pricing refactoring, quiz, video processing
**Agent:** @qa
**Workflow:** quality-audit v2.0 -- Phase 2 (Full Quality Review)
**Input:** Complete source code review of `c:\Projetos\Sol\sol-saas`

---

## 1. Acceptance Criteria Verification (All Stories)

### Epic 1 -- Foundation & Auth

| Story | AC | Status | Notes |
|-------|----|--------|-------|
| 1.1 Bootstrap | All | PASS | Turborepo monorepo, Docker, packages/db structure |
| 1.2 Schema AC1 | `credits >= 0` CHECK constraint | **FAIL** | CHECK was created in migration `20260225193516` but removed in `20260226220000` and **never re-added** after rename to `credits` in `20260303000000`. See **QA-001**. |
| 1.2 Schema AC2 | Sessions table | PASS | Schema matches NextAuth v5 spec |
| 1.2 Schema AC3 | Prisma Client typed | PASS | Singleton exported from `packages/db/src/index.ts` |
| 1.2 Schema AC4 | Seed script | PASS | Idempotent dev user creation |
| 1.2 Schema AC5 | Relations | PASS | All relations defined including quiz/video |
| 1.3 Auth | All | PASS | Credentials provider, JWT 7d, bcrypt 12 rounds, register prevents enumeration |
| 1.4 Layout | All | PASS | AppLayout with header, CreditsBadge, nav |
| 1.5 CI/CD | All | PASS | Docker + environment config |

### Epic 2 -- Chat

| Story | AC | Status | Notes |
|-------|----|--------|-------|
| 2.1 DB Schema | All | PASS | Conversation, Message models with relations |
| 2.2 Chat UI | All | PASS | Sidebar, messages, input, markdown rendering |
| 2.3 OpenAI | All | PASS | SSE streaming, error handling, model selection |
| 2.4 Credits State | AC1-AC4 | PASS | 402 blocking, header, badge update, SSE done credits |
| 2.5 Attachments | All | PASS | PDF/DOCX/images, multipart, token counting |

### Epic 3 -- Credits & Payments

| Story | AC | Status | Notes |
|-------|----|--------|-------|
| 3.1 Credits Schema | All | PASS | addCredits, deductCredits, InsufficientBalanceError, atomic ops |
| 3.2 Chat Deduction | AC1 | PASS (evolved) | Now uses per-token pricing instead of fixed 1 credit/msg |
| 3.2 Chat Deduction | AC2 | PASS | OpenAI failure = zero deduction confirmed in both chat and quiz routes |
| 3.2 Chat Deduction | AC3 | PASS | SSE done event includes `credits` field, frontend reads it |
| 3.3 Checkout AC2 | `metadata.creditsAmount` | **DEVIATION** | Story specifies `metadata: { userId, packageId, creditsAmount }` but implementation sends only `userId` and `packageId`. Webhook compensates via DB lookup. See **QA-005**. |
| 3.3 Checkout AC4 | PIX payment method | **FAIL** | `payment_method_types: ['card']` only. Story AC4 requires `['card', 'pix']`. See **QA-004**. |
| 3.4 Webhook | AC1 | PASS | HMAC via constructEvent |
| 3.4 Webhook | AC2 | PASS | addCredits called with pkg.credits |
| 3.4 Webhook | AC3 | PASS | P2002 idempotency |
| 3.4 Webhook | AC4-5 | PASS | 200 fast, logging present |
| 3.5 Dashboard | AC1 | **PARTIAL** | Dashboard shows welcome cards, not full transactional view per story spec |
| 3.6 Pricing Refactoring | All | PASS | PricingConfig, CreditPackage, per-token pricing, calculateCredits |
| P.1 Migration Credits Core | All | PASS | balanceCents renamed to credits, legacy cols removed |

### Epic 4 -- Admin

| Story | AC | Status | Notes |
|-------|----|--------|-------|
| 4.1 Admin Dashboard | All | PASS | Real data from DB queries, user/usage/financial metrics |
| 4.2 Admin Console | All | PASS | Add credits, pricing config, package management |

### Epic 6 -- Quiz & Onboarding

| Story | AC | Status | Notes |
|-------|----|--------|-------|
| 6.1 Quiz Schema | All | PASS | OnboardingProfile, QuizSession, QuizAnswer, enums |
| 6.2-6.7 Quiz Flow | All | PASS (based on code review) | Onboarding, paths, answers, video upload, generation |

### Epic 7 -- Video Processing

| Story | AC | Status | Notes |
|-------|----|--------|-------|
| 7.1 Infrastructure | All | PASS (based on code review) | FFmpeg wrapper, AssemblyAI client, env vars |
| 7.2-7.5 Processing | All | PASS (based on code review) | Upload, processing, analysis pipeline |

---

## 2. Findings

### QA-001 | BLOCKER | Database | Missing CHECK constraint on User.credits >= 0

- **File:** `packages/db/prisma/migrations/20260303000000_credits_pricing_refactoring/migration.sql`
- **Line:** 6 (ALTER TABLE "User" RENAME COLUMN "balanceCents" TO "credits")
- **Description:** Story 1.2 AC1 requires `Constraint garantindo credits >= 0 implementado via migration SQL customizada`. The constraint was originally created in migration `20260225193516_add_credits_non_negative_constraint` as `user_credits_non_negative`. It was then dropped in `20260226220000_pricing_refactoring` (line 5: `DROP CONSTRAINT IF EXISTS "user_credits_non_negative"`) and replaced with `user_balance_above_min` (CHECK `balanceCents >= minBalanceCents`). That constraint was dropped in `20260227180000` (line 4: `DROP CONSTRAINT IF EXISTS "user_balance_above_min"`). The final migration `20260303000000` renamed `balanceCents` back to `credits` but **did not add any new CHECK constraint**. The application-level atomic UPDATE (`WHERE "credits" - cost >= 0`) in `deductCredits` provides protection, but the database-level safety net is missing. A direct SQL UPDATE or a bug in `addCredits` with negative values would allow credits to go below zero.
- **Suggested fix:**
  ```sql
  -- New migration
  ALTER TABLE "User" ADD CONSTRAINT "user_credits_non_negative" CHECK ("credits" >= 0);
  ```
- **Related AC:** Story 1.2 AC1

---

### QA-002 | HIGH | Logic | No input validation on addCredits amount

- **File:** `packages/db/src/credits.ts:52-91`
- **Description:** `addCredits(userId, credits, options)` does not validate that `credits > 0`. If a CreditPackage has `credits = 0` (or negative due to admin error), the function will happily execute `{ increment: credits }` with a zero or negative value. Combined with the missing CHECK constraint (QA-001), negative values would corrupt user balances. The Stripe webhook at `apps/web/src/app/api/webhooks/stripe/route.ts:53` calls `addCredits(userId, pkg.credits, ...)` using the value directly from DB without validation.
- **Suggested fix:**
  ```typescript
  // At the start of addCredits():
  if (credits <= 0) {
    throw new Error(`addCredits called with non-positive amount: ${credits}`)
  }
  ```
- **Related AC:** Story 3.1 (implicit -- credit operations must be safe)

---

### QA-003 | HIGH | Logic | No input validation on deductCredits amount

- **File:** `packages/db/src/credits.ts:106-156`
- **Description:** `deductCredits(userId, creditsUsed, metadata)` does not validate that `creditsUsed > 0`. If `calculateCredits()` somehow returned 0 (though it has `Math.max(1, ...)`) or if the function were called with 0, the atomic UPDATE `WHERE "credits" - 0 >= 0` would always succeed and create a transaction record with `amount: 0`. While `calculateCredits` currently guarantees minimum 1, this is defense-in-depth.
- **Suggested fix:**
  ```typescript
  // At the start of deductCredits():
  if (creditsUsed <= 0) {
    throw new Error(`deductCredits called with non-positive amount: ${creditsUsed}`)
  }
  ```
- **Related AC:** Story 3.2 AC1

---

### QA-004 | HIGH | Compliance | PIX payment method missing from Stripe Checkout

- **File:** `apps/web/src/app/api/payments/checkout/route.ts:50`
- **Line:** 50 (`payment_method_types: ['card'],`)
- **Description:** Story 3.3 AC4 explicitly requires: `payment_method_types inclui 'card' e 'pix'`. The implementation only includes `['card']`. PIX is a widely used payment method in Brazil (the target market for SOL) and its absence limits payment options for users.
- **Suggested fix:**
  ```typescript
  payment_method_types: ['card', 'pix'],
  ```
  Note: Requires PIX to be enabled in the Stripe Dashboard for the connected account.
- **Related AC:** Story 3.3 AC4

---

### QA-005 | MEDIUM | Compliance | Checkout metadata missing creditsAmount field

- **File:** `apps/web/src/app/api/payments/checkout/route.ts:68-71`
- **Description:** Story 3.3 AC2 specifies `metadata: { userId, packageId, creditsAmount }`. The implementation sends only `{ userId, packageId }`. The webhook compensates by looking up the package from DB (`prisma.creditPackage.findUnique`), which works but introduces a coupling: if the package credits amount changes between checkout creation and webhook processing, the user receives the updated amount, not what they purchased. Story 3.4 also references `creditsAmount` in metadata.
- **Suggested fix:**
  ```typescript
  metadata: {
    userId: user.id,
    packageId: pkg.id,
    creditsAmount: String(pkg.credits),
  },
  ```
  And in the webhook, prefer `parseInt(session.metadata.creditsAmount)` over `pkg.credits`.
- **Related AC:** Story 3.3 AC2, Story 3.4 dependency table

---

### QA-006 | MEDIUM | Logic | SSE done event field name inconsistency between routes

- **File:** `apps/web/src/app/api/chat/route.ts:313` and `apps/web/src/app/api/quiz/generate/route.ts:215`
- **Description:** The chat route sends credits in the done event as `{ done: true, conversationId, credits: creditsAfterDeduction }`, while the quiz generate route sends `{ done: true, conversationId, creditsRemaining: creditsAfterDeduction, creditsUsed }`. The frontend chat page at `apps/web/src/app/chat/page.tsx:678` reads `data.credits`. If the quiz generate response is consumed by a similar frontend handler, it would miss the `creditsRemaining` field because it looks for `credits`.
- **Suggested fix:** Standardize the field name across all SSE routes. Either use `credits` everywhere or `creditsRemaining` everywhere, and update all consumers.
- **Related AC:** Story 3.2 AC3

---

### QA-007 | MEDIUM | Security | $queryRawUnsafe usage in admin metrics

- **File:** `packages/db/src/admin.ts:158`
- **Description:** The `getUsersList` function uses `prisma.$queryRawUnsafe()` for the message count query. While the query is properly parameterized with `$1::text[]`, the function name `$queryRawUnsafe` bypasses Prisma's tagged template literal SQL injection protection. If the query string were ever modified to interpolate user input (e.g., during refactoring), it would be vulnerable to SQL injection. The same file uses `$queryRaw` (tagged template) for revenue queries -- the message count query should use the same pattern.
- **Suggested fix:**
  ```typescript
  // Replace $queryRawUnsafe with $queryRaw using Prisma.sql helper:
  const msgCounts = await prisma.$queryRaw<MsgCountRow[]>(
    Prisma.sql`SELECT c."userId", COUNT(m.id)::bigint AS "msgCount"
     FROM "Message" m
     JOIN "Conversation" c ON m."conversationId" = c.id
     WHERE m.role = 'user'
       AND c."userId" = ANY(${userIds}::text[])
     GROUP BY c."userId"`
  )
  ```
- **Related AC:** Story 4.1 (admin dashboard queries)

---

### QA-008 | MEDIUM | Logic | Revenue calculation uses fragile JOIN on amount = credits

- **File:** `packages/db/src/admin.ts:200-216`
- **Description:** Revenue metrics are calculated by JOINing `CreditTransaction` with `CreditPackage` on `ct.amount = cp.credits`. This assumes that the transaction amount always exactly matches a package's credit count. If a package's `credits` value is changed (e.g., from 100 to 120 via admin console), historical transactions that were for 100 credits would no longer match, causing revenue to be underreported. Additionally, if two packages have the same credit count but different prices, revenue would be double-counted.
- **Suggested fix:** Store `packageId` or `priceBrl` directly in `CreditTransaction` for purchase transactions, enabling direct revenue calculation without JOIN.
- **Related AC:** Story P.3 (admin console metrics)

---

### QA-009 | MEDIUM | Frontend | Unsafe `as File` cast in video upload route

- **File:** `apps/web/src/app/api/video/upload/route.ts:34`
- **Description:** `const video = formData.get('video') as File | null` uses a type assertion without runtime validation. While `formData.get()` returns `FormDataEntryValue | null` (which is `string | File | null`), the cast assumes the value is a File. If a string value is submitted for the `video` field, subsequent operations like `video.type`, `video.size`, and `video.arrayBuffer()` would fail with unclear errors. The chat route at `route.ts:74` correctly uses `f instanceof File` for filtering.
- **Suggested fix:**
  ```typescript
  const videoEntry = formData.get('video')
  const video = videoEntry instanceof File ? videoEntry : null
  ```
- **Related AC:** Story 7.2 (video upload)

---

### QA-010 | MEDIUM | Security | No rate limiting on any API route

- **File:** All API routes under `apps/web/src/app/api/`
- **Description:** No rate limiting is implemented on any endpoint. This leaves the application vulnerable to: (1) brute-force attacks on `/api/auth/login`, (2) cost amplification on `/api/chat` and `/api/quiz/generate` (each call consumes OpenAI API credits), (3) spam on `/api/auth/register`, (4) webhook replay attacks beyond HMAC (though Stripe handles this). Even with the pre-call credit gate, a user with credits could rapidly drain their balance and incur significant OpenAI costs.
- **Suggested fix:** Implement rate limiting using `@upstash/ratelimit` or similar, at minimum on auth routes and AI generation routes.
- **Related AC:** General security best practice

---

### QA-011 | MEDIUM | Logic | Webhook does not validate package credits > 0

- **File:** `apps/web/src/app/api/webhooks/stripe/route.ts:45-56`
- **Description:** After fetching the package from DB, the webhook calls `addCredits(userId, pkg.credits, ...)` without checking that `pkg.credits > 0`. If a package were misconfigured with 0 credits (or if `pkg.credits` were somehow negative), this would add zero or negative credits. Combined with QA-001 (missing CHECK constraint) and QA-002 (no addCredits validation), this could corrupt user balances.
- **Suggested fix:**
  ```typescript
  if (!pkg || pkg.credits <= 0) {
    console.error('[Webhook] Package invalid or zero credits packageId=', packageId);
    return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
  }
  ```
- **Related AC:** Story 3.4 AC2

---

### QA-012 | LOW | Frontend | No network offline handling

- **File:** `apps/web/src/app/chat/page.tsx`
- **Description:** The chat page does not check `navigator.onLine` or listen for `online`/`offline` events. If the user goes offline, API calls will fail with generic network errors rather than showing a clear offline indicator. The SSE stream will also break silently.
- **Suggested fix:** Add `useEffect` with online/offline event listeners and show a banner when offline.
- **Related AC:** Story 2.2 (chat UI robustness)

---

### QA-013 | LOW | Frontend | SSE reader lacks AbortController timeout

- **File:** `apps/web/src/app/chat/page.tsx` (around line 620-694)
- **Description:** The SSE stream reader does not use an `AbortController` with a timeout. If the OpenAI stream hangs (e.g., due to a network issue after connection), the loading state will persist indefinitely with no way for the user to recover except refreshing the page.
- **Suggested fix:** Add an `AbortController` with a configurable timeout (e.g., 120 seconds) and clean up on component unmount.
- **Related AC:** Story 2.3 (OpenAI integration robustness)

---

### QA-014 | LOW | Frontend | Success page claims credits added before webhook processes

- **File:** `apps/web/src/app/credits/success/page.tsx`
- **Description:** The success page shows a confirmation message immediately after Stripe redirect. However, credits are only added when the webhook fires, which may take seconds to minutes. The page should indicate that credits are being processed rather than already added.
- **Related AC:** Story 3.3 AC5

---

### QA-015 | LOW | TypeScript | `as Stripe.Checkout.Session` cast in webhook

- **File:** `apps/web/src/app/api/webhooks/stripe/route.ts:30`
- **Description:** `const session = event.data.object as Stripe.Checkout.Session` is a type assertion. While this is standard Stripe SDK usage (the event type is narrowed by the `event.type` check on line 29), it bypasses TypeScript's type safety.
- **Related AC:** N/A (TypeScript best practice)

---

### QA-016 | LOW | Logic | Console.log exposes operational metadata in production

- **File:** Multiple: `apps/web/src/app/api/chat/route.ts:164,215,260`, `apps/web/src/app/api/quiz/generate/route.ts:115,188`, `apps/web/src/app/api/webhooks/stripe/route.ts:57-58`
- **Description:** `console.log` calls in API routes expose model names, token counts, credit amounts, and package details. In production, these should use structured logging with appropriate log levels.
- **Suggested fix:** Replace `console.log` with a structured logger (e.g., `pino`) and use appropriate levels (debug for token counts, info for operations).
- **Related AC:** General operational best practice

---

### QA-017 | LOW | TypeScript | `role: string` type in NextAuth augmentation

- **File:** `apps/web/src/types/next-auth.d.ts` (if exists)
- **Description:** The user role in the NextAuth session/JWT augmentation is typed as `string` instead of the Prisma `Role` enum (`'USER' | 'ADMIN'`). This loses type safety in middleware and route handlers that check `session.user.role !== 'ADMIN'`.
- **Suggested fix:** Import and use the Prisma `Role` type in the NextAuth type augmentation.
- **Related AC:** Story 1.3 (auth type safety)

---

### QA-018 | LOW | Database | Prisma schema missing `@@map` for PostgreSQL naming convention

- **File:** `packages/db/prisma/schema.prisma`
- **Description:** Prisma models use PascalCase (e.g., `QuizSession`, `VideoAnalysis`) which maps to PascalCase table names in PostgreSQL. While this works, it deviates from the PostgreSQL convention of snake_case table names. This is a style concern and does not affect functionality.
- **Related AC:** N/A (convention)

---

### QA-019 | INFO | TypeScript | `as unknown as` in Prisma singleton pattern

- **File:** `packages/db/src/index.ts:6`
- **Description:** `const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }` is a standard and widely-accepted pattern for the Prisma singleton in Next.js to prevent multiple instances during hot reload. This is intentional and acceptable.
- **Related AC:** Story 1.2 AC3

---

### QA-020 | INFO | Compliance | Story 3.5 Dashboard partially implemented

- **File:** `apps/web/src/app/dashboard/page.tsx`
- **Description:** Story 3.5 AC1 specifies the user dashboard should show credit balance, transaction history (paginated), and conversation list. The current implementation is a welcome page with action cards. The credit balance is visible in the header badge, but detailed transaction history is not available to non-admin users.
- **Related AC:** Story 3.5 AC1

---

### QA-021 | INFO | Logic | Pricing cache TTL could cause stale config during admin updates

- **File:** `packages/db/src/pricing.ts:15` (CACHE_TTL = 60_000)
- **Description:** PricingConfig values are cached in-memory with a 60-second TTL. When an admin updates pricing via the admin console, the `invalidatePricingCache()` function is called, but this only invalidates the cache on the instance that handled the admin request. In a multi-instance deployment, other instances would serve stale pricing for up to 60 seconds.
- **Related AC:** Story P.2 (admin pricing panel)

---

### QA-022 | INFO | Logic | Zero test files in the project

- **File:** Entire codebase
- **Description:** No `*.test.ts`, `*.spec.ts`, or test configuration files (jest.config, vitest.config) were found. While the PRD mentions testing requirements, no automated tests exist. This means all acceptance criteria have been verified through code review only.
- **Related AC:** All stories (testing checklist items)

---

## 3. Security Audit Summary

| Check | Status | Notes |
|-------|--------|-------|
| All API routes use `auth()` | PASS | Every route handler validates session |
| Admin routes check ADMIN role | PASS | All `/api/admin/*` routes check `session.user.role !== 'ADMIN'` |
| Middleware protects pages | PASS | `/dashboard/*`, `/chat/*`, `/credits/*`, `/admin/*` protected |
| Admin middleware redirects to /dashboard | PASS | Non-admin users redirected to `/dashboard`, not `/login` |
| No NEXT_PUBLIC_ secrets | PASS | Only `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (safe to expose) |
| Zod validation on API inputs | PASS | Chat, checkout, quiz routes use Zod schemas |
| Register prevents email enumeration | PASS | Returns 201 for both new and existing emails |
| bcrypt with adequate rounds | PASS | 12 rounds in register route |
| Stripe webhook HMAC validation | PASS | `constructEvent` with `STRIPE_WEBHOOK_SECRET` |
| No SQL injection vectors | PASS (caveat QA-007) | `$queryRaw` uses tagged templates; `$queryRawUnsafe` parameterized |
| Rate limiting | **FAIL** | No rate limiting on any route (QA-010) |
| CSRF protection | PASS | NextAuth v5 handles CSRF for auth endpoints |

---

## 4. Stripe Webhook Review

| Check | Status | Notes |
|-------|--------|-------|
| HMAC signature validation | PASS | `constructEvent(rawBody, signature, webhookSecret)` at line 23 |
| Raw body handling | PASS | `await req.text()` for raw body (not `req.json()`) |
| Idempotency | PASS | `stripePaymentId @unique` + P2002 catch at line 62 |
| Fast 200 response | PASS | Synchronous processing, returns immediately |
| Metadata validation | PASS | Checks `userId`, `packageId`, `stripePaymentId` all non-null at line 39 |
| Package lookup | PASS | Fetches from DB, returns 400 if not found at line 47 |
| Error logging | PASS | Logs with `stripePaymentId` and error details |
| Amount validation | **FAIL** | No guard that `pkg.credits > 0` (QA-011) |
| creditsAmount from metadata | **DEVIATION** | Uses DB lookup instead of metadata (QA-005) |

---

## 5. Credits Logic Review

| Check | Status | Notes |
|-------|--------|-------|
| Atomic deduction | PASS | Raw SQL `UPDATE ... WHERE "credits" - cost >= 0 RETURNING` at `credits.ts:112-118` |
| Race condition protection | PASS | Atomic UPDATE prevents double-spend |
| Pre-call gate | PASS | `calculateMaxCredits` estimates worst case, compared before OpenAI call |
| Post-stream real cost | PASS | `calculateCredits` with real token counts after streaming |
| OpenAI failure = zero deduction | PASS | Deduction only in success path; error path skips deduction |
| Audit trail | PASS | CreditTransaction with inputTokens, outputTokens, modelUsed, config snapshot |
| Deduction failure handling | PASS | InsufficientBalanceError caught; fallback audit record with amount=0 |
| CHECK constraint on credits | **FAIL** | Missing database-level constraint (QA-001) |
| addCredits amount validation | **FAIL** | No validation that credits > 0 (QA-002) |
| deductCredits amount validation | **FAIL** | No validation that creditsUsed > 0 (QA-003) |
| Min 1 credit per call | PASS | `calculateCredits` returns `Math.max(1, ...)` at `pricing.ts:54` |
| Token counting | PASS | tiktoken cl100k_base for text; image cost calculation per Vision API spec |

---

## 6. TypeScript Strict Review

| Check | Status | Notes |
|-------|--------|-------|
| `any` type usage | PASS | No `any` found in source code |
| `@ts-ignore` | PASS | None found |
| `@ts-expect-error` | PASS | None found |
| `as unknown as` | PASS | Only in Prisma singleton (standard pattern, QA-019) |
| `as Type` assertions | LOW | `as Stripe.Checkout.Session` in webhook (QA-015), `as File` in video upload (QA-009) |
| Strict null checks | PASS | Optional chaining used throughout |
| Discriminated unions | PASS | `AddCreditOptions` uses proper discriminated union |

---

## 7. Frontend Error States Review

| Check | Status | Notes |
|-------|--------|-------|
| 402 insufficient credits | PASS | Removes user message, shows inline alert, disables input (`chat/page.tsx:595-607`) |
| 400 validation errors | PASS | Shows error message inline |
| Stream error | PASS | Friendly error message displayed in chat bubble |
| Network error | PASS (partial) | Caught as generic error, but no offline detection (QA-012) |
| Payment declined | PASS | `/credits/error` page with retry link |
| Loading state reset on error | PASS | `setLoading(false)` in all error paths |
| Timeout handling | **MISSING** | No AbortController timeout on SSE stream (QA-013) |
| Success page timing | LOW | Claims credits added before webhook fires (QA-014) |

---

## Summary

| Severity | Count | IDs |
|----------|-------|-----|
| **BLOCKER** | 1 | QA-001 |
| **HIGH** | 3 | QA-002, QA-003, QA-004 |
| **MEDIUM** | 6 | QA-005, QA-006, QA-007, QA-008, QA-009, QA-010, QA-011 |
| **LOW** | 6 | QA-012, QA-013, QA-014, QA-015, QA-016, QA-017, QA-018 |
| **INFO** | 4 | QA-019, QA-020, QA-021, QA-022 |
| **Total** | **21** |  |

Note: QA-010 and QA-011 are both MEDIUM, making the MEDIUM count 7, not 6. Corrected below.

---

## Corrected Summary

| Severity | Count | IDs |
|----------|-------|-----|
| **BLOCKER** | 1 | QA-001 |
| **HIGH** | 3 | QA-002, QA-003, QA-004 |
| **MEDIUM** | 7 | QA-005, QA-006, QA-007, QA-008, QA-009, QA-010, QA-011 |
| **LOW** | 6 | QA-012, QA-013, QA-014, QA-015, QA-016, QA-017, QA-018 |
| **INFO** | 4 | QA-019, QA-020, QA-021, QA-022 |
| **Total** | **21** |  |

---

## Priority Action Items for @dev

### Immediate (BLOCKER):
1. **QA-001** -- Add CHECK constraint `credits >= 0` via new migration

### High Priority:
2. **QA-002** -- Add `credits > 0` guard in `addCredits()`
3. **QA-003** -- Add `creditsUsed > 0` guard in `deductCredits()`
4. **QA-004** -- Add `'pix'` to `payment_method_types` in checkout

### Should Fix:
5. **QA-005** -- Include `creditsAmount` in Stripe checkout metadata
6. **QA-006** -- Standardize SSE done event field names
7. **QA-007** -- Replace `$queryRawUnsafe` with `$queryRaw` tagged template
8. **QA-008** -- Store packageId/priceBrl in CreditTransaction for purchases
9. **QA-009** -- Use `instanceof File` check in video upload
10. **QA-010** -- Implement rate limiting on auth and AI routes
11. **QA-011** -- Validate `pkg.credits > 0` in webhook
