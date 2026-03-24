# User Story: Geração de Roteiro via Quiz

**ID:** 6.5
**Epic:** 6 - Quiz & Onboarding
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 6.1 (Schema), Story 6.3 (Quiz Engine), Story 7.2 (VideoAnalysis schema — se 2A)

---

## Statement

As a student,
I want the AI to generate a complete script based on all my quiz answers,
so that I get a personalized creative script without writing prompts manually.

---

## Context

Esta story implementa o endpoint mais importante do produto: a geração do roteiro. Coleta TODO o contexto (onboarding + quiz + video analysis), executa classificação automática de mercado (awareness/sophistication via Haiku), seleciona módulos contextuais dinamicamente e gera o roteiro via Claude API com streaming SSE. Usa a mesma infraestrutura de créditos do chat (gate pré-chamada + dedução real), e cria uma Conversation (Roteiro) vinculada à QuizSession.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | `POST /api/quiz/generate` aceita `{ quizSessionId }` e valida autenticação + ownership | TODO |
| 2 | Carrega: OnboardingProfile (via QuizSession.onboardingProfileId) + todas as QuizAnswers + VideoAnalysis (se path2 = MODELED e análise completed) | TODO |
| 3 | **Classificação automática (pré-geração):** antes de montar o prompt, sistema envia respostas do quiz para `claude-haiku-4-5-20251001` que retorna `awarenessLevel` (1-5, Schwartz) e `sophisticationLevel` (1-5) com justificativa. Valores persistidos no `QuizSession` | TODO |
| 4 | **Seleção dinâmica de módulos:** baseado na classificação (awareness + sophistication) e combinação de caminhos (AD/ORGANIC + MODELED/SCRATCH), sistema seleciona módulos contextuais da camada 2 do Prompt Architecture | TODO |
| 5 | **Montagem do prompt dinâmico:** prompt final = Base Fixa (camada 1) + Módulos Contextuais selecionados (camada 2) + Padrões relevantes do nicho (camada 3, se disponíveis via Epic 8) + contexto completo do quiz | TODO |
| 6 | Gate de créditos: `calculateMaxCredits(totalInputTokens, config)` → verifica `user.credits >= maxCredits` → 402 se insuficiente. Custo da chamada de classificação (Haiku) incluído no gate total | TODO |
| 7 | Chamada Claude API (`claude-sonnet-4-5-20250929`) com streaming SSE usando `max_tokens: config.maxOutputTokens` | TODO |
| 8 | Cria Conversation com: `title` (gerado do contexto), `quizSessionId`, `userId` | TODO |
| 9 | Primeira mensagem `assistant` na Conversation = roteiro completo gerado pela IA | TODO |
| 10 | Marca QuizSession status `COMPLETED` e `completedAt` | TODO |
| 11 | Deduz créditos reais via `deductCredits()` com metadados completos (inputTokens, outputTokens, modelUsed, snapshot config) e campo adicional `modules_used` (string[] — lista de módulos contextuais utilizados na geração) | TODO |
| 12 | Retorna headers: `X-Credits-Remaining`, `X-Credits-Used`, `X-Conversation-Id` | TODO |
| 13 | Se chamada Claude API falhar antes de output, nenhum crédito é deduzido e QuizSession permanece IN_PROGRESS | TODO |
| 14 | Aluno é redirecionado para `/roteiros/[conversationId]` após geração | TODO |

---

## Technical Notes

- **API Route:** `apps/web/src/app/api/quiz/generate/route.ts`
- **Prompt Builder:** `lib/quiz/prompt-builder.ts` — `buildQuizPrompt()` retorna `{ systemPrompt, userPrompt }`
- **System Prompts:** 4 variantes em `lib/quiz/system-prompts/` ou inline em prompt-builder
- **Streaming:** Mesma infra do `POST /api/chat` — SSE via ReadableStream, Vercel AI SDK (lib only)
- **Créditos:** Mesmas funções de `lib/pricing.ts` e `lib/credits.ts`
- **Referência:** Architecture v7.0 — "Quiz Prompt Builder" e workflow "Quiz → Roteiro Generation"
