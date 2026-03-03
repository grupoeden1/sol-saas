# User Story: Quiz UI — Interface Mobile e Desktop

**ID:** 6.4
**Epic:** 6 - Quiz & Onboarding
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 6.3 (Quiz Engine)

---

## Statement

As a student,
I want a beautiful, responsive quiz interface on both mobile and desktop,
so that I can create scripts from any device.

---

## Context

A interface do quiz segue o design da apresentação `quiz-structure-v2.html`: mobile com cards compactos e botões de navegação, desktop com sidebar de navegação por seções e área de conteúdo expandida. O visual segue o dark/solar theme do SOL.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Layout mobile: tela full-width, header com logo SOL, barra de progresso, perguntas em cards verticais, botão "Continuar" no rodapé | DONE |
| 2 | Layout desktop: sidebar de navegação por seções (Onboarding, Quiz Inicial, Caminho 1, Caminho 2, Gerar Roteiro) com estado de progresso (completed ✓, active, locked) | DONE |
| 3 | Barra de progresso por seção com texto "X de Y" e fill gradiente gold | DONE |
| 4 | Tipo texto/aberta: textarea com placeholder (exemplo da pergunta), counter de caracteres | DONE |
| 5 | Tipo seleção única: cards com letra (A, B, C...) e label, hover/selected com borda dourada | DONE |
| 6 | Tipo seleção múltipla: checkboxes em grid, múltiplas seleções permitidas | DONE |
| 7 | Tipo upload: área drag & drop com ícone, label "Arraste ou clique para selecionar", barra de progresso de upload | DONE |
| 8 | Perguntas opcionais identificadas visualmente (tag "Opcional") | DONE |
| 9 | Perguntas condicionais com indentação visual (border-left colorida, conforme apresentação) | DONE |
| 10 | Transições suaves entre perguntas e seções (animação CSS) | DONE |
| 11 | Visual dark/solar consistente: fundo escuro, dourado como accent, tipografia Inter, Shadcn/UI components | DONE |
| 12 | Responsivo: funciona em mobile (≥375px) e desktop, breakpoint em 768px | DONE |

---

## Technical Notes

- **Páginas:** `apps/web/src/app/(dashboard)/quiz/[sessionId]/page.tsx`
- **Componentes:** `components/quiz/quiz-sidebar.tsx`, `components/quiz/quiz-progress.tsx`, `components/quiz/question-types/*.tsx`
- **Design reference:** `docs/quiz-structure-v2.html` — mockups mobile e desktop para cada seção
- **Palette:** `--gold: #D4A844`, `--gold-light: #E8C86A`, `--gold-dark: #8B6914`, `--bg: #000000`, `--bg-elevated: #111111`
- **Referência:** PRD v9.0 — "User Interface Design Goals"
