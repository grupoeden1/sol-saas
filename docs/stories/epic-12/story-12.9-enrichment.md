# User Story: Enrichment Layer — Terceiros (Opcional)

**ID:** 12.9
**Epic:** 12 — Ad Intelligence & Content Discovery
**Status:** draft
**Agent:** @sm (draft) -> @dev (implement) -> @qa (review)
**Priority:** Low (last priority, optional)
**Depends on:** Stories 12.2, 12.4, 12.7

---

## Statement

As a student,
I want search results to be optionally enriched with additional data from third-party sources displayed in a "Referências Históricas" section,
so that I get a more comprehensive view of ad intelligence without any additional cost or disruption to my workflow.

---

## Context

O Enrichment Layer e uma camada opcional que adiciona dados de terceiros aos resultados de busca de Ad Library e organic search. Utiliza o adapter pattern para permitir integracao com diferentes providers de enrichment sem acoplar o codigo core. A chamada ao enrichment e feita em paralelo com a busca principal, com timeout de 5s via `Promise.race` — se o enrichment nao responder a tempo ou falhar, a secao simplesmente nao aparece (silent fallback). Os resultados enriquecidos sao exibidos em uma secao separada "Referencias Historicas" com badge indicando a fonte. Deduplicacao por `source_url` garante que nao haja resultados duplicados entre busca principal e enrichment. O custo do enrichment e operacional ($99-149/mes por provider) e nao e repassado ao aluno. O admin pode monitorar logs de enrichment na pagina `/admin/integrations`.

---

## Acceptance Criteria

| # | Criterio | Status |
|---|----------|--------|
| 1 | `EnrichmentService` implementa adapter pattern com interface `EnrichmentAdapter` — permite plugar diferentes providers sem alterar codigo core | TODO |
| 2 | Chamada de enrichment executa em paralelo com busca principal, com timeout de 5s via `Promise.race` — nao atrasa resultado principal | TODO |
| 3 | Resultados enriquecidos exibidos em secao separada "Referencias Historicas" com badge indicando fonte/provider de origem | TODO |
| 4 | Deduplicacao por `source_url` garante que resultados ja presentes na busca principal nao aparecem duplicados na secao de enrichment | TODO |
| 5 | Silent fallback: se enrichment esta desabilitado, timeout excede, ou provider retorna erro, a secao "Referencias Historicas" simplesmente nao aparece — nenhum erro visivel ao aluno | TODO |
| 6 | Enrichment nao gera custo de creditos para o aluno — custo e puramente operacional do provider ($99-149/mes) | TODO |
| 7 | Logs de enrichment (chamadas, latencia, erros, resultados retornados) registrados e visiveis nas metricas admin (`/admin/integrations`) | TODO |
| 8 | Admin pode habilitar/desabilitar enrichment globalmente e por provider via `/admin/integrations` (Story 12.7) | TODO |

---

## Technical Notes

- **Service:** `apps/web/src/lib/services/enrichment.ts` — `EnrichmentService` class
- **Adapter interface:**
  ```typescript
  interface EnrichmentAdapter {
    search(query: string, type: 'ad' | 'organic'): Promise<EnrichmentResult[]>
  }

  interface EnrichmentResult {
    source_url: string
    title: string
    description?: string
    provider: string
    metadata?: Record<string, unknown>
  }
  ```
- **Generic adapter:** implementacao que chama URL configurada (REST endpoint do provider) — `GenericEnrichmentAdapter`
- **Timeout:** `Promise.race([enrichmentCall, timeoutPromise(5000)])` — se timeout, retorna array vazio
- **Silent fallback:** try/catch no nivel da chamada de enrichment — em caso de erro, loga e retorna array vazio (secao nao aparece)
- **Deduplicacao:** filtrar resultados de enrichment removendo itens cujo `source_url` ja existe nos resultados da busca principal
- **Integracao:** chamar `EnrichmentService.enrich()` em paralelo dentro de `ad-library.ts` e `organic-search.ts` (ou no nivel do orchestrator)
- **Custo:** operacional ($99-149/mes por provider) — transparente para o aluno, sem deducao de creditos
- **Logs:** registrar cada chamada de enrichment com: provider, query, latencia, count de resultados, erro (se houver) — armazenar em tabela `enrichment_logs` ou append em metricas existentes

---

## File List

| Arquivo | Acao |
|---------|------|
| `apps/web/src/lib/services/enrichment.ts` | Criar — EnrichmentService com adapter pattern |
| `apps/web/src/lib/services/adapters/generic-enrichment-adapter.ts` | Criar — adapter generico que chama URL configurada |
| `apps/web/src/lib/services/ad-library.ts` | Atualizar — integrar chamada paralela de enrichment |
| `apps/web/src/lib/services/organic-search.ts` | Atualizar — integrar chamada paralela de enrichment |
| `apps/web/src/components/search/HistoricalReferences.tsx` | Criar — secao "Referencias Historicas" com badge |
| `apps/web/src/app/api/admin/integrations/route.ts` | Atualizar — incluir metricas de enrichment |

---

## Tasks / Subtasks

- [ ] Criar `EnrichmentService` (`enrichment.ts`) com adapter pattern e interface `EnrichmentAdapter`
- [ ] Implementar `GenericEnrichmentAdapter` que chama URL configurada (REST endpoint do provider)
- [ ] Integrar chamada paralela de enrichment em ad-library search (via `Promise.race` com timeout 5s)
- [ ] Integrar chamada paralela de enrichment em organic search (via `Promise.race` com timeout 5s)
- [ ] Implementar deduplicacao por `source_url` — filtrar resultados de enrichment que ja existem na busca principal
- [ ] Implementar silent fallback — try/catch que loga erro e retorna array vazio (nenhum erro visivel ao aluno)
- [ ] Criar componente `HistoricalReferences` para exibir secao "Referencias Historicas" com badge de fonte
- [ ] Adicionar logs de enrichment (provider, query, latencia, resultados, erros) as metricas admin

---

## Definition of Done

- [ ] Adapter pattern implementado com interface `EnrichmentAdapter` extensivel
- [ ] Timeout de 5s funciona corretamente via `Promise.race` — busca principal nao e atrasada
- [ ] Deduplicacao por `source_url` correta — sem resultados duplicados entre busca principal e enrichment
- [ ] Silent fallback verificado — quando enrichment falha ou esta desabilitado, nenhum erro visivel ao aluno
- [ ] Secao "Referencias Historicas" aparece apenas quando ha resultados de enrichment
- [ ] Nenhum custo de creditos debitado ao aluno por uso de enrichment
- [ ] Logs de enrichment registrados e visiveis nas metricas admin
- [ ] TypeScript strict sem erros

---

## Dependencies

- Story 12.2 — Ad Library search (ponto de integracao para enrichment paralelo)
- Story 12.4 — Organic search (ponto de integracao para enrichment paralelo)
- Story 12.7 — Admin integrations page (controle enable/disable e metricas de enrichment)
