# User Story: Database Schema — Video Analysis

**ID:** 7.2
**Epic:** 7 - Video Processing
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 6.1 (Quiz schema — QuizSession e QuizAnswer existem)

---

## Statement

As a developer,
I want the database schema for video analysis results,
so that processed video data can be stored and used for script generation.

---

## Context

O VideoAnalysis armazena todos os resultados do pipeline de processamento de vídeo: transcrição (AssemblyAI), descrições de frames (GPT-4o Vision), análise estrutural (GPT-4o) e a descrição consolidada (`fullDescription`) que alimenta a geração do roteiro. O status de processamento permite ao frontend fazer polling do progresso.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Migration Prisma cria tabela `video_analyses` com todos os campos: `id`, `quizSessionId` (FK, @unique), `quizAnswerId` (FK, @unique — pergunta 2A.2), `transcription` (String?), `frameDescriptions` (String?), `structureAnalysis` (String?), `fullDescription` (String?), `processingStatus` (enum: QUEUED \| PROCESSING \| COMPLETED \| FAILED), `processingTimeMs` (Int?), `errorMessage` (String?), `createdAt` | TODO |
| 2 | Enum `VideoStatus` criado: QUEUED, PROCESSING, COMPLETED, FAILED | TODO |
| 3 | Relações: `quizSession.videoAnalysis` (1:1), `quizAnswer.videoAnalysis` (1:1) | TODO |
| 4 | `prisma generate` e `prisma migrate dev` rodam sem erros | TODO |
| 5 | Índices: `@unique` em `quizSessionId` e `quizAnswerId` (1:1 enforcement) | TODO |

---

## Technical Notes

- **Schema:** `packages/db/prisma/schema.prisma` — modelo VideoAnalysis
- **Relação 1:1:** Cada QuizSession tem no máximo 1 VideoAnalysis (só no caminho 2A)
- **fullDescription:** Campo mais importante — é a descrição textual consolidada que substitui o vídeo na geração do roteiro
- **Referência:** Architecture v7.0 — seção "VideoAnalysis" e Database Schema
