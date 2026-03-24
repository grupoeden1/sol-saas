# User Story: Database Schema — Performance & Feedback

**ID:** 8.1
**Epic:** 8 - Feedback Loop & Inteligência de Resultados
**Status:** TODO
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Epic 1 (Foundation), Story 6.1 (Quiz Schema)

---

## Statement

As a developer,
I want the database schema for performance tracking, metrics and execution analysis,
so that all feedback data can be stored and used for intelligence.

---

## Context

O Feedback Loop requer 4 novos modelos Prisma para armazenar dados de performance de roteiros gerados. O `ScriptPerformance` vincula-se a uma `Conversation` (roteiro) e rastreia o ciclo de vida PRODUCED → PUBLISHED → METRICS → ANALYZED. O `PerformanceMetrics` armazena snapshots temporais (dia 1, 3, 7, 14, 30). O `ExecutionAnalysis` guarda a análise comparativa entre roteiro e vídeo produzido. O `PerformanceThreshold` define limiares configuráveis para classificação automática.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Migration Prisma cria tabela `script_performances` com: `id`, `conversation_id` (FK → conversations, unique), `user_id` (FK → users), `content_type` (enum: PAID \| ORGANIC), `status` (enum: PRODUCED \| PUBLISHED \| METRICS \| ANALYZED), `niche` (string), `modules_used` (string[]), `awareness_level` (int, 1-5), `sophistication_level` (int, 1-5), `classification` (enum: TERRIBLE \| BAD \| AVERAGE \| GOOD \| EXCELLENT, nullable), `execution_score` (int, nullable, 1-5), `execution_analysis` (text, nullable), `created_at`, `updated_at` | TODO |
| 2 | Migration cria tabela `performance_metrics` com: `id`, `script_performance_id` (FK), `snapshot_day` (int — 1, 3, 7, 14 ou 30), métricas pagas (impressions, ctr, cpc, cpm, cpa, roas, hook_rate, retention — todos Float?), métricas orgânicas (views, likes, comments, shares, saves — todos Int?), `created_at`. Constraint unique: `(script_performance_id, snapshot_day)` | TODO |
| 3 | Migration cria tabela `execution_analyses` com: `id`, `script_performance_id` (FK, unique), `video_url` (string, nullable), `original_script` (text), `comparison_result` (text), `score` (int, 1-5), `improvement_suggestions` (text[]), `created_at` | TODO |
| 4 | Migration cria tabela `performance_thresholds` com: `id`, `content_type` (enum: PAID \| ORGANIC), `metric_key` (string), `terrible_max` (float), `bad_max` (float), `average_max` (float), `good_max` (float), `updated_at`, `updated_by` (string). Seeds iniciais: PAID/roas (0.5, 1.0, 2.0, 4.0), ORGANIC/retention (0.10, 0.20, 0.35, 0.50) | TODO |
| 5 | Relações: `conversation.scriptPerformance`, `scriptPerformance.metrics`, `scriptPerformance.executionAnalysis`, `user.scriptPerformances` | TODO |
| 6 | Índices compostos para queries de agregação: `(niche, classification)`, `(content_type, created_at)`, `(awareness_level, sophistication_level)` | TODO |

---

## Technical Notes

- **Schema:** `packages/db/prisma/schema.prisma`
- **Enums novos:** `ContentType` (PAID, ORGANIC), `PerformanceStatus` (PRODUCED, PUBLISHED, METRICS, ANALYZED), `Classification` (TERRIBLE, BAD, AVERAGE, GOOD, EXCELLENT)
- **Seed:** `packages/db/prisma/seed.ts` — thresholds iniciais
- **Migration:** `prisma migrate dev --name add_feedback_loop`
- **Referência:** PRD v10.0 — Story 8.1, Architecture v10.0

---

## Dependencies

- Epic 1 (Foundation) — banco e Prisma configurados
- Story 6.1 — modelo Conversation e QuizSession existem
