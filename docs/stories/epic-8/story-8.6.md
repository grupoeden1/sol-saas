# User Story: Inteligência Acumulada (/admin/intelligence)

**ID:** 8.6
**Epic:** 8 - Feedback Loop & Inteligência de Resultados
**Status:** TODO
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 8.5 (Admin Results), Story 8.3 (Métricas com classificação)

---

## Statement

As a SOL administrator,
I want an intelligence dashboard at /admin/intelligence,
so that I can see patterns and insights that improve future script generation.

---

## Context

Dashboard de inteligência acumulada que cruza dados de performance com módulos de prompt, nichos e níveis de consciência/sofisticação. Identifica padrões de sucesso e alimenta a Biblioteca de Padrões (camada 3 do Prompt Architecture). Mínimo de 5 roteiros classificados por nicho para exibir insights.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Página `/admin/intelligence` protegida por `role: ADMIN` com insights acumulados | TODO |
| 2 | **Correlação Módulos × Resultados:** tabela cruzando módulos com classificação média. Verde para ≥ BOM, vermelho para ≤ RUIM | TODO |
| 3 | **Melhores Ângulos por Nicho:** para cada nicho com ≥ 5 roteiros, exibe: awareness level mais eficaz, sophistication level mais eficaz, módulos mais usados em roteiros BOM/EXCELENTE, melhor tipo de conteúdo | TODO |
| 4 | **Formatos que Performam:** ranking de formatos de vídeo por classificação média | TODO |
| 5 | **Padrões de Sucesso:** top 10 roteiros com melhor classificação, exibindo nicho, módulos, levels, métricas principais | TODO |
| 6 | **Exportar Insights para Prompt:** botão gera texto estruturado com padrões identificados, formatado para Biblioteca de Padrões (camada 3 do Prompt Architecture) | TODO |
| 7 | Dados anonimizados — nenhuma informação pessoal exibida, apenas agregações | TODO |
| 8 | Mínimo de 5 roteiros classificados por nicho para exibir insights | TODO |
| 9 | Todas as rotas `/api/admin/intelligence/*` verificam `role: ADMIN` server-side | TODO |

---

## Technical Notes

- **Página:** `apps/web/src/app/admin/intelligence/page.tsx` — Server Component
- **API Routes:** `apps/web/src/app/api/admin/intelligence/route.ts`
- **Export:** Gera markdown/texto para copiar — sem integração automática com prompts (MVP)
- **Queries:** Aggregações complexas com `groupBy` + filtros compostos
- **Threshold:** `HAVING count >= 5` nas queries por nicho
- **Referência:** PRD v10.0 — Story 8.6

---

## Dependencies

- Story 8.5 — Admin Results como base
- Story 8.3 — Classificação automática alimenta insights
- Prompt Engine (Phase 3) — Camada 3 recebe output do export
