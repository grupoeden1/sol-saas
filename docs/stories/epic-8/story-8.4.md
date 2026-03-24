# User Story: Upload de Vídeo Produzido e Análise Comparativa

**ID:** 8.4
**Epic:** 8 - Feedback Loop & Inteligência de Resultados
**Status:** TODO
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 8.1 (Schema), Story 8.2 (Registro), Epic 7 (Video Pipeline)

---

## Statement

As a student,
I want to upload my produced video so the AI can compare it with the original script,
so that I get an execution score and improvement suggestions.

---

## Context

O aluno pode fazer upload do vídeo que produziu baseado no roteiro gerado. O sistema usa o pipeline de vídeo existente (Epic 7: AssemblyAI + FFmpeg + Claude Vision) para analisar o vídeo produzido e compará-lo com o roteiro original. O resultado inclui nota de execução (1-5), análise comparativa e sugestões de melhoria.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Na página `/roteiros/[id]/performance`, seção "Análise de Execução" com upload de vídeo produzido | TODO |
| 2 | Validação: mesmos limites do Epic 7 (mp4, mov, avi, webm; ≤ 500MB; ≤ 5 min) | TODO |
| 3 | `POST /api/scripts/[id]/execution-analysis` recebe vídeo, processa via pipeline existente (AssemblyAI + FFmpeg + Claude Vision) e compara com roteiro original | TODO |
| 4 | Claude Vision (`claude-sonnet-4-5-20250929`) analisa: (a) fidelidade ao roteiro — o que foi seguido vs alterado, (b) qualidade de execução — ganchos, cortes, CTA, tom, (c) sugestões de melhoria específicas e acionáveis | TODO |
| 5 | Resultado salvo em `ExecutionAnalysis`: `score` (1-5), `comparison_result` (análise detalhada), `improvement_suggestions` (lista) | TODO |
| 6 | Score de execução também salvo em `ScriptPerformance.execution_score` e `execution_analysis` (resumo) | TODO |
| 7 | Status atualizado para `ANALYZED` após conclusão da análise | TODO |
| 8 | Custo de créditos do processamento e análise deduzido normalmente (mesma lógica do FR5) | TODO |
| 9 | Vídeo deletado após processamento (mesmo padrão do Epic 7 — sem persistência) | TODO |
| 10 | Interface exibe resultado: nota visual (1-5 estrelas), análise comparativa formatada, lista de sugestões | TODO |

---

## Technical Notes

- **API Route:** `apps/web/src/app/api/scripts/[id]/execution-analysis/route.ts`
- **Pipeline:** Reutiliza `apps/web/src/lib/video/processor.ts` do Epic 7
- **Prompt de comparação:** Prompt específico que recebe o roteiro original + análise do vídeo produzido
- **Claude Vision:** `claude-sonnet-4-5-20250929` — suporte multimodal nativo
- **Créditos:** Custo = tokens de processamento do vídeo + tokens da análise comparativa
- **Cleanup:** Vídeo deletado do temp dir após processamento
- **Referência:** PRD v10.0 — Story 8.4, FR30

---

## Dependencies

- Story 8.1 — Schema ExecutionAnalysis
- Story 8.2 — ScriptPerformance existe
- Epic 7 — Pipeline de vídeo funcional (AssemblyAI, FFmpeg, Claude Vision)
- Claude API Migration (Phase 2) — Claude Vision para análise
