# Codebase Map & Hygiene Audit — SOL SaaS

**Audit ID:** 04
**Date:** 2026-03-03
**Auditor:** Claude Opus 4.6 (automated codebase analysis)
**Scope:** Full project tree, orphan detection, source-tree compliance, stale configs, duplicate responsibilities
**Status:** RESEARCH ONLY — no files modified

---

## Table of Contents

1. [Full File Tree](#1-full-file-tree)
2. [Orphan Source Files](#2-orphan-source-files)
3. [Source-Tree Compliance](#3-source-tree-compliance)
4. [Empty / Meaningless Directories](#4-empty--meaningless-directories)
5. [Duplicate / Overlapping Responsibilities](#5-duplicate--overlapping-responsibilities)
6. [Stale Configuration Files](#6-stale-configuration-files)
7. [Stale Documentation](#7-stale-documentation)
8. [Specific File Checks](#8-specific-file-checks)
9. [Summary](#9-summary)

---

## 1. Full File Tree

Total project files (excluding `node_modules/`, `.next/`, `.git/`, `dist/`, `.turbo/`): **118 files**

### Root Level (8 files)

```
sol-saas/
├── .dockerignore
├── .env                          # NOT committed (in .gitignore)
├── .env.example
├── .gitignore
├── README.md
├── docker-compose.yml
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── turbo.json
```

### apps/web/ (55 source files)

```
apps/web/
├── .eslintrc.json
├── next-env.d.ts
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── src/
    ├── middleware.ts
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   ├── favicon.ico
    │   ├── admin/
    │   │   ├── page.tsx
    │   │   └── pricing/page.tsx
    │   ├── api/
    │   │   ├── admin/
    │   │   │   ├── add-credits/route.ts
    │   │   │   ├── packages/route.ts
    │   │   │   ├── packages/[id]/route.ts
    │   │   │   └── pricing/route.ts
    │   │   ├── auth/
    │   │   │   ├── [...nextauth]/route.ts
    │   │   │   └── register/route.ts
    │   │   ├── chat/route.ts
    │   │   ├── conversations/
    │   │   │   ├── route.ts
    │   │   │   └── [conversationId]/messages/route.ts
    │   │   ├── onboarding/
    │   │   │   ├── route.ts
    │   │   │   └── [id]/route.ts
    │   │   ├── payments/checkout/route.ts
    │   │   ├── quiz/
    │   │   │   ├── route.ts
    │   │   │   ├── answer/route.ts
    │   │   │   ├── generate/route.ts
    │   │   │   └── session/[id]/route.ts
    │   │   ├── video/
    │   │   │   ├── status/[id]/route.ts
    │   │   │   └── upload/route.ts
    │   │   └── webhooks/stripe/route.ts
    │   ├── chat/
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── credits/
    │   │   ├── layout.tsx
    │   │   ├── buy/
    │   │   │   ├── page.tsx
    │   │   │   └── components/BuyButton.tsx
    │   │   ├── error/page.tsx
    │   │   └── success/page.tsx
    │   ├── dashboard/
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── login/
    │   │   ├── actions.ts
    │   │   └── page.tsx
    │   ├── onboarding/page.tsx
    │   ├── quiz/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   └── [sessionId]/page.tsx
    │   ├── register/page.tsx
    │   └── roteiros/
    │       ├── layout.tsx
    │       ├── page.tsx
    │       └── [id]/page.tsx
    ├── assets/
    │   └── Camada 1Logotipo.json
    ├── components/
    │   ├── Logo.tsx
    │   ├── LogoWithText.tsx
    │   ├── LogoutButton.tsx
    │   ├── LottieLogo.tsx
    │   ├── admin/
    │   │   ├── AddCreditsForm.tsx
    │   │   ├── MetricCard.tsx
    │   │   ├── PricingSimulator.tsx
    │   │   └── UsersTable.tsx
    │   ├── dashboard/
    │   │   ├── ConversationList.tsx
    │   │   ├── CreditSummary.tsx
    │   │   ├── Pagination.tsx
    │   │   └── TransactionHistory.tsx
    │   ├── layout/
    │   │   ├── AppLayout.tsx
    │   │   ├── CreditsBadge.tsx
    │   │   └── CreditsProvider.tsx
    │   ├── quiz/
    │   │   ├── GeneratingScript.tsx
    │   │   └── QuizEngine.tsx
    │   └── video/
    │       ├── ProcessingStatus.tsx
    │       └── VideoUpload.tsx
    ├── lib/
    │   ├── auth.ts
    │   ├── credits-config.ts
    │   ├── file-processor.ts
    │   ├── format-balance.ts
    │   ├── prompts.ts
    │   ├── rate-limit.ts
    │   ├── stripe.ts
    │   ├── quiz/
    │   │   ├── conditions.ts
    │   │   ├── prompt-builder.ts
    │   │   └── questions.ts
    │   └── video/
    │       ├── assemblyai.ts
    │       ├── ffmpeg.ts
    │       └── processor.ts
    └── types/
        └── next-auth.d.ts
```

### packages/db/ (8 source files + 10 migrations)

```
packages/db/
├── .env
├── package.json
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/  (10 migrations)
│       ├── 20260225045419_init/
│       ├── 20260225193516_add_credits_non_negative_constraint/
│       ├── 20260226220000_pricing_refactoring/
│       ├── 20260227040156_add_user_role/
│       ├── 20260227180000_remove_min_balance_add_max_tokens/
│       ├── 20260228024918_add_attachment_fields/
│       ├── 20260228120000_admin_console/
│       ├── 20260303000000_credits_pricing_refactoring/
│       ├── 20260303214719_/                  <<<< UNNAMED MIGRATION
│       ├── 20260303230000_add_credits_non_negative_check/
│       └── migration_lock.toml
└── src/
    ├── index.ts
    ├── admin.ts
    ├── conversations.ts
    ├── credits.ts
    ├── pricing.ts
    └── token-counter.ts
```

### docs/ (30 files)

```
docs/
├── architecture.md
├── front-end-spec.md
├── prd.md
├── quiz-structure-v2.html
├── audit/
│   ├── 01-static-analysis.md
│   ├── 02-quality-review.md
│   └── 03-fix-report.md
├── framework/
│   ├── coding-standards.md
│   ├── source-tree.md
│   └── tech-stack.md
├── stories/
│   ├── backlog/tech-debt.md
│   ├── epic-1/ (6 files: story-1.1 through 1.5 + implementation yaml)
│   ├── epic-2/ (5 stories + plan/)
│   ├── epic-3/ (6 stories + qa-review + plan/)
│   ├── epic-4/ (2 stories + plan/)
│   ├── epic-6/ (7 stories: 6.1 through 6.7)
│   ├── epic-7/ (5 stories: 7.1 through 7.5)
│   └── pricing-refactoring/ (3 stories + plan/)
└── workflows/
    ├── code-review-and-fix.yaml
    ├── sol-full-build.yaml
    ├── sol-quiz-refactor.yaml
    └── story-workflow.yaml
```

### Other directories

```
.aios/workflows/quality-audit.yaml
.claude/settings.local.json
.github/workflows/ci.yml
.vscode/extensions.json
squads/
├── .antigravity/rules/agents/ (12 agent .md files)
└── sol-squad/
    ├── README.md
    ├── squad.yaml
    └── agents/ (8 agent .md files)
```

---

## 2. Orphan Source Files

Files with ZERO inbound imports (not imported/referenced by any other source file in the project).

| File | Status | Recommendation | Risk |
|---|---|---|---|
| `packages/db/src/conversations.ts` | PARTIALLY ORPHANED | Exported via `index.ts` barrel, but **none** of its 4 functions (`createConversation`, `getConversationWithMessages`, `listConversations`, `addMessage`) are used anywhere in the app. All conversation operations are done via raw Prisma queries instead. | MEDIUM -- dead code increases bundle size and confuses developers |
| `components/video/ProcessingStatus.tsx` | ORPHAN | Defined and exported but **never imported** by any page or component. | LOW -- new feature, likely awaiting page integration |
| `components/video/VideoUpload.tsx` | ORPHAN | Defined and exported but **never imported** by any page or component. | LOW -- new feature, likely awaiting page integration |

### Notes on Near-Orphans

| File | Status | Notes |
|---|---|---|
| `lib/credits-config.ts` | USED (2 imports) | Imported by `PricingSimulator.tsx` and `credits/buy/page.tsx`. NOT orphan. |
| `lib/video/assemblyai.ts` | USED (1 import) | Imported by `video/processor.ts`. NOT orphan. |

---

## 3. Source-Tree Compliance

Comparing `docs/framework/source-tree.md` (dated 2026-02-28) against actual file layout.

### Files/Dirs in source-tree but MISSING from actual codebase

| Documented Item | Status | Recommendation | Risk |
|---|---|---|---|
| `packages/db/src/exchange-rate.ts` | DOES NOT EXIST | Removed during pricing refactoring (Architecture v6.0). source-tree.md still lists it. | LOW -- stale documentation |
| `apps/web/public/` | DOES NOT EXIST | source-tree says "vazio após cleanup" -- directory itself was removed entirely | LOW -- cosmetic doc issue |

### Files/Dirs in actual codebase but NOT documented in source-tree

| Actual Item | Status | Recommendation | Risk |
|---|---|---|---|
| `apps/web/src/app/admin/pricing/` | NOT DOCUMENTED | New admin pricing page, missing from source-tree | MEDIUM -- deviation from documented structure |
| `apps/web/src/app/api/admin/packages/` | NOT DOCUMENTED | CRUD routes for credit packages | MEDIUM |
| `apps/web/src/app/api/admin/pricing/` | NOT DOCUMENTED | Pricing config API route | MEDIUM |
| `apps/web/src/app/onboarding/` | NOT DOCUMENTED | Onboarding page (Epic 6) | MEDIUM |
| `apps/web/src/app/quiz/` | NOT DOCUMENTED | Quiz pages (Epic 6) | MEDIUM |
| `apps/web/src/app/roteiros/` | NOT DOCUMENTED | Roteiros listing + detail pages (Epic 6) | MEDIUM |
| `apps/web/src/app/api/onboarding/` | NOT DOCUMENTED | Onboarding API routes | MEDIUM |
| `apps/web/src/app/api/quiz/` | NOT DOCUMENTED | Quiz API routes (4 routes) | MEDIUM |
| `apps/web/src/app/api/video/` | NOT DOCUMENTED | Video upload + status API routes | MEDIUM |
| `apps/web/src/components/admin/PricingSimulator.tsx` | NOT DOCUMENTED | source-tree lists 3 admin components, actual has 4 | LOW |
| `apps/web/src/components/quiz/` | NOT DOCUMENTED | QuizEngine + GeneratingScript components | MEDIUM |
| `apps/web/src/components/video/` | NOT DOCUMENTED | VideoUpload + ProcessingStatus components | MEDIUM |
| `apps/web/src/lib/rate-limit.ts` | NOT DOCUMENTED | Rate limiting utility | MEDIUM |
| `apps/web/src/lib/quiz/` | NOT DOCUMENTED | Quiz conditions, questions, prompt-builder | MEDIUM |
| `apps/web/src/lib/video/` | NOT DOCUMENTED | AssemblyAI, FFmpeg, video processor libs | MEDIUM |
| 3 new migrations (pricing refactoring, unnamed, credits check) | NOT DOCUMENTED | source-tree lists 7 migrations, actual has 10 | LOW |

**Verdict:** The source-tree document is significantly out of date. It reflects the codebase as of ~Epic 4 completion but does not include any of the Epic 6 (Quiz & Onboarding), Epic 7 (Video), or pricing refactoring additions.

---

## 4. Empty / Meaningless Directories

| Directory | Status | Recommendation | Risk |
|---|---|---|---|
| `squads/.antigravity/rules/agents/` | QUESTIONABLE | Contains 12 generic agent definition files from the Antigravity framework. These are framework-level agents (aios-master, analyst, architect, etc.) that appear to be auto-generated scaffolding, not project-specific. | LOW -- framework overhead, not empty but possibly irrelevant |
| `apps/web/src/app/api/quiz/session/` | PASS-THROUGH | Contains only `[id]/` subdirectory. This is normal Next.js route structure. | NONE |
| `apps/web/src/app/api/video/status/` | PASS-THROUGH | Contains only `[id]/` subdirectory. Normal Next.js route structure. | NONE |

**Note:** No truly empty directories found. The project structure is clean in this regard.

---

## 5. Duplicate / Overlapping Responsibilities

| Files | Overlap | Recommendation | Risk |
|---|---|---|---|
| `lib/credits-config.ts` (`formatPrice`) vs `lib/format-balance.ts` (`formatBalance`) | **NAMING OVERLAP** -- Both format currency/credits for display. `formatPrice` formats BRL cents (`Intl.NumberFormat`). `formatBalance` formats integer credits ("X creditos"). Different purposes but confusing naming in a file called "credits-config" that only contains a price formatter. | Rename `credits-config.ts` to `format-price.ts` or merge both formatters into a single `formatters.ts`. The name "credits-config" is misleading since it contains no config, just a format function. | LOW |
| `packages/db/src/conversations.ts` vs inline Prisma queries in API routes | **DEAD CODE OVERLAP** -- `conversations.ts` provides `createConversation`, `getConversationWithMessages`, `listConversations`, `addMessage` but all 4 functions are unused. API routes like `api/conversations/route.ts` and `api/chat/route.ts` do raw `prisma.conversation.findMany()` queries directly. | Either (a) refactor API routes to use the `conversations.ts` functions, or (b) delete the file. Currently it is dead code exported through the barrel. | MEDIUM |
| `packages/db/src/pricing.ts` (`calculateCredits`, `calculateMaxCredits`) vs `packages/db/src/token-counter.ts` (`countTokens`, `estimateMaxCost`) | **FUNCTIONAL OVERLAP** -- Both deal with cost estimation. `pricing.ts` calculates credits from token counts. `token-counter.ts` counts tokens and used to contain cost estimation (functions referenced in old tech-debt items like `estimateMaxCost/calculateRealCost`). After the pricing refactoring these were split, which is correct, but the boundary may confuse developers. | Document the boundary clearly: `token-counter.ts` = count tokens, `pricing.ts` = calculate credits from tokens. | LOW |

---

## 6. Stale Configuration Files

| File | Issue | Recommendation | Risk |
|---|---|---|---|
| `squads/sol-squad/squad.yaml` | Description says "IA conversacional orquestrada por **Kestra**" -- Kestra is explicitly **prohibited** in `docs/framework/tech-stack.md` line 50: "Proibido: Kestra, n8n, ou qualquer orquestrador externo". The project uses no orchestrators. | Update description to remove Kestra reference. | MEDIUM -- misleading for agents that read squad.yaml |
| `squads/sol-squad/README.md` | Line 3 says "orquestrada por Kestra". Line 10 mentions "Kestra flows" for architect. Line 15 mentions "Kestra Docker" for devops. | Full rewrite needed to reflect actual architecture (Next.js API routes, no orchestrators). | MEDIUM |
| `squads/sol-squad/agents/architect.md` | 7 references to Kestra (flows, webhooks, workers). The project uses zero Kestra. | Rewrite agent persona to match actual tech stack. | MEDIUM |
| `squads/sol-squad/agents/ai-engineer.md` | References "Kestra flows de IA (scripts Python)". No Python exists in the project. | Rewrite agent persona. | MEDIUM |
| `squads/sol-squad/agents/fullstack-dev.md` | References "Kestra REST API", "Orchestration: Kestra REST API". | Rewrite agent persona. | MEDIUM |
| `squads/sol-squad/agents/devops.md` | 8 references to Kestra (Docker, deploy, monitoring, workers). | Rewrite agent persona. | MEDIUM |
| `squads/sol-squad/agents/qa.md` | References "Testar Kestra flows". | Rewrite agent persona. | LOW |
| `squads/sol-squad/agents/prompt-engineer.md` | References "Kestra flows". | Rewrite agent persona. | LOW |
| `packages/db/prisma/migrations/20260303214719_/` | **Unnamed migration** -- empty name after timestamp. Contains Quiz/Onboarding schema additions. Should have a descriptive name like `add_quiz_onboarding_models`. | Rename if possible (may require migration reset in dev). At minimum, document. | LOW |
| `.claude/settings.local.json` | Allows `Bash(npx prisma db execute --file prisma/migrations/20260225045419_init/migration.sql ...)` -- specific to initial setup, now stale. Also allows `Bash(npm install)` which should be `pnpm install`. | Clean up stale permissions. | LOW |

---

## 7. Stale Documentation

| File | Issue | Recommendation | Risk |
|---|---|---|---|
| `docs/front-end-spec.md` | **SEVERELY STALE** -- Entire document reflects the "chat-first" paradigm (line 22: "Chat-first -- A tela principal e a conversa"). Zero mentions of quiz, onboarding, roteiro, or video. The project pivoted to "quiz-first + chat complementar" as documented in PRD v9.0 and Architecture v7.0. This is a 34KB document that is now entirely misleading. | Either (a) rewrite to reflect quiz-first paradigm, or (b) archive with a deprecation header pointing to current architecture.md. | HIGH -- any agent reading this gets wrong product context |
| `docs/framework/source-tree.md` | **SIGNIFICANTLY STALE** -- Missing 15+ files/directories added in Epics 6, 7, and pricing refactoring. Still lists `exchange-rate.ts` which was deleted. Lists 7 migrations when 10 exist. Does not document `lib/quiz/`, `lib/video/`, `lib/rate-limit.ts`, any quiz/onboarding/roteiros/video pages or API routes, or the `components/quiz/` and `components/video/` directories. | Full update required to reflect current codebase. | HIGH -- agents use this as canonical structure reference |
| `docs/stories/backlog/tech-debt.md` | **PARTIALLY STALE** -- Some items marked as BLOCKER have been resolved (e.g., QA-109 rate limiting is now CORRIGIDO in the same file under Audit v4 section, but remains listed as BLOCKER above). Item QA-105 (race condition in deductCredits) references line numbers and patterns that have been fixed (deductCredits now uses `$queryRaw` with `WHERE credits - X >= 0`). | Audit and move resolved items to CORRIGIDO section. Update line references. | MEDIUM |
| `squads/sol-squad/` (all 8 agent files + README + squad.yaml) | **SEVERELY STALE** -- Entire squad definition references Kestra orchestration, Python scripts, tRPC routers (project uses REST API routes), and other tech that was never adopted. These were created from an early project spec before the tech stack was finalized. | Full rewrite of all agent personas to match actual tech stack (Next.js 14, Prisma, PostgreSQL, Stripe, OpenAI, AssemblyAI). | HIGH -- agents using these personas get incorrect tech context |
| `docs/quiz-structure-v2.html` | NOT STALE but UNUSUAL FORMAT -- 78KB HTML file used as visual reference for quiz mockups. Referenced by PRD, stories, and workflows. Functional but unusual to have an HTML presentation in docs/. | Consider converting key mockups to images or keeping as-is with a README note. | LOW |

---

## 8. Specific File Checks

### `packages/db/src/conversations.ts` -- Is it imported anywhere?

**YES, but functionally DEAD.** It is re-exported via `packages/db/src/index.ts` (line 21: `export * from './conversations'`). However, **none of its 4 exported functions** (`createConversation`, `getConversationWithMessages`, `listConversations`, `addMessage`) are actually called anywhere in the application. All conversation operations use raw Prisma queries directly. This is dead code.

### `packages/db/src/exchange-rate.ts` -- Does it still exist?

**NO.** The file was deleted during the pricing refactoring (Architecture v6.0, 2026-03-03). The `source-tree.md` document still lists it. The ExchangeRate model was removed from the Prisma schema. No imports reference it.

### `apps/web/src/lib/credits-config.ts` -- Is it imported anywhere?

**YES.** It exports a single function `formatPrice(cents: number): string` and is imported by:
1. `components/admin/PricingSimulator.tsx`
2. `app/credits/buy/page.tsx`

However, the filename "credits-config" is misleading since it contains no configuration -- only a formatting utility.

### YAML workflow files referencing non-existent tools/services

| File | Issue |
|---|---|
| `docs/workflows/story-workflow.yaml` | References `@sm`, `@dev`, `@qa` agents -- these map to squad agents. No issues with tool references. |
| `docs/workflows/code-review-and-fix.yaml` | References AIOS agent commands (`*review`, `*fix`). Framework-level, appears valid. |
| `docs/workflows/sol-full-build.yaml` | References `@architect`, `@dev` agents and quiz-structure-v2.html. Valid references. |
| `docs/workflows/sol-quiz-refactor.yaml` | References quiz-structure-v2.html and shared context docs. Valid references. |

### `.aios/` directory -- What's in it?

Contains a single file: `.aios/workflows/quality-audit.yaml` (21KB). This is an AIOS workflow definition for running quality audits. It defines a sequential pipeline: Architect (static analysis) -> QA (quality review) -> Dev (fix & backlog). This is actively relevant -- it was used to produce the existing audit reports in `docs/audit/`.

### `docs/` directory -- Orphaned or stale documents?

| Document | Status |
|---|---|
| `docs/architecture.md` | CURRENT (v7.0, 2026-03-03) |
| `docs/prd.md` | CURRENT (v9.0, but header shows earlier versions) |
| `docs/front-end-spec.md` | **STALE** -- pre-quiz-first pivot |
| `docs/quiz-structure-v2.html` | CURRENT -- referenced by multiple docs |
| `docs/framework/coding-standards.md` | CURRENT |
| `docs/framework/tech-stack.md` | CURRENT |
| `docs/framework/source-tree.md` | **STALE** -- missing Epic 6/7 additions |

---

## 9. Summary

### Counts

| Metric | Count |
|---|---|
| Total project files (excl. node_modules/.next/.git) | ~118 |
| Source files (.ts/.tsx) | 55 (web) + 6 (db) = 61 |
| Orphan source files (zero inbound imports) | **2** (video components) |
| Partially orphaned (exported but unused functions) | **1** (`conversations.ts`) |
| Files missing from source-tree doc | **15+** |
| Files in source-tree doc but deleted from codebase | **1** (`exchange-rate.ts`) |
| Empty directories | **0** |
| Duplicate/overlapping responsibilities | **3** patterns identified |
| Stale configuration files | **10** (primarily Kestra-referencing squad files) |
| Stale documentation files | **3** (front-end-spec, source-tree, tech-debt partially) |
| Unnamed migrations | **1** (`20260303214719_`) |

### Priority Actions

| Priority | Action | Files Affected |
|---|---|---|
| **P0 -- HIGH** | Update `source-tree.md` to reflect actual codebase (Epic 6/7 additions, removed files, new migrations) | `docs/framework/source-tree.md` |
| **P0 -- HIGH** | Archive or rewrite `front-end-spec.md` -- currently reflects entirely wrong product paradigm (chat-first vs quiz-first) | `docs/front-end-spec.md` |
| **P1 -- MEDIUM** | Rewrite `squads/sol-squad/` to remove all Kestra references and align with actual tech stack | 10 files in `squads/sol-squad/` |
| **P1 -- MEDIUM** | Decide on `conversations.ts`: either use it (refactor API routes) or delete it | `packages/db/src/conversations.ts` |
| **P2 -- LOW** | Integrate `VideoUpload` and `ProcessingStatus` components into pages or remove if premature | 2 files in `components/video/` |
| **P2 -- LOW** | Rename `credits-config.ts` to `format-price.ts` (misleading filename) | `apps/web/src/lib/credits-config.ts` |
| **P2 -- LOW** | Name the unnamed migration `20260303214719_` | `packages/db/prisma/migrations/` |
| **P3 -- INFO** | Clean up resolved items in `tech-debt.md` (some BLOCKERs already fixed) | `docs/stories/backlog/tech-debt.md` |

---

*End of Codebase Map & Hygiene Audit*
