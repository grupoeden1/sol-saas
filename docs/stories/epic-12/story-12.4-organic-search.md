# User Story: Busca de Conteudos Organicos Virais

**ID:** 12.4
**Epic:** 12 — Ad Intelligence & Content Discovery
**Status:** draft
**Priority:** High
**Agent:** @sm (draft) -> @dev (implement) -> @qa (review)
**Depends on:** Story 12.1 (Schema), Story 12.2 (API Gateway)

---

## Statement

As a student doing the Organic Video path (1B),
I want to search viral organic content in my niche,
so that I can model my video after proven viral references.

---

## Context

O Caminho 1B do quiz permite que alunos busquem conteudos organicos virais para usar como referencia na geracao de roteiros. A busca integra tres plataformas (YouTube, TikTok, Instagram) via APIs distintas, cada uma com limitacoes proprias de quota, aprovacao e formato de resposta. Os resultados sao consolidados em uma lista unificada ordenada por engajamento, com cache de 12h via tabela `search_cache`. A arquitetura usa `Promise.allSettled` para garantir que a falha de uma plataforma nao impeca as demais de retornar resultados. TikTok Research API requer aprovacao previa e opera sob feature flag via `api_configurations`.

---

## Acceptance Criteria

| # | Criterio | Status |
|---|----------|--------|
| 1 | `GET /api/references/organic?q={query}&platforms=tiktok,youtube,instagram&limit=20` busca conteudos organicos virais em multiplas plataformas | TODO |
| 2 | **YouTube Data API v3:** busca por keyword com filtro `type=video`, `videoDuration=short` (< 4min), `order=viewCount`, `regionCode=BR`, `relevanceLanguage=pt`. Retorna: title, views, likes, comments, duration, thumbnail URL, publishedAt, channelTitle. Quota: 100 units por search (100 buscas/dia com 10k units) | TODO |
| 3 | **TikTok Research API:** busca por keyword/hashtag com filtro de regiao e periodo. Retorna: views, likes, shares, comments, duration, music info, create_time. Se API nao aprovada ainda: feature desabilitada para TikTok com mensagem "Em breve" (sem erro) | TODO |
| 4 | **Instagram Graph API:** busca por hashtag (requer Instagram Business Account conectada via Meta Developer App). Retorna: top posts da hashtag com likes, comments, permalink, media_url, timestamp. Limitacao: 30 resultados por hashtag, ultimos 7 dias para top_media | TODO |
| 5 | Resultados consolidados de todas as plataformas em lista unificada, ordenados por engajamento (views para video, likes+comments para imagens). Badge de plataforma em cada resultado (icone TikTok/YouTube/Instagram) | TODO |
| 6 | Cache por busca: 12h para organico (conteudo muda mais rapido que ads). Implementado via tabela `search_cache` | TODO |
| 7 | Integracao no quiz: no Caminho 1B, apos pergunta Q4 (nicho), secao "Conteudos Virais" aparece com resultados. Aluno pode selecionar referencia viral para modelar | TODO |
| 8 | Quando aluno seleciona referencia, `creative_references` registrada. Se for video, aluno pode optar por upload para analise profunda via Epic 7 ou seguir com metadados + thumbnail apenas | TODO |
| 9 | Filtros no frontend: plataforma (TikTok/YouTube/Instagram/todos), periodo (7d/30d), tipo (video/imagem). Filtros aplicados client-side sobre resultados ja buscados | TODO |
| 10 | Cada plataforma que falhar nao impede as outras de retornar resultados. Fallback por plataforma independente | TODO |

---

## Technical Notes

- **YouTube quota:** 10k units/dia, cada search custa 100 units = maximo ~100 buscas/dia. Monitorar consumo via `api_configurations.rate_limit_per_hour`
- **TikTok Research API:** requer aprovacao da TikTok. Ate aprovacao, feature fica desabilitada via flag `enabled` em `api_configurations` (provider: `tiktok`). Sem erro visivel ao aluno — plataforma simplesmente nao aparece nos resultados
- **Instagram Graph API:** limitada a 30 resultados por hashtag e apenas ultimos 7 dias para `top_media`. Requer Instagram Business Account conectada via Meta Developer App
- **Resiliencia:** cada plataforma falha independentemente. `Promise.allSettled` garante que timeout ou erro em uma API nao bloqueia as demais
- **Cache:** hash da query (`query_hash`) inclui query + source + country. TTL de 12h para organico (vs 24h para ads)
- **Normalizacao:** cada service retorna dados no formato proprietario da API. Normalizar para interface `OrganicResult` com campos unificados antes de consolidar
- **Referencia:** PRD Addendum v12.0 — Epic 12, Story 12.4

---

## Tasks / Subtasks

- [ ] Criar `YouTubeSearchService` (`apps/web/src/services/references/youtube-search.ts`)
  - [ ] Implementar busca via YouTube Data API v3 com filtros (type, videoDuration, order, regionCode, relevanceLanguage)
  - [ ] Mapear resposta da API para interface `OrganicResult`
  - [ ] Implementar controle de quota (100 units por search)
- [ ] Criar `TikTokResearchService` (`apps/web/src/services/references/tiktok-research.ts`)
  - [ ] Implementar busca via TikTok Research API com filtro de regiao e periodo
  - [ ] Implementar feature flag: verificar `api_configurations` (provider: `tiktok`, enabled: true) antes de chamar
  - [ ] Se nao aprovada/desabilitada, retornar array vazio sem erro
  - [ ] Mapear resposta da API para interface `OrganicResult`
- [ ] Criar `InstagramSearchService` (`apps/web/src/services/references/instagram-search.ts`)
  - [ ] Implementar busca por hashtag via Instagram Graph API
  - [ ] Mapear resposta da API para interface `OrganicResult`
  - [ ] Respeitar limitacao de 30 resultados e 7 dias
- [ ] Criar rota API `GET /api/references/organic` (`apps/web/src/app/api/references/organic/route.ts`)
  - [ ] Validar query params (q, platforms, limit)
  - [ ] Implementar chamadas paralelas com `Promise.allSettled` para os 3 services
  - [ ] Consolidar resultados e ordenar por engajamento
  - [ ] Retornar resultados com badge de plataforma
- [ ] Definir interface `OrganicResult` com campos unificados (`apps/web/src/types/references.ts`)
  - [ ] Campos: id, title, platform, sourceUrl, thumbnailUrl, views, likes, comments, shares, duration, publishedAt, authorName, authorHandle, mediaType, rawMetadata
- [ ] Implementar cache via `search_cache`
  - [ ] Gerar `query_hash` (query + source + country)
  - [ ] Verificar cache antes de chamar APIs
  - [ ] Salvar resultados com TTL de 12h
  - [ ] Retornar cache se valido
- [ ] Implementar filtros client-side no frontend
  - [ ] Filtro por plataforma (TikTok/YouTube/Instagram/todos)
  - [ ] Filtro por periodo (7d/30d)
  - [ ] Filtro por tipo (video/imagem)

---

## File List

| Arquivo | Acao |
|---------|------|
| `apps/web/src/services/references/youtube-search.ts` | Criar — YouTubeSearchService |
| `apps/web/src/services/references/tiktok-research.ts` | Criar — TikTokResearchService com feature flag |
| `apps/web/src/services/references/instagram-search.ts` | Criar — InstagramSearchService |
| `apps/web/src/app/api/references/organic/route.ts` | Criar — API route GET com Promise.allSettled |
| `apps/web/src/types/references.ts` | Criar/Atualizar — interface OrganicResult |
| `apps/web/src/lib/cache/search-cache.ts` | Criar/Atualizar — utilitarios de cache para search_cache |

---

## Definition of Done

- [ ] YouTubeSearchService implementado e retornando resultados normalizados
- [ ] TikTokResearchService implementado com feature flag funcional (desabilitado retorna array vazio sem erro)
- [ ] InstagramSearchService implementado respeitando limitacoes da API
- [ ] Chamadas paralelas via `Promise.allSettled` funcionam — falha em uma plataforma nao bloqueia as demais
- [ ] Resultados consolidados e ordenados por engajamento
- [ ] Cache de 12h via `search_cache` funciona (lookup + persist)
- [ ] Filtros client-side aplicam corretamente sobre resultados
- [ ] TypeScript compila sem erros
- [ ] Testes unitarios para cada service (mock de API responses)
- [ ] Teste de integracao para rota `/api/references/organic` com cenarios de falha parcial

---

## Dependencies

- Story 12.1 (Schema) — tabelas `creative_references`, `search_cache`, `api_configurations` existem
- Story 12.2 (API Gateway) — padrao de integracao com APIs externas estabelecido
- Env vars: `YOUTUBE_API_KEY`, `TIKTOK_RESEARCH_CLIENT_KEY`, `TIKTOK_RESEARCH_CLIENT_SECRET`, `INSTAGRAM_ACCESS_TOKEN`
