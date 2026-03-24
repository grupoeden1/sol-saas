# User Story: Registro de Performance — PRODUCED → PUBLISHED → METRICS

**ID:** 8.2
**Epic:** 8 - Feedback Loop & Inteligência de Resultados
**Status:** TODO
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 8.1 (Schema), Story 6.5 (Geração de Roteiro)

---

## Statement

As a student,
I want to register that I produced and published my script,
so that I can start tracking its performance.

---

## Context

Após gerar e iterar um roteiro, o aluno pode registrar que produziu o conteúdo e em seguida que publicou. Isso cria o `ScriptPerformance` e habilita a coleta de métricas. O status é unidirecional: PRODUCED → PUBLISHED → METRICS → ANALYZED.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Na página `/roteiros/[id]`, botão "Registrar Produção" cria `ScriptPerformance` com `status: PRODUCED` e `content_type` selecionado (PAID ou ORGANIC) | TODO |
| 2 | Após registrar produção, botão "Marcar como Publicado" atualiza `status: PUBLISHED` e habilita coleta de métricas | TODO |
| 3 | `POST /api/scripts/[id]/performance` cria registro com `niche` extraído automaticamente do onboarding profile, `modules_used` extraído da geração, `awareness_level` e `sophistication_level` da classificação automática (FR28) | TODO |
| 4 | Validação: só pode registrar performance para Conversations com `quizSessionId` preenchido (roteiros gerados via quiz) | TODO |
| 5 | Um roteiro tem no máximo um `ScriptPerformance` (constraint unique em `conversation_id`) | TODO |
| 6 | Interface exibe status atual com indicação visual do progresso (PRODUCED → PUBLISHED → METRICS → ANALYZED) | TODO |
| 7 | Transição de status é unidirecional — não permite voltar ao status anterior | TODO |

---

## Technical Notes

- **API Route:** `apps/web/src/app/api/scripts/[id]/performance/route.ts`
- **UI:** Componente de status stepper em `apps/web/src/components/performance/`
- **Validação:** Server-side — verificar ownership + quizSessionId
- **Niche:** Extraído de `onboardingProfile.answers` (campo O1 ou similar)
- **Referência:** PRD v10.0 — Story 8.2

---

## Dependencies

- Story 8.1 — Schema ScriptPerformance existe
- Story 6.5 — Roteiros existem para registrar performance
- Story 6.8 — Classificação automática fornece awareness/sophistication levels
