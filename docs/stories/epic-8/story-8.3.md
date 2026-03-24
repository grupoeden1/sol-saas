# User Story: Coleta de Métricas e Classificação Automática

**ID:** 8.3
**Epic:** 8 - Feedback Loop & Inteligência de Resultados
**Status:** TODO
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 8.1 (Schema), Story 8.2 (Registro de Performance)

---

## Statement

As a student,
I want to input my content's performance metrics at different time intervals,
so that the system can classify my results and learn from them.

---

## Context

Após publicar, o aluno pode registrar métricas em snapshots temporais (dia 1, 3, 7, 14, 30). O formulário é adaptativo: métricas de mídia paga (CTR, CPC, ROAS...) ou orgânica (views, likes, shares...). Após cada snapshot, o sistema recalcula automaticamente a classificação (PÉSSIMO→EXCELENTE) usando thresholds da tabela `performance_thresholds`.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Página `/roteiros/[id]/performance` com formulário de métricas adaptativo: PAID — impressões, CTR, CPC, CPM, CPA, ROAS, hook rate, retenção; ORGANIC — views, likes, comments, shares, saves | TODO |
| 2 | Snapshots temporais: aluno pode registrar métricas nos dias 1, 3, 7, 14 e 30 após publicação. Sistema sugere próximo snapshot baseado na data de publicação | TODO |
| 3 | `POST /api/scripts/[id]/metrics` valida e salva `PerformanceMetrics` com `snapshot_day`. Constraint unique impede duplicação | TODO |
| 4 | Após cada novo snapshot, sistema recalcula classificação: busca thresholds de `performance_thresholds`, aplica métrica principal (ROAS para PAID, retenção para ORGANIC) do snapshot mais recente | TODO |
| 5 | Classificação: PÉSSIMO (≤ terrible_max), RUIM (≤ bad_max), MEDIANO (≤ average_max), BOM (≤ good_max), EXCELENTE (> good_max). Resultado salvo em `ScriptPerformance.classification` | TODO |
| 6 | Status atualizado para `METRICS` após primeiro snapshot registrado | TODO |
| 7 | Interface exibe evolução das métricas por snapshot em formato tabular (sem gráficos no MVP) | TODO |
| 8 | Validação: valores numéricos positivos, CTR/hook rate/retenção entre 0-100%, ROAS ≥ 0 | TODO |

---

## Technical Notes

- **API Route:** `apps/web/src/app/api/scripts/[id]/metrics/route.ts`
- **Classificação:** `apps/web/src/lib/performance/classifier.ts` — `classifyPerformance()`
- **Thresholds:** Carregados da tabela `performance_thresholds` (seed em Story 8.1)
- **Formulário:** Componente adaptativo que mostra campos corretos por `content_type`
- **Tabela de evolução:** Server Component — sem real-time
- **Referência:** PRD v10.0 — Story 8.3, FR29

---

## Dependencies

- Story 8.1 — Schema PerformanceMetrics e PerformanceThreshold
- Story 8.2 — ScriptPerformance com status PUBLISHED
