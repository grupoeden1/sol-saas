# User Story: "Meus Roteiros" — Listagem e Visualização

**ID:** 6.6
**Epic:** 6 - Quiz & Onboarding
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 6.1 (Schema), Story 6.5 (Geração)

---

## Statement

As a student,
I want to see all my generated scripts in one place,
so that I can review, iterate and manage my creative scripts.

---

## Context

"Meus Roteiros" substitui "Minhas Conversas" como tela central de listagem. Mostra roteiros gerados via quiz (com caminhos usados) e chats livres, com link para abrir/iterar cada um. A renomeação de "Conversas" para "Roteiros" afeta header, sidebar e painel do usuário.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Página `/roteiros` (protegida) lista todas as Conversations do usuário, ordenadas por data (mais recente primeiro) | TODO |
| 2 | Roteiros (Conversations com `quizSessionId` != null) exibem: título, data, caminhos usados (ex: "Anúncio + Modelado"), ícone de quiz | TODO |
| 3 | Chats livres (Conversations com `quizSessionId` = null) exibem: título, data, ícone de chat | TODO |
| 4 | Separação visual ou filtro entre "Roteiros" e "Chats Livres" | TODO |
| 5 | Clicar em roteiro redireciona para `/roteiros/[id]` (roteiro + chat de iteração) | TODO |
| 6 | Paginação: 20 por página com controles de navegação | TODO |
| 7 | Renomear "Conversas"/"Minhas Conversas" para "Roteiros"/"Meus Roteiros" em: header (Story 1.4), sidebar, dashboard (Story 3.5), links de navegação | TODO |
| 8 | Visual dark/solar consistente com Tailwind + Shadcn/UI | TODO |
| 9 | Carregamento via Server Components do Next.js 14 | TODO |

---

## Technical Notes

- **Página:** `apps/web/src/app/(dashboard)/roteiros/page.tsx`
- **Dados:** Server Component carrega Conversations com include QuizSession (para obter path1/path2)
- **Impacto em stories existentes:** Story 1.4 (header), Story 2.2 (sidebar), Story 3.5 (dashboard)
- **Labels de caminhos:** `AD+MODELED` → "Anúncio + Modelado", `AD+FROM_SCRATCH` → "Anúncio + Do Zero", `ORGANIC+MODELED` → "Orgânico + Modelado", `ORGANIC+FROM_SCRATCH` → "Orgânico + Do Zero"
