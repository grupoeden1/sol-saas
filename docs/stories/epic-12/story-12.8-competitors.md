# User Story: Analise de Perfis de Concorrentes

**ID:** 12.8
**Epic:** 12 — Ad Intelligence & Content Discovery
**Status:** draft
**Agent:** @sm (draft) -> @dev (implement) -> @qa (review)
**Priority:** Medium
**Depends on:** Stories 12.1, 12.5

---

## Statement

As a student,
I want to analyze competitor profiles by seeing their top posts ordered by engagement, and use any of those posts as a creative reference,
so that I can learn from successful competitors and apply proven strategies to my own content.

---

## Context

A funcionalidade de analise de concorrentes (`/references/competitors`) permite ao aluno cadastrar ate 5 perfis de concorrentes para monitoramento. Para cada perfil cadastrado, o sistema busca os top posts (ate 5) ordenados por engagement e executa classificacao em batch (tipo de conteudo, formato, tom). O aluno pode clicar em "Usar como Referencia" em qualquer post de concorrente para criar automaticamente uma `creative_reference` vinculada ao seu perfil. Esta feature e complementar ao fluxo principal (fora do quiz) e nao consome creditos adicionais. O limite de 5 perfis e validado server-side para evitar abuso. O refresh de dados respeita rate limits das APIs externas.

---

## Acceptance Criteria

| # | Criterio | Status |
|---|----------|--------|
| 1 | Pagina `/references/competitors` exibe lista de perfis de concorrentes cadastrados pelo usuario, com nome, plataforma, e contagem de top posts | TODO |
| 2 | `POST /api/references/competitors` permite cadastrar novo perfil de concorrente — busca e armazena top posts ordenados por engagement | TODO |
| 3 | Posts de cada concorrente sao exibidos ordenados por engagement (curtidas + comentarios + compartilhamentos) decrescente | TODO |
| 4 | Botao "Usar como Referencia" em cada post cria uma `creative_reference` vinculada ao usuario, com dados do post pre-preenchidos | TODO |
| 5 | Tabela/modelo `competitor_profiles` armazena perfil com `top_posts` (JSON array dos top 5 posts com metricas de engagement) | TODO |
| 6 | Limite de 5 perfis de concorrentes por usuario — validado server-side; retorna 400 com mensagem descritiva ao exceder | TODO |
| 7 | Link de navegacao no sidebar (`/references/competitors`) adicionado ao menu lateral do dashboard | TODO |

---

## Technical Notes

- **Service:** `apps/web/src/lib/services/competitor-analyzer.ts` — `CompetitorAnalyzer` class com metodos: `analyzeProfile(url)`, `refreshProfile(id)`, `getTopPosts(profileId)`
- **Pagina:** `apps/web/src/app/(dashboard)/references/competitors/page.tsx`
- **API Routes:**
  - `apps/web/src/app/api/references/competitors/route.ts` — GET (lista do usuario) / POST (cadastrar novo)
  - `apps/web/src/app/api/references/competitors/[id]/route.ts` — DELETE (remover perfil)
  - `apps/web/src/app/api/references/competitors/[id]/refresh/route.ts` — POST (atualizar dados)
- **Feature complementar:** fora do fluxo de quiz, acessivel como ferramenta independente
- **Limite de 5 perfis:** validacao server-side via `COUNT` de `competitor_profiles` do usuario antes de INSERT
- **Classificacao batch:** para cada concorrente, classifica os top 5 posts (tipo de conteudo, formato, tom) usando o mesmo classificador das creative_references
- **Refresh:** respeita rate limits das APIs externas (Meta, YouTube) — implementar throttling ou retry com backoff
- **"Usar como Referencia":** cria registro em `creative_references` com `source: 'competitor'`, copiando dados relevantes do post

---

## File List

| Arquivo | Acao |
|---------|------|
| `apps/web/src/lib/services/competitor-analyzer.ts` | Criar — service CompetitorAnalyzer |
| `apps/web/src/app/(dashboard)/references/competitors/page.tsx` | Criar — pagina principal |
| `apps/web/src/app/(dashboard)/references/competitors/components/CompetitorCard.tsx` | Criar — card de perfil de concorrente |
| `apps/web/src/app/(dashboard)/references/competitors/components/PostCard.tsx` | Criar — card de post com botao "Usar como Referencia" |
| `apps/web/src/app/api/references/competitors/route.ts` | Criar — GET (lista) / POST (cadastrar) |
| `apps/web/src/app/api/references/competitors/[id]/route.ts` | Criar — DELETE (remover perfil) |
| `apps/web/src/app/api/references/competitors/[id]/refresh/route.ts` | Criar — POST (refresh dados) |
| `apps/web/src/app/(dashboard)/layout.tsx` ou sidebar component | Atualizar — adicionar link de navegacao |

---

## Tasks / Subtasks

- [ ] Criar service `CompetitorAnalyzer` (`competitor-analyzer.ts`) com metodos `analyzeProfile`, `refreshProfile`, `getTopPosts`
- [ ] Criar pagina `/references/competitors` com listagem de perfis cadastrados
- [ ] Criar API route `GET /api/references/competitors` — lista perfis do usuario autenticado
- [ ] Criar API route `POST /api/references/competitors` — cadastra novo perfil com validacao de limite (max 5)
- [ ] Criar API route `DELETE /api/references/competitors/[id]` — remove perfil do usuario
- [ ] Criar API route `POST /api/references/competitors/[id]/refresh` — atualiza top posts respeitando rate limits
- [ ] Implementar validacao de limite de 5 perfis server-side (COUNT antes de INSERT)
- [ ] Implementar fluxo "Usar como Referencia" — cria `creative_reference` a partir de post de concorrente
- [ ] Implementar classificacao batch dos top 5 posts de cada concorrente (tipo, formato, tom)
- [ ] Adicionar link de navegacao no sidebar do dashboard (`/references/competitors`)

---

## Definition of Done

- [ ] CRUD completo de perfis de concorrentes funciona (criar, listar, deletar, refresh)
- [ ] Limite de 5 perfis por usuario enforced server-side (retorna 400 ao exceder)
- [ ] Classificacao batch executa corretamente para top 5 posts de cada concorrente
- [ ] Botao "Usar como Referencia" cria `creative_reference` com dados do post pre-preenchidos
- [ ] Posts exibidos ordenados por engagement decrescente
- [ ] Link de navegacao no sidebar adicionado e funcional
- [ ] Refresh respeita rate limits das APIs externas
- [ ] TypeScript strict sem erros

---

## Dependencies

- Story 12.1 — schema base (`search_cache`, modelos de referencia) e modelo `competitor_profiles`
- Story 12.5 — classificacao de conteudo (reutilizado para batch classification dos posts)
