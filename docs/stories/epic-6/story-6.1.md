# User Story: Database Schema — Onboarding & Quiz

**ID:** 6.1
**Epic:** 6 - Quiz & Onboarding
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Epic 1 (Foundation), Story 2.1 (Conversation model exists)

---

## Statement

As a developer,
I want the database schema for onboarding profiles, quiz sessions, and quiz answers,
so that quiz data can be persisted and used for script generation.

---

## Context

O SOL evolui de chat-first para quiz-first. Esta story cria os modelos de dados que suportam:
- Perfis de onboarding persistentes (um por produto/nicho)
- Sessões de quiz com caminhos condicionais (4 combinações)
- Respostas individuais por pergunta com tipo e valor
- Vinculação de Conversation (Roteiro) a uma QuizSession

O campo `quizSessionId` adicionado ao modelo Conversation permite distinguir roteiros gerados via quiz de chats livres.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Migration Prisma cria tabela `onboarding_profiles` com: `id`, `userId` (FK → users), `name` (String), `answers` (Json), `createdAt`, `updatedAt` | TODO |
| 2 | Migration cria tabela `quiz_sessions` com: `id`, `userId` (FK), `onboardingProfileId` (FK), `path1` (enum: AD \| ORGANIC, nullable), `path2` (enum: MODELED \| FROM_SCRATCH, nullable), `status` (enum: IN_PROGRESS \| COMPLETED \| ABANDONED), `createdAt`, `completedAt` (nullable) | TODO |
| 3 | Migration cria tabela `quiz_answers` com: `id`, `quizSessionId` (FK), `section` (enum: INITIAL \| AD_CREATIVE \| ORGANIC_VIDEO \| MODELED_VIDEO \| FROM_SCRATCH_VIDEO), `questionKey` (String), `answerType` (enum: TEXT \| SINGLE_SELECT \| MULTI_SELECT \| UPLOAD), `answerValue` (String), `createdAt`. Constraint unique: `@@unique([quizSessionId, questionKey])` | TODO |
| 4 | Campo `quizSessionId` (String?, FK → quiz_sessions, @unique) adicionado ao modelo `Conversation`. Null = chat livre | TODO |
| 5 | Enums Prisma criados: `Path1`, `Path2`, `QuizStatus`, `QuizSection`, `AnswerType` | TODO |
| 6 | Relações: `user.onboardingProfiles`, `user.quizSessions`, `quizSession.answers`, `quizSession.conversation` (1:1), `onboardingProfile.quizSessions` | TODO |
| 7 | Seed script cria: 1 perfil de onboarding de teste, 1 quiz session completa com respostas de exemplo | TODO |
| 8 | `prisma generate` e `prisma migrate dev` rodam sem erros | TODO |

---

## Technical Notes

- **Schema:** `packages/db/prisma/schema.prisma`
- **Enums:** Path1 (AD, ORGANIC), Path2 (MODELED, FROM_SCRATCH), QuizStatus (IN_PROGRESS, COMPLETED, ABANDONED), QuizSection (INITIAL, AD_CREATIVE, ORGANIC_VIDEO, MODELED_VIDEO, FROM_SCRATCH_VIDEO), AnswerType (TEXT, SINGLE_SELECT, MULTI_SELECT, UPLOAD)
- **Índices:** `@@index([userId])` em OnboardingProfile e QuizSession, `@@index([quizSessionId])` em QuizAnswer
- **Referência:** `docs/architecture.md` v7.0 — seção Database Schema
- **Impacto:** Conversation model ganha campo nullable — sem breaking change para chat existente
