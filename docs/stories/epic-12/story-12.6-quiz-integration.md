# User Story: Integracao com Quiz: Reference Picker

**ID:** 12.6
**Epic:** 12 — Ad Intelligence & Content Discovery
**Status:** draft
**Priority:** Critical (core feature connecting everything)
**Agent:** @sm (draft) -> @dev (implement) -> @qa (review)
**Depends on:** Story 12.2 (Meta Ad Library), Story 12.3 (Link Analysis), Story 12.4 (Organic Search), Story 12.5 (Format Classifier), Epic 6 (Quiz)

---

## Statement

As a student,
I want to pick a reference from search results directly in the quiz flow,
so that the AI uses my chosen reference to generate the script.

---

## Context

O ReferencePicker e o componente central que conecta todo o Epic 12 ao fluxo do quiz. Ele aparece entre o Quiz Inicial e os Caminhos 2A/2B, oferecendo ao aluno 4 opcoes: (a) buscar e selecionar referencia via API, (b) colar link de post social, (c) fazer upload manual, (d) pular e criar do zero. O caminho depende da escolha anterior: Caminho 1A (Anuncio) mostra busca de ads (Story 12.2), Caminho 1B (Organico) mostra busca de virais (Story 12.4). A referencia selecionada e automaticamente classificada por formato (Story 12.5) e seus metadados alimentam o prompt de geracao do roteiro. O campo de busca vem pre-preenchido com o nicho do onboarding para reduzir friccao. A UX usa split view no desktop (busca a esquerda, preview a direita) e tabs no mobile.

---

## Acceptance Criteria

| # | Criterio | Status |
|---|----------|--------|
| 1 | Componente `<ReferencePicker />` integrado ao quiz entre a secao Quiz Inicial e os Caminhos 2A/2B | TODO |
| 2 | Se Caminho 1A (Anuncio): exibe busca de ads (Story 12.2) com campo de busca pre-preenchido com nicho do onboarding. Se Caminho 1B (Organico): exibe busca de virais (Story 12.4) com campo pre-preenchido | TODO |
| 3 | Aluno pode: (a) selecionar referencia da busca, (b) colar link de post social (Story 12.3), (c) fazer upload manual de video (Caminho 2A existente), (d) pular e criar do zero (Caminho 2B) | TODO |
| 4 | Ao selecionar referencia da busca ou via link: `creative_references` criada e vinculada ao quiz session, formato classificado automaticamente (Story 12.5), se video e aluno quer analise profunda -> redirect para upload manual (pipeline Epic 7), se imagem ou thumbnail suficiente -> analise de estrutura via Vision e segue no quiz | TODO |
| 5 | A referencia selecionada e sua analise alimentam o prompt de geracao do roteiro (Story 6.5): formato classificado, ad copy, estrutura analisada, metadados de engajamento. Adicionados como bloco de contexto no prompt | TODO |
| 6 | Quiz session registra `reference_source` (enum: `API_SEARCH` \| `LINK_ANALYSIS` \| `MANUAL_UPLOAD` \| `NONE`) para analytics | TODO |
| 7 | UX: tela dividida — busca/resultados a esquerda, preview da referencia selecionada a direita. Mobile: tabs entre busca e preview | TODO |
| 8 | Loading states para: busca em andamento, classificacao de formato, analise de link. Empty state quando busca nao retorna resultados: "Nenhuma referencia encontrada. Tente outro termo ou faca upload manual." | TODO |

---

## Technical Notes

- **Posicao no fluxo:** ReferencePicker aparece entre Quiz Inicial e Caminhos 2A/2B. E uma etapa intermediaria que influencia todo o conteudo gerado a seguir
- **Pre-fill de busca:** campo de busca pre-preenchido com o nicho extraido do onboarding (`quizSession.onboarding.nicho`). Aluno pode editar antes de buscar
- **Referencia selecionada alimenta prompt:** o bloco de contexto no prompt inclui:
  - `format`: formato classificado (ex: TOP_5)
  - `ad_copy`: texto do anuncio/post (se disponivel)
  - `structure`: estrutura analisada (hook, body, CTA)
  - `engagement`: metricas de engajamento (views, likes, comments)
  - `platform`: plataforma de origem
- **reference_source:** enum adicionado ao modelo QuizSession para rastrear como o aluno obteve a referencia. Util para analytics e entender padroes de uso
- **Split view desktop / tabs mobile:** usar responsive layout. Desktop: grid 2 colunas (60/40). Mobile: tabs "Buscar" e "Preview" com navegacao entre eles
- **Opcao (d) pular:** aluno pode seguir sem referencia. Nesse caso, `reference_source = NONE` e prompt gerado sem bloco de contexto de referencia (comportamento atual do quiz)
- **Referencia:** PRD Addendum v12.0 — Epic 12, Story 12.6

---

## Tasks / Subtasks

- [ ] Criar componente `ReferencePicker` (`apps/web/src/components/quiz/ReferencePicker.tsx`)
  - [ ] Layout split view desktop (grid 60/40): painel de busca + painel de preview
  - [ ] Layout mobile: tabs "Buscar" e "Preview"
  - [ ] 4 opcoes de acao: buscar, colar link, upload, pular
  - [ ] Pre-preencher campo de busca com nicho do onboarding
  - [ ] Logica condicional: Caminho 1A mostra busca de ads, Caminho 1B mostra busca de virais
- [ ] Criar componente `ReferenceCard` (`apps/web/src/components/quiz/ReferenceCard.tsx`)
  - [ ] Card compacto para lista de resultados com thumbnail, titulo, plataforma badge, metricas
  - [ ] Estado selecionado (borda highlight)
  - [ ] Badge de formato classificado (se disponivel)
- [ ] Criar componente `ReferenceGrid` (`apps/web/src/components/quiz/ReferenceGrid.tsx`)
  - [ ] Grid responsivo de ReferenceCards
  - [ ] Loading skeleton durante busca
  - [ ] Empty state: "Nenhuma referencia encontrada. Tente outro termo ou faca upload manual."
- [ ] Criar rota `POST /api/references/select` (`apps/web/src/app/api/references/select/route.ts`)
  - [ ] Receber: referenceData, quizSessionId, source (API_SEARCH | LINK_ANALYSIS | MANUAL_UPLOAD)
  - [ ] Criar registro em `creative_references` vinculado ao quiz session
  - [ ] Disparar classificacao de formato automatica (Story 12.5)
  - [ ] Atualizar `quiz_session.reference_source`
  - [ ] Retornar referencia criada com classificacao
- [ ] Adicionar enum `reference_source` ao modelo QuizSession
  - [ ] Valores: `API_SEARCH`, `LINK_ANALYSIS`, `MANUAL_UPLOAD`, `NONE`
  - [ ] Default: `NONE`
  - [ ] Migration Prisma para adicionar campo
- [ ] Integrar contexto de referencia no prompt builder (Story 6.5)
  - [ ] Criar bloco de contexto `referenceContext` com formato, ad_copy, structure, engagement, platform
  - [ ] Adicionar bloco ao prompt quando referencia existir
  - [ ] Quando `reference_source = NONE`, nao adicionar bloco (comportamento atual)
- [ ] Atualizar quiz sidebar e progress bar
  - [ ] Adicionar etapa "Referencia" na barra de progresso entre Quiz Inicial e Caminhos
  - [ ] Mostrar indicador visual de referencia selecionada ou pulada
- [ ] Implementar loading states
  - [ ] Skeleton loading durante busca de resultados
  - [ ] Spinner durante classificacao de formato
  - [ ] Loading bar durante analise de link
  - [ ] Transicoes suaves entre estados

---

## File List

| Arquivo | Acao |
|---------|------|
| `apps/web/src/components/quiz/ReferencePicker.tsx` | Criar — componente principal do Reference Picker |
| `apps/web/src/components/quiz/ReferenceCard.tsx` | Criar — card individual de referencia |
| `apps/web/src/components/quiz/ReferenceGrid.tsx` | Criar — grid responsivo de cards |
| `apps/web/src/app/api/references/select/route.ts` | Criar — rota POST para selecionar referencia |
| `packages/db/prisma/schema.prisma` | Atualizar — adicionar enum ReferenceSource e campo reference_source ao QuizSession |
| `apps/web/src/services/quiz/prompt-builder.ts` | Atualizar — adicionar bloco de contexto de referencia ao prompt |
| `apps/web/src/components/quiz/QuizSidebar.tsx` | Atualizar — adicionar etapa "Referencia" na barra de progresso |
| `apps/web/src/components/quiz/QuizProgressBar.tsx` | Atualizar — incluir step de referencia |

---

## Definition of Done

- [ ] Componente `ReferencePicker` renderiza corretamente no fluxo do quiz entre Quiz Inicial e Caminhos
- [ ] Caminho 1A exibe busca de ads e Caminho 1B exibe busca de virais
- [ ] As 4 opcoes (buscar, colar link, upload, pular) funcionam end-to-end
- [ ] Referencia selecionada persiste em `creative_references` vinculada ao quiz session
- [ ] Formato classificado automaticamente apos selecao (Story 12.5)
- [ ] Prompt de geracao inclui bloco de contexto com dados da referencia (formato, ad copy, estrutura, engajamento)
- [ ] Campo `reference_source` registrado corretamente no quiz session
- [ ] Layout responsivo: split view desktop, tabs mobile
- [ ] Loading states funcionam para busca, classificacao e analise de link
- [ ] Empty state exibido quando busca nao retorna resultados
- [ ] TypeScript compila sem erros
- [ ] Testes de componente para ReferencePicker (render, interacao, estados)
- [ ] Teste de integracao para rota POST /api/references/select

---

## Dependencies

- Story 12.2 (Meta Ad Library) — busca de ads para Caminho 1A
- Story 12.3 (Link Analysis) — analise de link colado pelo aluno
- Story 12.4 (Organic Search) — busca de virais para Caminho 1B
- Story 12.5 (Format Classifier) — classificacao automatica de formato
- Epic 6 (Quiz) — fluxo de quiz existente, modelo QuizSession, prompt builder (Story 6.5)
- Epic 7 (Video Pipeline) — redirect para upload manual quando aluno quer analise profunda de video
