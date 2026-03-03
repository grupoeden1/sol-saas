# User Story: Chat de Iteração sobre Roteiro

**ID:** 6.7
**Epic:** 6 - Quiz & Onboarding
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 6.5 (Geração), Story 2.2 (Chat UI), Story 2.3 (OpenAI Integration)

---

## Statement

As a student,
I want to refine my generated script through chat,
so that I can adjust specific parts without redoing the entire quiz.

---

## Context

Após gerar o roteiro via quiz, o aluno pode enviar mensagens no mesmo Conversation para iterar/refinar. Reutiliza os componentes de chat existentes (Epic 2) com system prompt enriquecido: inclui contexto do quiz + roteiro gerado. Créditos deduzidos por mensagem (mesma lógica do chat).

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Página `/roteiros/[id]` exibe: roteiro completo (1ª mensagem assistant) + área de chat abaixo para iteração | TODO |
| 2 | Input de chat fixo no rodapé — mesmo componente do chat existente (Epic 2) | TODO |
| 3 | System prompt do chat de iteração inclui: contexto do onboarding + respostas do quiz + roteiro gerado | TODO |
| 4 | Cada mensagem de iteração deduz créditos (mesma lógica de FR5 — gate + dedução real) | TODO |
| 5 | Histórico completo visível: roteiro original (1ª mensagem) + todas as iterações subsequentes | TODO |
| 6 | Streaming SSE funcional — respostas aparecem token a token | TODO |
| 7 | Badge de créditos atualiza após cada mensagem via header `X-Credits-Remaining` | TODO |
| 8 | Prompt inline de créditos insuficientes quando saldo não cobre | TODO |
| 9 | Nenhuma regressão no chat existente (chat livre sem quizSessionId) | TODO |

---

## Technical Notes

- **Página:** `apps/web/src/app/(dashboard)/roteiros/[id]/page.tsx`
- **Reutiliza:** Componentes de `components/chat/` — message list, input, streaming handler
- **System prompt enrichment:** Para conversas com `quizSessionId`, carregar OnboardingProfile + QuizAnswers e incluir no system prompt
- **API:** Usa o mesmo `POST /api/chat` existente (com `conversationId`)
- **Lógica de enriquecimento:** Se Conversation.quizSessionId != null → carregar contexto do quiz → incluir no system prompt antes de chamar OpenAI
- **Referência:** Architecture v7.0 — workflow "Quiz → Roteiro Generation" (step 17)
