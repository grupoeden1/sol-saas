# User Story: Classificação Automática de Mercado

**ID:** 6.8
**Epic:** 6 - Quiz & Onboarding
**Status:** TODO
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 6.5 (Geração de Roteiro), Claude API Migration (Phase 2)

---

## Statement

As a developer,
I want the system to automatically classify awareness and sophistication levels before script generation,
so that the prompt is dynamically optimized for each student's market context.

---

## Context

Antes de montar o prompt de geração de roteiro, o sistema precisa entender o nível de consciência do público-alvo (Schwartz 1-5) e a sofisticação do mercado (1-5). Isso é feito via chamada ao `claude-haiku-4-5-20251001` (temperature=0) que analisa as respostas do quiz + onboarding e retorna a classificação com justificativa. O resultado alimenta a seleção dinâmica de módulos contextuais (camada 2 do Prompt Architecture).

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Função `classifyMarket(quizAnswers, onboardingProfile)` envia dados relevantes (produto, público, dor, diferencial, experiência com ads, nicho, objetivo) para `claude-haiku-4-5-20251001` com prompt estruturado de classificação | TODO |
| 2 | Retorno da API parseado em formato tipado: `{ awarenessLevel: 1-5, sophisticationLevel: 1-5, awarenessJustification: string, sophisticationJustification: string }` | TODO |
| 3 | **Awareness Level (Schwartz 1-5):** 1 = Inconsciente (não sabe que tem o problema), 2 = Consciente do problema, 3 = Consciente da solução, 4 = Consciente do produto, 5 = Mais consciente (já conhece e confia). Mapeamento prioriza resposta de O6, mas IA pode ajustar baseado no contexto completo | TODO |
| 4 | **Sophistication Level (1-5):** 1 = Mercado virgem (sem concorrentes), 2 = Poucos concorrentes, 3 = Mercado competitivo, 4 = Mercado saturado, 5 = Mercado cético. IA infere baseado em nicho, faixa de preço, experiência do aluno com ads e contexto descrito | TODO |
| 5 | Campos `awareness_level` e `sophistication_level` persistidos na tabela `quiz_sessions` (novos campos int, nullable) | TODO |
| 6 | Classificação executada automaticamente em `POST /api/quiz/generate` antes da montagem do prompt — se falhar, usa defaults (awareness=3, sophistication=3) e loga warning | TODO |
| 7 | Custo de créditos da chamada de classificação (tokens Haiku) incluído no gate total da geração do roteiro | TODO |
| 8 | Resultado da classificação exibido ao aluno na tela do roteiro gerado: "Nível de consciência: X/5 — [justificativa]", "Sofisticação de mercado: Y/5 — [justificativa]" | TODO |
| 9 | Tempo máximo da chamada de classificação: 10 segundos. Se timeout, usa defaults | TODO |
| 10 | Classificação é determinística para os mesmos inputs (temperature=0 na chamada Haiku) | TODO |

---

## Technical Notes

- **Função:** `apps/web/src/lib/quiz/market-classifier.ts` — `classifyMarket()`
- **Modelo:** `claude-haiku-4-5-20251001` com `temperature: 0`
- **Schema:** Adicionar `awarenessLevel Int?` e `sophisticationLevel Int?` em `QuizSession`
- **Timeout:** 10s via AbortController
- **Fallback:** `{ awarenessLevel: 3, sophisticationLevel: 3 }` — logar warning
- **Integração:** Chamado em `/api/quiz/generate` antes de `buildQuizPrompt()`
- **Referência:** PRD v10.0 — Story 6.8, FR28

---

## Dependencies

- Claude API Migration (Phase 2) — precisa de `@anthropic-ai/sdk`
- Story 6.5 — endpoint `/api/quiz/generate` onde a classificação é chamada
