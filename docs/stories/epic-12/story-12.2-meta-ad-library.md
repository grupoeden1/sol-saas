# User Story: Meta Ad Library API Integration

**ID:** 12.2
**Epic:** 12 — Ad Intelligence & Content Discovery
**Status:** draft
**Priority:** High
**Agent:** @sm (draft) -> @dev (implement) -> @qa (review)
**Depends on:** Story 12.1 (Database Schema: References & Integrations)

---

## Statement

As a student doing the Ad Creative path (1A),
I want to search active ads in my niche directly from the quiz,
so that I can find proven ad references without leaving SOL.

---

## Context

A Meta Ad Library API e a primeira integracao de busca de referencias do Epic 12. O aluno no Caminho 1A (Anuncio) do quiz informa o nicho, e o SOL busca anuncios ativos na biblioteca publica de ads da Meta. Os resultados sao ordenados por longevidade (dias ativo = proxy de performance: mais tempo ativo = provavelmente lucrativo). Um cache de 24h via tabela `search_cache` evita chamadas repetidas. O rate limit e de 200 calls/hora — se excedido, o sistema retorna cache stale ou mensagem amigavel. Erros da API nunca sao expostos ao aluno; o fallback gracioso sempre oferece upload manual como alternativa. O service `AdLibraryService` encapsula toda a comunicacao com a API, e o `APIGateway` fornece cache, retry e fallback como camada generica reutilizavel pelas demais stories (12.4, 12.8, 12.9).

---

## Acceptance Criteria

| # | Criterio | Status |
|---|----------|--------|
| 1 | Service `AdLibraryService` em `apps/web/lib/services/ad-library.ts` encapsula toda comunicacao com Meta Ad Library API. Configuracao via `META_AD_LIBRARY_ACCESS_TOKEN` (env var) | TODO |
| 2 | `GET /api/references/ads?q={query}&country=BR&limit=20` busca anuncios ativos na Meta Ad Library API. Parametros mapeados: `search_terms`, `ad_reached_countries=BR`, `ad_active_status=ACTIVE`, `media_type=ALL` | TODO |
| 3 | Resultados retornam: `ad_copy` (body text do anuncio), `preview_url` (link do preview do criativo), `ad_delivery_start_time` (data inicio), `days_active` (calculado: hoje - start_time), `publisher_platforms` (facebook, instagram, etc), `page_name` (nome do anunciante) | TODO |
| 4 | Resultados ordenados por `days_active DESC` — anuncios mais antigos primeiro (proxy de performance: mais tempo ativo = provavelmente lucrativo) | TODO |
| 5 | Cache implementado via tabela `search_cache`: se existe cache valido (< 24h) para mesma query+source, retorna cache. Senao, busca na API e salva cache | TODO |
| 6 | Rate limiting respeitado: maximo 200 calls/hora. Se exceder, retorna cache stale com aviso ou mensagem amigavel | TODO |
| 7 | Erro da API (timeout, rate limit, indisponivel) retorna fallback gracioso: mensagem "Busca temporariamente indisponivel. Faca upload manual da referencia." Nunca erro tecnico visivel ao aluno | TODO |
| 8 | Integracao no quiz: no Caminho 1A, apos pergunta Q4 (nicho), secao "Referencias Encontradas" aparece com resultados da busca. Aluno pode selecionar referencia OU ignorar e seguir com upload manual (2A) ou sem referencia (2B) | TODO |
| 9 | Quando aluno seleciona referencia, `creative_references` registrada com todos os metadados. Referencia vinculada ao `quiz_session_id` | TODO |
| 10 | Preview do criativo exibido inline (imagem) ou como thumbnail com link (video). Sem download automatico de videos — aluno faz upload manual se quiser analise profunda via pipeline do Epic 7 | TODO |

---

## Technical Notes

- **Meta Ad Library API endpoint:** `https://graph.facebook.com/v18.0/ads_archive`
- **Autenticacao:** `access_token` como query param — lido de `process.env.META_AD_LIBRARY_ACCESS_TOKEN`
- **Parametros principais da API:**
  - `search_terms` — termo de busca (nicho do aluno)
  - `ad_reached_countries` — `['BR']` para Brasil
  - `ad_active_status` — `ACTIVE` (somente anuncios ativos)
  - `ad_type` — `POLITICAL_AND_ISSUE_ADS` ou `ALL` (depende do acesso)
  - `fields` — `ad_creative_bodies,ad_creative_link_titles,ad_delivery_start_time,ad_snapshot_url,publisher_platforms,page_name,page_id`
  - `limit` — maximo 20 por request
- **Ordenacao:** `days_active DESC` — calculado no backend: `Math.floor((Date.now() - new Date(ad_delivery_start_time).getTime()) / (1000 * 60 * 60 * 24))`
- **Cache key (queryHash):** SHA-256 de `query + 'META_AD_LIBRARY' + country`
- **APIGateway pattern:** `apps/web/lib/services/api-gateway.ts` — camada generica que fornece:
  - Cache-first lookup via `search_cache`
  - Retry com exponential backoff (3 tentativas, 1s/2s/4s)
  - Rate limit tracking (in-memory counter + reset hourly)
  - Fallback chain: cache stale -> mensagem amigavel -> nunca erro tecnico
- **Seguranca:** API keys NUNCA expostas ao frontend. Toda comunicacao com Meta API e server-side via API route
- **Referencia:** PRD v12.0 — FR35, Epic 12 Story 12.2

---

## Tasks / Subtasks

- [ ] Criar `APIGateway` em `apps/web/lib/services/api-gateway.ts` com:
  - [ ] Cache-first lookup via tabela `search_cache` (queryHash, expiresAt)
  - [ ] Cache write apos chamada bem-sucedida (TTL configuravel)
  - [ ] Retry com exponential backoff (3 tentativas)
  - [ ] Rate limiter in-memory (contador por provider, reset horario)
  - [ ] Fallback chain: cache stale -> mensagem amigavel
- [ ] Criar `AdLibraryService` em `apps/web/lib/services/ad-library.ts` com:
  - [ ] Metodo `search(query: string, country?: string, limit?: number)` que chama Meta Ad Library API
  - [ ] Parsing da resposta para formato interno (ad_copy, preview_url, days_active, etc)
  - [ ] Ordenacao por `days_active DESC`
  - [ ] Integracao com APIGateway para cache e rate limiting
- [ ] Criar API route `GET /api/references/ads` em `apps/web/app/api/references/ads/route.ts` com:
  - [ ] Validacao de query params (q obrigatorio, country default BR, limit default 20)
  - [ ] Autenticacao do usuario (session check)
  - [ ] Chamada ao AdLibraryService
  - [ ] Resposta tipada com resultados ou fallback
- [ ] Implementar fallback gracioso:
  - [ ] Se API falha: retorna cache stale se disponivel
  - [ ] Se sem cache: retorna mensagem "Busca temporariamente indisponivel. Faca upload manual da referencia."
  - [ ] Nunca retorna stack trace ou erro tecnico ao frontend
- [ ] Implementar registro de `creative_references` quando aluno seleciona referencia:
  - [ ] Endpoint ou logica para salvar referencia selecionada vinculada ao quiz_session_id
  - [ ] Todos os metadados persistidos (source, source_url, ad_copy, start_date, days_active, platform, advertiser_name, search_query)
- [ ] Integrar com Caminho 1A do quiz (secao "Referencias Encontradas" apos Q4)

---

## File List

- `apps/web/lib/services/api-gateway.ts` — Gateway generico com cache + retry + fallback (NOVO)
- `apps/web/lib/services/ad-library.ts` — Meta Ad Library API service (NOVO)
- `apps/web/app/api/references/ads/route.ts` — API route GET /api/references/ads (NOVO)
- `packages/db/prisma/schema.prisma` — ja criado na Story 12.1 (referencia)

---

## Definition of Done

- [ ] `AdLibraryService` funciona com Meta Ad Library API real (chamada de teste bem-sucedida)
- [ ] `GET /api/references/ads?q=emagrecimento&country=BR` retorna resultados formatados
- [ ] Resultados ordenados por `days_active DESC`
- [ ] Cache hit na segunda chamada com mesma query (verificavel via log ou resposta)
- [ ] Rate limiter previne chamadas alem de 200/hora (verificavel via teste)
- [ ] Fallback retorna mensagem amigavel, nunca erro tecnico (teste com API indisponivel)
- [ ] `creative_references` registrada corretamente quando aluno seleciona referencia
- [ ] API keys nao expostas em nenhuma resposta ao frontend
- [ ] TypeScript compila sem erros (`tsc --noEmit`)
- [ ] Integracao com Caminho 1A do quiz funcional (secao "Referencias Encontradas")

---

## Dependencies

- Story 12.1 — tabelas `creative_references`, `search_cache`, `api_configurations` existem
- Epic 1 (Foundation) — autenticacao, sessao de usuario
- Epic 6 — Quiz engine e caminhos condicionais (1A/1B) — integracao no Caminho 1A
