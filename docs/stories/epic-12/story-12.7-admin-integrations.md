# User Story: Admin — API Configurations & Enrichment

**ID:** 12.7
**Epic:** 12 — Ad Intelligence & Content Discovery
**Status:** draft
**Agent:** @sm (draft) -> @dev (implement) -> @qa (review)
**Priority:** Medium
**Depends on:** Stories 12.1, 12.2, 12.4

---

## Statement

As an admin,
I want a centralized integrations page where I can configure, enable/disable, and monitor external API providers used for ad intelligence and content discovery,
so that I have full control over third-party integrations, their health status, and usage metrics.

---

## Context

A pagina `/admin/integrations` centraliza o gerenciamento de todas as APIs externas usadas pelo sistema de Ad Intelligence & Content Discovery (Meta Ad Library, YouTube Data API, enrichment providers, etc.). O admin pode habilitar/desabilitar cada provider individualmente, verificar o status de saude de cada API com um health check sob demanda, e visualizar metricas de uso extraidas da tabela `search_cache`. As configuracoes de API keys sao gerenciadas via variaveis de ambiente (nao editaveis pela UI por seguranca), mas o toggle de enable/disable e as configuracoes de enrichment sao persistidas no banco. A pagina segue o visual consistente com as demais paginas `/admin` (dark/solar theme). Todas as rotas verificam `role: ADMIN` server-side.

---

## Acceptance Criteria

| # | Criterio | Status |
|---|----------|--------|
| 1 | Pagina `/admin/integrations` lista todas as APIs configuradas (Meta Ad Library, YouTube Data API, enrichment providers) com nome, status (habilitado/desabilitado), e indicador de saude | TODO |
| 2 | Toggle enable/disable por API provider atualiza configuracao no banco via `PUT /api/admin/integrations/[provider]` — mudanca reflete imediatamente | TODO |
| 3 | Secao de configuracao de enrichment permite definir parametros por provider (timeout, prioridade, adapter URL) | TODO |
| 4 | Botao "Health Check" por provider executa `POST /api/admin/integrations/[provider]/health` — retorna status (ok/error) com latencia e mensagem descritiva | TODO |
| 5 | Secao de metricas de uso exibe: total de buscas por source (extraido de `search_cache` COUNT agrupado por source), buscas nas ultimas 24h, e cache hit rate | TODO |
| 6 | Arquivo `.env.example` atualizado com todas as variaveis de ambiente necessarias para cada provider (API keys, endpoints, feature flags) | TODO |
| 7 | Todas as rotas API (`GET`, `PUT`, `POST /health`) verificam `role: ADMIN` server-side — retorna 403 para nao-admins | TODO |

---

## Technical Notes

- **Pagina admin:** `apps/web/src/app/(dashboard)/admin/integrations/page.tsx` — Server Component com Client Components para interatividade (toggles, health check button)
- **API Routes:**
  - `apps/web/src/app/api/admin/integrations/route.ts` — GET (lista todos os providers com config + metricas)
  - `apps/web/src/app/api/admin/integrations/[provider]/route.ts` — PUT (atualiza config do provider)
  - `apps/web/src/app/api/admin/integrations/[provider]/health/route.ts` — POST (executa health check)
- **Visual:** consistente com paginas admin existentes (`/admin/referral`, `/admin/pricing`) — dark/solar theme
- **Health check:** faz chamada API minima ao provider (ex: busca com query vazia ou endpoint de status) para verificar conectividade e validade da API key
- **Metricas:** queries de agregacao Prisma em `search_cache` — `groupBy({ by: ['source'], _count: true })` para total por source
- **Protecao:** verificar `session.user.role === 'ADMIN'` em todas as rotas
- **Env vars:** documentar no `.env.example` todas as keys necessarias com comentarios descritivos

---

## File List

| Arquivo | Acao |
|---------|------|
| `apps/web/src/app/(dashboard)/admin/integrations/page.tsx` | Criar — pagina principal (Server Component) |
| `apps/web/src/app/(dashboard)/admin/integrations/components/ProviderCard.tsx` | Criar — card de provider com toggle e health check |
| `apps/web/src/app/(dashboard)/admin/integrations/components/UsageMetrics.tsx` | Criar — secao de metricas de uso |
| `apps/web/src/app/(dashboard)/admin/integrations/components/EnrichmentConfig.tsx` | Criar — formulario de configuracao de enrichment |
| `apps/web/src/app/api/admin/integrations/route.ts` | Criar — GET lista providers |
| `apps/web/src/app/api/admin/integrations/[provider]/route.ts` | Criar — PUT atualiza config |
| `apps/web/src/app/api/admin/integrations/[provider]/health/route.ts` | Criar — POST health check |
| `.env.example` | Atualizar — adicionar variaveis de API providers |

---

## Tasks / Subtasks

- [ ] Criar pagina `/admin/integrations` como Server Component com layout admin existente
- [ ] Criar Client Components: `ProviderCard` (toggle + health), `UsageMetrics`, `EnrichmentConfig`
- [ ] Criar API route `GET /api/admin/integrations` — retorna lista de providers com config e metricas
- [ ] Criar API route `PUT /api/admin/integrations/[provider]` — atualiza enable/disable e config do provider
- [ ] Criar API route `POST /api/admin/integrations/[provider]/health` — executa health check minimo por API
- [ ] Implementar health check por API (Meta Ad Library, YouTube Data API, enrichment providers)
- [ ] Implementar metricas de uso a partir de `search_cache` (COUNT por source, ultimas 24h, cache hit rate)
- [ ] Atualizar `.env.example` com todas as variaveis de ambiente dos providers (keys, endpoints, flags)
- [ ] Proteger todas as rotas com verificacao de `role: ADMIN` server-side

---

## Definition of Done

- [ ] Pagina `/admin/integrations` lista todas as APIs configuradas com status visual
- [ ] Toggle enable/disable funciona e persiste configuracao no banco
- [ ] Health check retorna status correto (ok/error) com latencia para cada provider
- [ ] Metricas de uso exibem dados corretos extraidos de `search_cache`
- [ ] Todas as rotas protegidas por role ADMIN (403 para nao-admins)
- [ ] `.env.example` atualizado com todas as variaveis necessarias
- [ ] Layout visual consistente com demais paginas admin (dark/solar theme)
- [ ] TypeScript strict sem erros

---

## Dependencies

- Story 12.1 — schema de `search_cache` e providers base
- Story 12.2 — Meta Ad Library integration (provider a ser gerenciado)
- Story 12.4 — YouTube/Organic search integration (provider a ser gerenciado)
