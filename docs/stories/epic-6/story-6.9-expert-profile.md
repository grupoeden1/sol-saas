# User Story: Perfil do Expert

**ID:** 6.9
**Epic:** 6 - Geração Inteligente de Roteiros
**Status:** TODO
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 6.5 (Geração de Roteiro)

---

## Statement

As a expert/student,
I want to fill out my personal profile with details about my personality, values, history, and references,
so that generated scripts are more personalized and aligned with my voice and identity.

---

## Context

Feature separada do quiz para capturar o perfil pessoal do expert/aluno. São 35 campos distribuídos em 6 seções (Dados Básicos, Personalidade, Valores, História, Comunidade, Referências). O perfil é usado como contexto opcional na geração de roteiros — quando preenchido, enriquece o prompt com informações pessoais do expert, resultando em roteiros mais autênticos e personalizados. A relação é 1:1 com User via `userId` @unique. O `completionPercentage` é calculado server-side baseado nos 14 campos obrigatórios.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Tabela `expert_profiles` com 35 campos em 6 seções: Dados Básicos, Personalidade, Valores, História, Comunidade, Referências | TODO |
| 2 | 14 campos obrigatórios, 21 opcionais — validação server-side | TODO |
| 3 | API `GET /api/profile` retorna `ExpertProfile` do usuário logado (ou `null` se não existir) | TODO |
| 4 | API `PUT /api/profile` faz upsert. Calcula `completionPercentage` baseado nos 14 campos obrigatórios preenchidos | TODO |
| 5 | API `GET /api/profile/completion` retorna apenas `{ percentage: number }` | TODO |
| 6 | UI acessível via ícone de perfil com 3 estados: incompleto (CTA "Completar perfil"), completo (badge + "Editar"), parcial (barra de progresso + %) | TODO |
| 7 | 6 seções em cards/abas: Dados Básicos, Personalidade, Valores, História, Comunidade, Referências | TODO |
| 8 | Cada seção salva independentemente (autosave ao sair da seção) | TODO |
| 9 | Campos obrigatórios marcados visualmente (asterisco ou indicador) | TODO |
| 10 | Exemplos placeholder em campos abertos para guiar o preenchimento | TODO |
| 11 | Gamificação: barra de progresso global, badge dourado quando perfil 100% completo | TODO |
| 12 | Dark/solar theme, componentes Shadcn/UI, layout responsivo | TODO |
| 13 | Toast após primeiro roteiro sem perfil: "Esse roteiro ficaria mais personalizado com seu perfil completo. Quer preencher? (~10 min)" | TODO |
| 14 | Relação 1:1 com User via `userId` @unique — um perfil por usuário | TODO |

---

## Technical Notes

- **Model:** `ExpertProfile` com 35 campos distribuídos em 6 seções (Prisma schema)
- **Relação:** `userId String @unique` — relação 1:1 com `User`
- **completionPercentage:** Calculado server-side baseado nos 14 campos obrigatórios preenchidos (`Math.round(filledRequired / 14 * 100)`)
- **Autosave:** Cada seção salva via `PUT /api/profile` com debounce ao sair — UX fluida sem botão "Salvar"
- **Badge:** Perfil completo (100%) exibe badge dourado visível globalmente no header/sidebar
- **Toast:** Disparado em `POST /api/quiz/generate` quando `ExpertProfile` é `null` ou `completionPercentage < 100`
- **Integração com roteiro:** Quando disponível, dados do `ExpertProfile` são incluídos como contexto opcional no prompt de geração

---

## Dependencies

- Story 6.5 — Geração de Roteiro (onde o perfil é consumido como contexto opcional)
- Autenticação — necessário `userId` do usuário logado para relação 1:1
