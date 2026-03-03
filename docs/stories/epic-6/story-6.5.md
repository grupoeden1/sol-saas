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

Esta story implementa o endpoint mais importante do produto: a geração do roteiro. Coleta TODO o contexto (onboarding + quiz + video analysis) e gera o roteiro via OpenAI com streaming SSE. Usa a mesma infraestrutura de créditos do chat (gate pré-chamada + dedução real), e cria uma Conversation (Roteiro) vinculada à QuizSession.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | `POST /api/quiz/generate` aceita `{ quizSessionId }` e valida autenticação + ownership | TODO |
| 2 | Carrega: OnboardingProfile (via QuizSession.onboardingProfileId) + todas as QuizAnswers + VideoAnalysis (se path2 = MODELED e análise completed) | TODO |
| 3 | `buildQuizPrompt(onboarding, answers, videoAnalysis?)` monta prompt estruturado com system prompt específico por combinação de caminhos | TODO |
| 4 | 4 system prompts definidos: AD_MODELED, AD_FROM_SCRATCH, ORGANIC_MODELED, ORGANIC_FROM_SCRATCH | TODO |
| 5 | Conta `totalInputTokens` via tiktoken (system prompt + user prompt completo) | TODO |
| 6 | Gate de créditos: `calculateMaxCredits(totalInputTokens, config)` → verifica `user.credits >= maxCredits` → 402 se insuficiente | TODO |
| 7 | Chamada OpenAI com streaming SSE usando `max_completion_tokens: config.maxOutputTokens` | TODO |
| 8 | Cria Conversation com: `title` (gerado do contexto), `quizSessionId`, `userId` | TODO |
| 9 | Primeira mensagem `assistant` na Conversation = roteiro completo gerado pela IA | TODO |
| 10 | Marca QuizSession status `COMPLETED` e `completedAt` | TODO |
| 11 | Deduz créditos reais via `deductCredits()` com metadados completos (inputTokens, outputTokens, modelUsed, snapshot config) | TODO |
| 12 | Retorna headers: `X-Credits-Remaining`, `X-Credits-Used`, `X-Conversation-Id` | TODO |
| 13 | Se chamada OpenAI falhar antes de output, nenhum crédito é deduzido e QuizSession permanece IN_PROGRESS | TODO |
| 14 | Aluno é redirecionado para `/roteiros/[conversationId]` após geração | TODO |

---

## Technical Notes

- **API Route:** `apps/web/src/app/api/quiz/generate/route.ts`
- **Prompt Builder:** `lib/quiz/prompt-builder.ts` — `buildQuizPrompt()` retorna `{ systemPrompt, userPrompt }`
- **System Prompts:** 4 variantes em `lib/quiz/system-prompts/` ou inline em prompt-builder
- **Streaming:** Mesma infra do `POST /api/chat` — SSE via ReadableStream, Vercel AI SDK (lib only)
- **Créditos:** Mesmas funções de `lib/pricing.ts` e `lib/credits.ts`
- **Referência:** Architecture v7.0 — "Quiz Prompt Builder" e workflow "Quiz → Roteiro Generation"
