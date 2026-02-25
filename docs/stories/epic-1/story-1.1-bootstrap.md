# Story 1.1 — Project Bootstrap & Infrastructure

---

## Status

**Current:** Draft
**Epic:** 1 — Foundation & Auth
**Sprint:** TBD

---

## Story

**As a** developer,
**I want** the monorepo, Docker environment and CI/CD pipeline set up,
**So that** the team has a working foundation to build features on.

### Context

This is the foundational story that establishes the entire technical infrastructure for the SOL SaaS platform. SOL is a conversational AI SaaS that helps students from Space (Eden Corporate's digital marketing education program) create differentiated infoproduct offers and advertising creative scripts. The goal is to scale the value currently delivered through 1:1 mentoring (R$100k+ sold) into a recurring SaaS product.

This story sets up the Turborepo monorepo structure, Docker-based local development environment with PostgreSQL, Prisma ORM integration, and GitHub Actions CI/CD pipeline. Upon completion, the project will have a clean, deployable foundation following Eden Corporate's zero lock-in principle.

**Key Technical Decisions:**
- **Monorepo:** Turborepo with `apps/web` (Next.js 14) and `packages/db` (Prisma)
- **Database:** PostgreSQL 16 via Docker (self-hosted, zero lock-in)
- **ORM:** Prisma for type-safe database access
- **CI/CD:** GitHub Actions for automated testing and deployment
- **Zero Lock-in:** No Vercel, Railway, Render, or any PaaS in production

---

## Acceptance Criteria

### AC1: Turborepo Configuration
- [ ] Turborepo initialized with `apps/web` (Next.js 14, TypeScript strict) and `packages/db` (Prisma)
- [ ] `turbo.json` defines build pipeline with proper caching configuration
- [ ] Root `package.json` has workspace configuration for Turborepo
- [ ] `apps/web` uses Next.js 14 with App Router
- [ ] TypeScript strict mode enabled in all `tsconfig.json` files

### AC2: Docker Environment
- [ ] `docker-compose.yml` in project root configures PostgreSQL 16 service
- [ ] PostgreSQL container exposes port 5432 locally
- [ ] `docker compose up` successfully starts PostgreSQL without errors
- [ ] PostgreSQL persists data via Docker volume (survives container restart)
- [ ] `.dockerignore` properly excludes `node_modules`, `.next`, and build artifacts

### AC3: Prisma Integration
- [ ] `packages/db/prisma/schema.prisma` created with basic configuration (PostgreSQL datasource, client generator)
- [ ] Database connection string uses environment variable `DATABASE_URL`
- [ ] `packages/db/src/index.ts` exports Prisma Client singleton
- [ ] `prisma migrate dev` runs without errors (creates migrations folder)
- [ ] `prisma generate` produces typed Prisma Client successfully

### AC4: GitHub Actions CI/CD
- [ ] `.github/workflows/ci.yml` runs on every PR to `main` branch
- [ ] CI pipeline includes: install dependencies → lint → typecheck → run tests
- [ ] CI uses GitHub Actions cache for `node_modules` and Turbo cache
- [ ] All steps must pass before PR can be merged
- [ ] CI workflow uses PostgreSQL service container for database tests

### AC5: Environment Variables Documentation
- [ ] `.env.example` file documents all required environment variables
- [ ] `.env.example` includes: `DATABASE_URL`, `NODE_ENV`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- [ ] `.env.example` contains placeholder values (no real secrets)
- [ ] `.env` file is in `.gitignore` (never committed)
- [ ] README includes clear note about copying `.env.example` to `.env`

### AC6: README and Setup Instructions
- [ ] `README.md` contains project overview and purpose statement
- [ ] Setup instructions are clear and sequential: clone → copy `.env.example` → `docker compose up` → `npm install` → `npm run db:migrate` → `npm run dev`
- [ ] All commands are copy-pasteable and work on fresh clone
- [ ] README includes tech stack summary (Next.js 14, Prisma, PostgreSQL, Turborepo)
- [ ] Development workflow documented (how to run locally, how to add migrations)

### AC7: Basic Next.js Application
- [ ] `apps/web` has working Next.js 14 App Router setup
- [ ] Homepage (`app/page.tsx`) renders successfully with placeholder content
- [ ] `npm run dev` starts development server on port 3000
- [ ] Tailwind CSS installed and configured correctly
- [ ] Basic layout and minimal styling applied (dark theme preparation)

### AC8: Package Scripts
- [ ] Root `package.json` has script: `dev` (runs Next.js dev server)
- [ ] Root `package.json` has script: `build` (builds Next.js app)
- [ ] Root `package.json` has script: `db:migrate` (runs Prisma migrate dev)
- [ ] Root `package.json` has script: `db:studio` (opens Prisma Studio)
- [ ] All scripts work correctly via Turbo

---

## Dev Notes

> **CRITICAL:** This section contains ONLY information extracted from architecture and framework documents. Technical decisions are based on documented standards.

### Architecture Reference
[Source: docs/architecture.md#High-Level-Architecture]

- **Repository Structure:** Monorepo using Turborepo
- **Deployment:** VPS própria (Brasil/São Paulo region)
- **Infrastructure:** Docker Compose orchestration
- **Pattern:** Monolith dentro de Monorepo (frontend + backend in same Next.js process)

### Tech Stack
[Source: docs/framework/tech-stack.md]

**Frontend:**
- Next.js 14 with App Router
- TypeScript strict mode (no `any` allowed)
- Tailwind CSS for styling
- Shadcn/UI components

**Backend:**
- API Routes within Next.js (no separate server)
- Prisma ORM
- PostgreSQL 16 (self-hosted)

**Infrastructure:**
- Docker + Docker Compose
- GitHub Actions CI/CD
- **Prohibited:** Vercel (production), Railway, Render, Supabase, Firebase

### Project Structure
[Source: docs/framework/source-tree.md]

```
sol-saas/
├── apps/
│   └── web/                    # Next.js 14 application
│       ├── app/                # App Router
│       ├── components/         # React components
│       ├── lib/                # Shared utilities
│       └── public/             # Static assets
├── packages/
│   └── db/                     # Prisma package
│       ├── prisma/
│       │   └── schema.prisma   # Database schema
│       └── src/
│           └── index.ts        # Prisma Client export
├── docs/                       # Project documentation
├── .env.example               # Environment template
├── docker-compose.yml         # PostgreSQL container
├── turbo.json                 # Turborepo config
└── package.json               # Root workspace config
```

### Coding Standards
[Source: docs/framework/coding-standards.md]

- **TypeScript:** Strict mode mandatory, no `any`, no `@ts-ignore` without documented justification
- **File Naming:** kebab-case for files (`auth-service.ts`)
- **Components:** PascalCase (`UserCard.tsx`)
- **Git:** Conventional commits in Portuguese (`feat:`, `fix:`, `chore:`)
- **Branches:** `feature/nome-da-feature`, `fix/nome-do-bug`
- **PR Required:** Never push directly to `main`

### Database Configuration
[Source: docs/architecture.md#Data-Models]

- **Database:** PostgreSQL 16
- **Connection:** Via `DATABASE_URL` environment variable
- **ORM:** Prisma with strict typing
- **Migrations:** `prisma migrate dev` for development, `prisma migrate deploy` for production
- **Client:** Singleton pattern in `packages/db/src/index.ts`

### CI/CD Requirements
[Source: docs/framework/tech-stack.md#Infrastructure]

- **Platform:** GitHub Actions
- **Triggers:** Every PR to `main` branch
- **Pipeline:** lint → typecheck → test
- **Caching:** Node modules + Turbo cache
- **Database Tests:** Use PostgreSQL service container in GitHub Actions

### Environment Variables Required
[Source: docs/prd.md#Technical-Assumptions + docs/framework/tech-stack.md]

```
DATABASE_URL=postgresql://user:password@localhost:5432/sol
NODE_ENV=development
NEXTAUTH_SECRET=(generate with: openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000
```

### Security Considerations
[Source: docs/framework/coding-standards.md#Security]

- Never commit `.env` file
- Use `.env.example` with placeholder values only
- Sensitive variables never in frontend (`NEXT_PUBLIC_` forbidden for secrets)
- Always use environment variables for credentials

---

## Tasks / Subtasks

### Task 1: Initialize Turborepo and Project Structure (AC: 1)
- [ ] 1.1 Delete existing placeholder files from initial commit
- [ ] 1.2 Run `npx create-turbo@latest` to initialize Turborepo structure
- [ ] 1.3 Configure `turbo.json` with build, dev, and lint pipelines
- [ ] 1.4 Create `apps/web` directory and initialize Next.js 14 with App Router
- [ ] 1.5 Create `packages/db` directory for Prisma package
- [ ] 1.6 Configure root `package.json` with workspace definitions
- [ ] 1.7 Enable TypeScript strict mode in all `tsconfig.json` files

### Task 2: Set Up Docker Environment (AC: 2)
- [ ] 2.1 Create `docker-compose.yml` with PostgreSQL 16 service definition
- [ ] 2.2 Configure PostgreSQL environment variables (user, password, database name)
- [ ] 2.3 Set up Docker volume for persistent data storage
- [ ] 2.4 Expose PostgreSQL on port 5432
- [ ] 2.5 Test `docker compose up` and verify PostgreSQL starts successfully
- [ ] 2.6 Create `.dockerignore` file excluding `node_modules`, `.next`, build artifacts

### Task 3: Configure Prisma ORM (AC: 3)
- [ ] 3.1 Initialize Prisma in `packages/db` with `npx prisma init`
- [ ] 3.2 Configure `schema.prisma` with PostgreSQL datasource
- [ ] 3.3 Add Prisma Client generator to schema
- [ ] 3.4 Create `packages/db/src/index.ts` with Prisma Client singleton export
- [ ] 3.5 Add `DATABASE_URL` to `.env` pointing to Docker PostgreSQL
- [ ] 3.6 Run `prisma generate` and verify Prisma Client is created
- [ ] 3.7 Create initial empty migration with `prisma migrate dev`

### Task 4: Implement GitHub Actions CI/CD (AC: 4)
- [ ] 4.1 Create `.github/workflows` directory
- [ ] 4.2 Create `ci.yml` workflow file triggered on PR to `main`
- [ ] 4.3 Configure checkout action and Node.js setup (v20)
- [ ] 4.4 Add PostgreSQL service container for database tests
- [ ] 4.5 Implement dependency installation with caching
- [ ] 4.6 Add lint step using `turbo run lint`
- [ ] 4.7 Add typecheck step using `turbo run typecheck`
- [ ] 4.8 Add test step using `turbo run test`
- [ ] 4.9 Configure Turbo remote caching (optional)
- [ ] 4.10 Test CI pipeline with sample PR

### Task 5: Create Environment Configuration (AC: 5)
- [ ] 5.1 Create `.env.example` with all required variables documented
- [ ] 5.2 Add `DATABASE_URL` with placeholder PostgreSQL connection string
- [ ] 5.3 Add `NODE_ENV` (development/production)
- [ ] 5.4 Add `NEXTAUTH_SECRET` with generation instructions
- [ ] 5.5 Add `NEXTAUTH_URL` with localhost:3000 default
- [ ] 5.6 Verify `.env` is in `.gitignore`
- [ ] 5.7 Document each variable's purpose in `.env.example` comments

### Task 6: Write README and Setup Instructions (AC: 6)
- [ ] 6.1 Create project overview section describing SOL's purpose
- [ ] 6.2 Document tech stack (Next.js 14, Prisma, PostgreSQL, Turborepo)
- [ ] 6.3 Write Prerequisites section (Node.js 20+, Docker, Git)
- [ ] 6.4 Write step-by-step Local Setup section
- [ ] 6.5 Document Development Workflow (running dev server, creating migrations)
- [ ] 6.6 Add Available Scripts section
- [ ] 6.7 Include Architecture Decision: zero lock-in principle
- [ ] 6.8 Test setup instructions on fresh clone to verify accuracy

### Task 7: Create Basic Next.js Application (AC: 7)
- [ ] 7.1 Initialize Next.js 14 in `apps/web` with TypeScript and App Router
- [ ] 7.2 Install and configure Tailwind CSS
- [ ] 7.3 Create `app/layout.tsx` with basic HTML structure
- [ ] 7.4 Create `app/page.tsx` with placeholder homepage content
- [ ] 7.5 Apply basic dark theme preparation (dark background, light text)
- [ ] 7.6 Configure Tailwind with custom color palette (solar theme prep)
- [ ] 7.7 Test development server with `npm run dev`
- [ ] 7.8 Verify page loads correctly at http://localhost:3000

### Task 8: Configure Package Scripts (AC: 8)
- [ ] 8.1 Add `dev` script to root `package.json` (runs turbo dev)
- [ ] 8.2 Add `build` script to root `package.json` (runs turbo build)
- [ ] 8.3 Add `lint` script to root `package.json` (runs turbo lint)
- [ ] 8.4 Add `typecheck` script to root `package.json` (runs turbo typecheck)
- [ ] 8.5 Add `test` script to root `package.json` (runs turbo test)
- [ ] 8.6 Add `db:migrate` script (runs prisma migrate dev in packages/db)
- [ ] 8.7 Add `db:studio` script (runs prisma studio in packages/db)
- [ ] 8.8 Add `db:push` script (runs prisma db push for quick prototyping)
- [ ] 8.9 Test all scripts to ensure they work correctly

### Task 9: Integration Testing
- [ ] 9.1 Start PostgreSQL with `docker compose up`
- [ ] 9.2 Run `npm install` from project root
- [ ] 9.3 Run `npm run db:migrate` and verify migration succeeds
- [ ] 9.4 Run `npm run dev` and verify Next.js starts without errors
- [ ] 9.5 Access http://localhost:3000 and verify homepage loads
- [ ] 9.6 Run `npm run lint` and verify no linting errors
- [ ] 9.7 Run `npm run typecheck` and verify TypeScript compilation succeeds
- [ ] 9.8 Create test PR and verify GitHub Actions CI passes

---

## Definition of Done

- [ ] All Acceptance Criteria (AC1-AC8) are met
- [ ] All Tasks and Subtasks are completed and checked off
- [ ] Fresh clone setup works following README instructions
- [ ] GitHub Actions CI pipeline passes on test PR
- [ ] No TypeScript errors (`npm run typecheck` passes)
- [ ] No linting errors (`npm run lint` passes)
- [ ] Development server starts successfully (`npm run dev`)
- [ ] Docker PostgreSQL starts successfully (`docker compose up`)
- [ ] Prisma migrations run successfully (`npm run db:migrate`)
- [ ] `.env.example` is committed, `.env` is in `.gitignore`
- [ ] Code follows coding standards from `docs/framework/coding-standards.md`
- [ ] All file paths match structure in `docs/framework/source-tree.md`

---

## Notes and Considerations

### Zero Lock-in Principle
This story strictly adheres to Eden Corporate's zero lock-in principle. All infrastructure components (PostgreSQL, Docker, GitHub Actions) can be replaced or migrated without stopping operations. The only acceptable external dependencies are OpenAI (for AI) and Stripe (for payments), which will be added in later epics.

### Future-Proofing
The Turborepo monorepo structure allows for easy extraction of services in the future if needed, while keeping development simple with a monolith approach for the MVP.

### Testing Strategy
While comprehensive E2E testing is out of scope for the MVP (per PRD), this story establishes the foundation for unit and integration tests through the CI/CD pipeline.

### Performance Considerations
Turbo caching is configured to optimize build and test performance, especially important as the monorepo grows.

---

## Related Documents

- [PRD](../prd.md) — Product Requirements Document
- [Architecture](../architecture.md) — System Architecture Document
- [Tech Stack](../framework/tech-stack.md) — Technology Stack Definitions
- [Source Tree](../framework/source-tree.md) — Project Structure Guide
- [Coding Standards](../framework/coding-standards.md) — Development Standards

---

## Change Log

| Date       | Version | Description          | Author       |
| ---------- | ------- | -------------------- | ------------ |
| 2026-02-25 | 1.0     | Initial story draft  | River (SM)   |
