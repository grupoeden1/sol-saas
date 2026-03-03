# User Story: Quiz Engine — Renderização e Lógica Condicional

**ID:** 6.3
**Epic:** 6 - Quiz & Onboarding
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 6.1 (Schema), Story 6.2 (Onboarding)

---

## Statement

As a student,
I want to answer a structured quiz that adapts based on my choices,
so that the AI gets exactly the right context to generate my script.

---

## Context

O quiz engine é o coração do produto. Renderiza 48 perguntas distribuídas em 6 seções, com lógica condicional (perguntas que aparecem/escondem baseado em respostas anteriores) e ramificação (4 caminhos possíveis). As perguntas são definidas como configuração estática em TypeScript — não no banco.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Arquivo `lib/quiz/questions.ts` define todas as 48 perguntas com: `questionKey`, `section`, `type`, `title`, `example`, `options`, `required`, `showWhen` | DONE |
| 2 | Componente `quiz-engine` renderiza perguntas dinamicamente por tipo: texto (textarea), seleção única (radio cards), seleção múltipla (checkbox cards), upload (drag & drop) | DONE |
| 3 | Lógica condicional funcional: Q3="B" (sem aparecer) → mostra Q3.1 (formato de produção). Implementado via `showWhen` no schema de perguntas | DONE |
| 4 | Ramificação Q1: "Anúncio Criativo" (A) → carrega seção 1A; "Vídeo Orgânico" (B) → carrega seção 1B | DONE |
| 5 | Ramificação Q2: "Modelar" (A) → carrega seção 2A; "Do Zero" (B) → carrega seção 2B | DONE |
| 6 | Barra de progresso por seção (ex: "3 de 7") atualiza em tempo real | DONE |
| 7 | Navegação entre seções via sidebar e botões prev/next | DONE |
| 8 | `POST /api/quiz/answer` salva cada resposta (upsert por `quizSessionId + questionKey`) | DONE |
| 9 | `GET /api/quiz/session/[id]` retorna estado atual do quiz com respostas já dadas | DONE |
| 10 | Ao responder Q1 ou Q2, `path1`/`path2` da QuizSession é atualizado no banco | DONE |
| 11 | Arquivo `lib/quiz/conditions.ts` exporta função `shouldShowQuestion(questionKey, answers)` | DONE |
| 12 | Salvamento automático a cada resposta — aluno pode sair e retomar quiz | DONE |

---

## Technical Notes

- **Componentes:** `components/quiz/quiz-engine.tsx`, `components/quiz/question-types/*.tsx`
- **Configuração:** `lib/quiz/questions.ts` — array de `QuestionDefinition` (interface definida em `architecture.md` v7.0)
- **Lógica:** `lib/quiz/conditions.ts` — `shouldShowQuestion()` avalia `showWhen` contra respostas existentes
- **API:** `apps/web/src/app/api/quiz/answer/route.ts`, `apps/web/src/app/api/quiz/session/[id]/route.ts`
- **State management:** React state local para respostas em andamento + server sync via POST /api/quiz/answer
- **Referência:** PRD v9.0 — "Catálogo Completo de Perguntas" (todas as 48 perguntas com tipos e opções)
- **Referência:** Architecture v7.0 — "Quiz Engine (lib/quiz/questions.ts)"
