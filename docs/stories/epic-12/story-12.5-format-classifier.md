# User Story: Classificacao Automatica de Formato

**ID:** 12.5
**Epic:** 12 — Ad Intelligence & Content Discovery
**Status:** draft
**Priority:** High
**Agent:** @sm (draft) -> @dev (implement) -> @qa (review)
**Depends on:** Story 12.1 (Schema)

---

## Statement

As a developer,
I want the AI to automatically classify the format of any creative reference,
so that the format feeds into the script generation prompt.

---

## Context

Cada referencia criativa (ad ou organica) possui um formato que determina a estrutura do roteiro gerado. A classificacao automatica usa Claude Vision (modelo Haiku para economia) para analisar a midia e retornar um dos 18 formatos do enum `CreativeFormat`. O prompt de classificacao inclui exemplos especificos do mercado brasileiro de infoprodutos (top 5 alimentos, antes/depois dieta, etc.). Classificacoes com confianca LOW exibem badge amarelo "Verificar" para que o aluno possa corrigir manualmente. O formato classificado alimenta diretamente a selecao de modulos contextuais no prompt de geracao (camada 2 do Prompt Architecture). Batch classification limita a 5 resultados automaticos para economia de creditos.

---

## Acceptance Criteria

| # | Criterio | Status |
|---|----------|--------|
| 1 | Funcao `classifyFormat(mediaUrl \| imageBuffer, adCopy?)` envia midia para Claude Vision (`claude-haiku-4-5-20251001`) com prompt de classificacao | TODO |
| 2 | Formatos reconhecidos (enum `CreativeFormat`): `TOP_5`, `BEFORE_AFTER`, `THIS_OR_THAT`, `TESTIMONIAL`, `TUTORIAL`, `INFORMATIVE`, `LOW_FI`, `PROVOCATION`, `QUESTION`, `RANKING`, `CURIOSITY`, `TRANSFORMATION`, `BEHIND_SCENES`, `UNBOXING`, `POV`, `STORYTELLING`, `CHALLENGE`, `OTHER` (18 valores) | TODO |
| 3 | Retorno tipado: `{ format: CreativeFormat, confidence: 'HIGH' \| 'MEDIUM' \| 'LOW', reasoning: string }` | TODO |
| 4 | Se confianca `LOW`: UI mostra classificacao com badge amarelo "Verificar" + dropdown para aluno corrigir. Se `HIGH`: mostra como definitivo com opcao de editar | TODO |
| 5 | Formato classificado (ou corrigido) salvo em `creative_references.format_classification` (ou `format_corrected` se aluno alterou) | TODO |
| 6 | Formato alimenta diretamente a selecao de modulos contextuais no prompt de geracao (camada 2 do Prompt Architecture) — Ex: formato `TOP_5` ativa modulo "estrutura de lista com contagem regressiva" | TODO |
| 7 | Custo em creditos: classificacao via Haiku e barata (~0.5-1 credito por classificacao). Deduzido do saldo. Gate pre-chamada funciona normalmente | TODO |
| 8 | Batch classification: quando busca retorna 20 resultados, sistema classifica apenas os 5 primeiros automaticamente (economia de creditos). Demais classificados sob demanda quando aluno clica | TODO |
| 9 | Classification cache: se mesma `source_url` ja foi classificada, reutiliza resultado sem nova chamada IA | TODO |

---

## Technical Notes

- **Modelo:** `claude-haiku-4-5-20251001` para economia (~0.5-1 credito por classificacao). Nao usar Sonnet/Opus para classificacao — custo injustificavel para tarefa simples
- **Prompt de classificacao:** deve incluir exemplos especificos do mercado brasileiro de infoprodutos:
  - `TOP_5`: "Top 5 alimentos para emagrecer", "3 habitos que mudaram minha vida"
  - `BEFORE_AFTER`: "Antes e depois da dieta", "Como eu era vs como eu sou"
  - `TESTIMONIAL`: "Depoimento de aluno", "Resultado real de cliente"
  - `LOW_FI`: "Gravado no celular, sem edicao profissional"
  - `PROVOCATION`: "Voce ainda acredita nisso?", "Para de fazer isso AGORA"
- **Confianca LOW:** exibe badge amarelo "Verificar" na UI. Aluno pode corrigir via dropdown com os 18 valores do enum. Correcao salva em `format_corrected`
- **Batch:** sistema classifica apenas top 5 resultados automaticamente. Demais ficam com `format_classification: null` ate aluno clicar no card (classificacao sob demanda)
- **Cache:** lookup por `source_url` antes de chamar IA. Se ja existe classificacao para mesma URL, reutiliza sem gastar creditos
- **Credit gate:** verificar saldo antes de classificar. Se saldo insuficiente, mostrar mensagem e nao classificar
- **Referencia:** PRD Addendum v12.0 — Epic 12, Story 12.5

---

## Tasks / Subtasks

- [ ] Criar `FormatClassifier` service (`apps/web/src/services/references/format-classifier.ts`)
  - [ ] Implementar funcao `classifyFormat(mediaUrl | imageBuffer, adCopy?)` que chama Claude Vision Haiku
  - [ ] Construir prompt de classificacao com exemplos do mercado brasileiro
  - [ ] Parsear resposta da IA para extrair format, confidence e reasoning
  - [ ] Validar que format retornado pertence ao enum `CreativeFormat`
- [ ] Definir enum `CreativeFormat` com 18 valores (`apps/web/src/types/references.ts`)
  - [ ] TOP_5, BEFORE_AFTER, THIS_OR_THAT, TESTIMONIAL, TUTORIAL, INFORMATIVE, LOW_FI, PROVOCATION, QUESTION, RANKING, CURIOSITY, TRANSFORMATION, BEHIND_SCENES, UNBOXING, POV, STORYTELLING, CHALLENGE, OTHER
- [ ] Criar prompt de classificacao para Claude Vision Haiku (`apps/web/src/prompts/format-classification.ts`)
  - [ ] Incluir descricao de cada formato com exemplos brasileiros
  - [ ] Instruir modelo a retornar JSON com format, confidence, reasoning
  - [ ] Incluir instrucoes para quando imagem e ambigua (retornar LOW confidence)
- [ ] Implementar funcao de batch classification (`classifyBatch`)
  - [ ] Receber array de resultados, classificar apenas os 5 primeiros
  - [ ] Usar `Promise.allSettled` para classificacoes paralelas
  - [ ] Retornar resultados com classificacao nos 5 primeiros e null nos demais
- [ ] Implementar cache de classificacao
  - [ ] Lookup por `source_url` antes de chamar IA
  - [ ] Salvar classificacao em `creative_references.format_classification` apos chamada
  - [ ] Reutilizar resultado cacheado sem nova chamada
- [ ] Integrar credit gate
  - [ ] Verificar saldo de creditos antes de classificar
  - [ ] Deduzir creditos apos classificacao bem-sucedida
  - [ ] Se saldo insuficiente, retornar erro tipado sem classificar
- [ ] Criar componente de UI para exibicao de formato (`apps/web/src/components/references/FormatBadge.tsx`)
  - [ ] Badge verde para HIGH confidence
  - [ ] Badge amarelo "Verificar" para LOW confidence com dropdown de correcao
  - [ ] Badge azul para MEDIUM confidence com opcao de editar

---

## File List

| Arquivo | Acao |
|---------|------|
| `apps/web/src/services/references/format-classifier.ts` | Criar — FormatClassifier service com classifyFormat e classifyBatch |
| `apps/web/src/types/references.ts` | Atualizar — adicionar enum CreativeFormat (18 valores) e tipos de retorno |
| `apps/web/src/prompts/format-classification.ts` | Criar — prompt de classificacao com exemplos brasileiros |
| `apps/web/src/components/references/FormatBadge.tsx` | Criar — componente de badge com niveis de confianca |
| `apps/web/src/lib/credits/credit-gate.ts` | Atualizar — integrar gate para classificacao de formato |

---

## Definition of Done

- [ ] Funcao `classifyFormat` retorna formato valido do enum `CreativeFormat` para diferentes tipos de midia
- [ ] Niveis de confianca (HIGH/MEDIUM/LOW) funcionam e refletem corretamente na UI
- [ ] Badge amarelo "Verificar" aparece para LOW confidence com dropdown funcional de correcao
- [ ] Cache previne chamadas duplicadas a IA para mesma `source_url`
- [ ] Batch classification limita a 5 classificacoes automaticas
- [ ] Credit gate deduz creditos corretamente (~0.5-1 por classificacao)
- [ ] Prompt inclui exemplos especificos do mercado brasileiro de infoprodutos
- [ ] Formato classificado persiste em `creative_references.format_classification`
- [ ] TypeScript compila sem erros
- [ ] Testes unitarios para classifyFormat com mock de Claude Vision response
- [ ] Teste para batch classification verificando limite de 5

---

## Dependencies

- Story 12.1 (Schema) — tabela `creative_references` com campo `format_classification` existe
- Epic 8 (Credits) — credit gate e sistema de deducao de creditos funcional
- Env var: `ANTHROPIC_API_KEY` (ja existente para outras funcionalidades de IA)
