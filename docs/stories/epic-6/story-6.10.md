# User Story: Pergunta de Contexto Pessoal no Quiz

**ID:** 6.10
**Epic:** 6 - Geração Inteligente de Roteiros
**Status:** TODO
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 6.5 (Geração de Roteiro), ExpertProfile (Epic 4)

---

## Statement

As a student,
I want to be asked about my personal context before script generation,
so that the generated script can be personalized with my expert profile or a specific idea I provide.

---

## Context

No quiz, antes da geração do roteiro, o sistema exibe uma pergunta única de contexto pessoal com opções condicionais ao estado do ExpertProfile do aluno. Se o perfil existe, o aluno pode optar por usá-lo (completo ou com contexto extra) ou ignorá-lo. Se não existe, o aluno pode descrever uma ideia/história ou gerar direto. O resultado (flag + texto opcional) é salvo na quiz_sessions e passado ao Prompt Engine na montagem do prompt.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | No fluxo do quiz, após selecionar perfil de produto e ANTES de gerar, exibir pergunta de contexto pessoal | TODO |
| 2 | Se ExpertProfile existe, exibir: "Deseja usar suas informações pessoais nessa produção?" com 4 opções: (A) Sim — usar meu perfil completo, (B) Sim, mas quero adicionar contexto extra, (C) Não — gerar só com informações do quiz, (D) Quero contextualizar uma ideia/história específica | TODO |
| 3 | Se ExpertProfile NÃO existe, exibir: "Deseja contextualizar seu roteiro?" com 2 opções: (A) Sim — quero descrever uma ideia ou história, (B) Não — gerar direto com as informações do quiz. Incluir nota: "Dica: complete seu perfil para roteiros mais personalizados →" com link para perfil | TODO |
| 4 | Opções B e D (quando ExpertProfile existe) abrem campo de texto livre (textarea, sem limite rígido) para o aluno descrever contexto adicional ou ideia específica | TODO |
| 5 | Resultado salvo em `quiz_sessions`: `useExpertProfile` (boolean) indica se o perfil será usado, `personalContext` (string, nullable) armazena texto livre quando fornecido | TODO |
| 6 | Dados de contexto pessoal (`useExpertProfile` + `personalContext`) passados ao Prompt Engine na montagem do prompt de geração | TODO |
| 7 | Campos adicionados ao schema Prisma: `QuizSession.useExpertProfile` (Boolean, default false), `QuizSession.personalContext` (String?) | TODO |

---

## Technical Notes

- **Componente:** Renderização condicional baseada na existência do ExpertProfile do aluno
- **Verificação:** Fetch `GET /api/profile/completion` para checar estado do perfil antes de exibir a pergunta
- **Textarea:** Campo de texto livre com placeholder guiando o aluno (ex: "Descreva sua ideia, história ou contexto que deseja incluir no roteiro...")
- **Schema:** Adicionar `useExpertProfile Boolean @default(false)` e `personalContext String?` em `QuizSession`
- **Integração:** Dados passados ao Prompt Engine via quiz session data em `POST /api/quiz/generate`
- **Referência:** PRD — Story 6.10

---

## Dependencies

- Story 6.5 — endpoint `/api/quiz/generate` onde o contexto pessoal é consumido
- ExpertProfile (Epic 4) — existência do perfil determina variante da pergunta exibida
