# User Story: Onboarding — Perfil Persistente do Aluno

**ID:** 6.2
**Epic:** 6 - Quiz & Onboarding
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 6.1 (Schema)

---

## Statement

As a student,
I want to fill out my product profile once and reuse it across all future productions,
so that I don't have to repeat the same information every time.

---

## Context

O onboarding coleta 9 perguntas sobre o produto/nicho do aluno. Cada perfil é persistente e reutilizável — o aluno pode ter múltiplos perfis (um por produto). Antes de iniciar um quiz, o aluno seleciona perfil existente ou cria novo. Os dados do onboarding alimentam o prompt de geração do roteiro.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Página `/onboarding` (protegida) exibe formulário com as 9 perguntas de onboarding conforme catálogo do PRD (O1–O9) | TODO |
| 2 | API `POST /api/onboarding` cria perfil com validação Zod (nome obrigatório, 9 respostas obrigatórias) | TODO |
| 3 | API `GET /api/onboarding` retorna todos os perfis do usuário autenticado | TODO |
| 4 | API `PUT /api/onboarding/[id]` edita perfil existente (verificação que pertence ao usuário) | TODO |
| 5 | API `DELETE /api/onboarding/[id]` deleta perfil (verificação que pertence ao usuário, impede deleção se vinculado a quiz sessions ativas) | TODO |
| 6 | Aluno pode ter múltiplos perfis — lista exibida com nome do produto e data de criação | TODO |
| 7 | Antes de cada quiz, tela de seleção: escolher perfil existente ou "Criar novo perfil" | TODO |
| 8 | Interface responsiva (mobile + desktop) com visual dark/solar (Tailwind + Shadcn/UI) | TODO |
| 9 | Nenhuma regressão em: auth, chat, créditos | TODO |

---

## Technical Notes

- **Páginas:** `apps/web/src/app/(dashboard)/onboarding/page.tsx`
- **API Routes:** `apps/web/src/app/api/onboarding/route.ts` (GET/POST), `apps/web/src/app/api/onboarding/[id]/route.ts` (PUT/DELETE)
- **Perguntas O1–O9:** Definidas em `lib/quiz/questions.ts` (seção ONBOARDING)
- **Validação:** Zod schema para as 9 respostas — todas obrigatórias, tipos corretos (texto livre ou opção selecionada)
- **Referência:** PRD v9.0 — seção "Catálogo Completo de Perguntas — Seção 1: Onboarding"
