# User Story: Database Schema — References & Integrations

**ID:** 12.1
**Epic:** 12 — Ad Intelligence & Content Discovery
**Status:** draft
**Priority:** Critical (blocks all other stories in Epic 12)
**Agent:** @sm (draft) -> @dev (implement) -> @qa (review)
**Depends on:** Epic 1 (Foundation)

---

## Statement

As a developer,
I want the database schema for creative references, API configurations and search cache,
so that reference data can be stored and used for script generation.

---

## Context

O Epic 12 (Ad Intelligence & Content Discovery) requer 4 novas tabelas e 2 novos enums para suportar a plataforma de descoberta e analise de referencias criativas. A tabela `creative_references` armazena cada referencia (ad, organico, link analisado, upload manual) vinculada ao usuario e opcionalmente ao quiz session. A tabela `search_cache` evita chamadas repetidas as APIs externas com TTL configuravel (24h para ads, 12h para organicos). A tabela `api_configurations` permite ao admin ativar/desativar APIs sem deploy e armazena apenas o NOME da env var (nunca a chave em si). A tabela `competitor_profiles` armazena perfis de concorrentes analisados pelos alunos. Os enums `ReferenceSource` (META_AD_LIBRARY, TIKTOK, YOUTUBE, INSTAGRAM, MANUAL_UPLOAD, ENRICHMENT) e `MediaType` (VIDEO, IMAGE) tipam os dados de forma segura. Esta story bloqueia todas as demais do Epic 12.

---

## Acceptance Criteria

| # | Criterio | Status |
|---|----------|--------|
| 1 | Migration Prisma cria tabela `creative_references` com: `id`, `user_id` (FK), `quiz_session_id` (FK, nullable), `source` (enum: `META_AD_LIBRARY` \| `TIKTOK` \| `YOUTUBE` \| `INSTAGRAM` \| `MANUAL_UPLOAD` \| `ENRICHMENT`), `source_url` (string, nullable), `source_id` (string, nullable — ID externo da plataforma), `media_type` (enum: `VIDEO` \| `IMAGE`), `media_url` (string, nullable — URL do preview/midia), `ad_copy` (text, nullable), `start_date` (datetime, nullable — data inicio do ad), `days_active` (int, nullable — calculado), `engagement_metrics` (JSON, nullable — views, likes, shares, comments), `platform` (string — facebook, instagram, tiktok, youtube), `format_classification` (string, nullable — classificado pela IA), `format_corrected` (string, nullable — corrigido pelo aluno), `structure_analysis` (text, nullable — analise IA de gancho, CTA, cortes), `advertiser_name` (string, nullable), `search_query` (string — termo usado na busca), `created_at` | TODO |
| 2 | Migration cria tabela `search_cache` com: `id`, `query_hash` (string, unique — hash de query+source+country), `source` (enum), `results` (JSON — resultados serializados), `expires_at` (datetime), `created_at`. TTL: 24h para ads, 12h para organico | TODO |
| 3 | Migration cria tabela `api_configurations` com: `id`, `provider` (string, unique — meta, tiktok, youtube, instagram, enrichment), `enabled` (boolean, default true), `api_key_env` (string — nome da env var, nunca a chave em si), `rate_limit_per_hour` (int), `config` (JSON, nullable — configuracoes extras), `updated_at`, `updated_by` (string). Seeds iniciais para as 4 APIs oficiais | TODO |
| 4 | Migration cria tabela `competitor_profiles` com: `id`, `user_id` (FK), `platform` (string), `profile_handle` (string), `profile_url` (string), `last_fetched_at` (datetime, nullable), `top_posts` (JSON, nullable), `created_at` | TODO |
| 5 | Relacoes: `user.creativeReferences`, `quizSession.creativeReferences`, `user.competitorProfiles` | TODO |
| 6 | Indices: `(source, search_query)`, `(user_id, created_at)`, `(quiz_session_id)` na creative_references; `(query_hash)`, `(expires_at)` na search_cache; `(user_id, platform)` na competitor_profiles | TODO |

---

## Technical Notes

- **Schema:** `packages/db/prisma/schema.prisma`
- **Enums novos:** `ReferenceSource` (META_AD_LIBRARY, TIKTOK, YOUTUBE, INSTAGRAM, MANUAL_UPLOAD, ENRICHMENT), `MediaType` (VIDEO, IMAGE)
- **IDs:** Todos os `id` usam `@default(cuid())` — padrao do projeto
- **Timestamps:** `created_at` usa `@default(now())`, `updated_at` usa `@updatedAt` onde aplicavel
- **JSON fields:** `engagement_metrics` (creative_references), `results` (search_cache), `config` (api_configurations), `top_posts` (competitor_profiles) sao do tipo `Json` do Prisma
- **queryHash:** SHA-256 de `query + source + country` — garante unicidade e busca rapida
- **api_key_env:** Armazena o NOME da variavel de ambiente (ex: `META_AD_LIBRARY_ACCESS_TOKEN`), NUNCA a chave em si. O service le `process.env[api_key_env]` em runtime
- **Seeds:** Tabela `api_configurations` recebe 4 seeds iniciais:
  - `meta` — enabled: true, api_key_env: `META_AD_LIBRARY_ACCESS_TOKEN`, rate_limit_per_hour: 200
  - `youtube` — enabled: true, api_key_env: `YOUTUBE_API_KEY`, rate_limit_per_hour: 100
  - `tiktok` — enabled: false (requer aprovacao), api_key_env: `TIKTOK_RESEARCH_CLIENT_KEY`, rate_limit_per_hour: 1000 (diario, adaptado para hourly display)
  - `instagram` — enabled: true, api_key_env: `INSTAGRAM_ACCESS_TOKEN`, rate_limit_per_hour: 200
- **Migration:** `prisma migrate dev --name add_ad_intelligence_schema`
- **Referencia:** PRD v12.0 — Epic 12, Story 12.1

---

## Tasks / Subtasks

- [ ] Criar enum `ReferenceSource` (META_AD_LIBRARY, TIKTOK, YOUTUBE, INSTAGRAM, MANUAL_UPLOAD, ENRICHMENT) no schema Prisma
- [ ] Criar enum `MediaType` (VIDEO, IMAGE) no schema Prisma
- [ ] Criar modelo `CreativeReference` com todos os campos, FKs para User e QuizSession
- [ ] Criar modelo `SearchCache` com queryHash unique e campos de cache
- [ ] Criar modelo `ApiConfiguration` com provider unique e campos de configuracao
- [ ] Criar modelo `CompetitorProfile` com FK para User
- [ ] Adicionar relacoes no modelo User: `creativeReferences CreativeReference[]`, `competitorProfiles CompetitorProfile[]`
- [ ] Adicionar relacao no modelo QuizSession: `creativeReferences CreativeReference[]`
- [ ] Adicionar indices compostos: `@@index([source, searchQuery])`, `@@index([userId, createdAt])`, `@@index([quizSessionId])` na CreativeReference
- [ ] Adicionar indices: `@@index([expiresAt])` na SearchCache (queryHash ja e unique)
- [ ] Adicionar indice: `@@index([userId, platform])` na CompetitorProfile
- [ ] Criar seeds para `api_configurations` com as 4 APIs oficiais (meta, youtube, tiktok, instagram)
- [ ] Rodar `prisma migrate dev --name add_ad_intelligence_schema`
- [ ] Rodar `prisma generate` e verificar tipos TypeScript gerados

---

## File List

- `packages/db/prisma/schema.prisma` — enums + 4 modelos novos + relacoes em User e QuizSession
- `packages/db/prisma/seed.ts` — seeds para api_configurations
- `packages/db/prisma/migrations/[timestamp]_add_ad_intelligence_schema/migration.sql` — gerado pelo Prisma

---

## Definition of Done

- [ ] Migration executa sem erros em banco limpo (`prisma migrate dev`)
- [ ] Migration executa sem erros em banco com dados existentes (retrocompatibilidade)
- [ ] Todos os 4 modelos criados com campos corretos no schema gerado
- [ ] Enums `ReferenceSource` e `MediaType` disponiveis no Prisma Client
- [ ] Relacoes `user.creativeReferences`, `quizSession.creativeReferences`, `user.competitorProfiles` funcionam
- [ ] Indices compostos criados e visiveis na migration SQL
- [ ] Seed cria 4 registros em `api_configurations` (meta, youtube, tiktok, instagram)
- [ ] `prisma generate` completa sem erros
- [ ] Tipos TypeScript gerados pelo Prisma estao acessiveis e corretos
- [ ] TypeScript compila sem erros (`tsc --noEmit`)

---

## Dependencies

- Epic 1 (Foundation) — banco Prisma configurado, modelos User e QuizSession existem
- Tabela `quiz_sessions` existe (FK para quizSessionId)
