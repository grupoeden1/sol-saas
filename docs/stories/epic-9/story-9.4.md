# User Story: Gerenciamento de Assinatura pelo Aluno

**ID:** 9.4
**Epic:** 9 - Assinaturas Recorrentes
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 9.3 (Checkout de Assinatura e Webhook de Renovação)

---

## Statement

As a student,
I want to manage my subscription (cancel, reactivate, or change plan) from my dashboard,
so that I have full control over my billing without contacting support.

---

## Context

O aluno precisa gerenciar sua assinatura de forma autonoma pelo dashboard/perfil. O cancelamento usa `cancel_at_period_end: true` (nao imediato), permitindo que o aluno use os creditos restantes ate o fim do periodo. A reativacao reverte o cancelamento pendente (so funciona se `cancelAtPeriodEnd: true` e status ACTIVE). A troca de plano suporta upgrade e downgrade com proration automatica via Stripe (`proration_behavior: 'create_prorations'`). Todas as operacoes sao feitas via Stripe API e sincronizadas via webhooks ja implementados na Story 9.3.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Rota POST `/api/subscription/cancel` marca assinatura como `cancel_at_period_end: true` via `stripe.subscriptions.update(subId, { cancel_at_period_end: true })`. Atualiza `UserSubscription.cancelAtPeriodEnd = true` no banco. Assinatura continua ativa ate `currentPeriodEnd` | TODO |
| 2 | Rota POST `/api/subscription/reactivate` reverte cancelamento pendente via `stripe.subscriptions.update(subId, { cancel_at_period_end: false })`. So funciona se `cancelAtPeriodEnd: true` e `status: ACTIVE`. Atualiza `UserSubscription.cancelAtPeriodEnd = false` | TODO |
| 3 | Rota POST `/api/subscription/change-plan` aceita `newPlanId`, valida plano ativo com `stripePriceId`, e atualiza assinatura via `stripe.subscriptions.update(subId, { items: [{ id: itemId, price: newStripePriceId }], proration_behavior: 'create_prorations' })`. Atualiza `UserSubscription.planId` no banco | TODO |
| 4 | Upgrade (plano mais caro): proration cobra diferenca proporcional imediatamente. Downgrade (plano mais barato): proration gera credito proporcional aplicado na proxima fatura | TODO |
| 5 | Interface no dashboard/perfil do aluno exibe: plano atual (nome, creditos, preco), status da assinatura (Ativa, Cancelamento Pendente, Inadimplente), data de renovacao (`currentPeriodEnd`), botoes de acao contextuais | TODO |
| 6 | Botoes de acao contextuais: status ACTIVE + nao cancelando → "Trocar Plano" + "Cancelar"; status ACTIVE + cancelAtPeriodEnd → "Reativar" + badge "Cancela em DD/MM/YYYY"; status PAST_DUE → mensagem de inadimplencia + link para atualizar pagamento; status CANCELED → "Assinar Novo Plano" | TODO |
| 7 | Modal de confirmacao para cancelamento com: data de termino, aviso de perda de renovacao automatica, botao "Confirmar Cancelamento" | TODO |
| 8 | Modal de troca de plano com: plano atual vs novo plano, diferenca de creditos e preco, informacao de proration (quanto sera cobrado/creditado), botao "Confirmar Troca" | TODO |
| 9 | Todas as rotas protegidas por autenticacao. Usuario so pode gerenciar sua propria assinatura. Retorna 404 se usuario nao tem assinatura ativa | TODO |
| 10 | Tratamento de erros: Stripe API failures exibem mensagem amigavel, operacoes invalidas (ex: reativar assinatura nao cancelada) retornam erro claro | TODO |

---

## Technical Notes

- **Stripe APIs:** `stripe.subscriptions.update` (cancel_at_period_end, items, proration_behavior), `stripe.subscriptions.retrieve`
- **Proration:** `proration_behavior: 'create_prorations'` — Stripe calcula automaticamente a diferenca proporcional
- **Subscription Item:** Para trocar de plano, e necessario buscar o `subscription.items.data[0].id` da assinatura atual
- **Sincronizacao:** As alteracoes feitas via Stripe API disparam webhooks (`customer.subscription.updated`) ja tratados na Story 9.3
- **UI:** Componente de gerenciamento no dashboard/perfil do aluno. Usar estados condicionais para exibir botoes corretos
- **Referencia:** PRD Addendum v11.0 — FR38, API Routes

---

## Tasks / Subtasks

- [ ] Criar service `subscriptionManagementService` com logica de cancel/reactivate/change
- [ ] Implementar rota POST `/api/subscription/cancel`
- [ ] Implementar rota POST `/api/subscription/reactivate`
- [ ] Implementar rota POST `/api/subscription/change-plan` com proration
- [ ] Criar componente de gerenciamento de assinatura no dashboard
- [ ] Implementar exibicao de status e informacoes do plano atual
- [ ] Implementar botoes de acao contextuais por status
- [ ] Criar modal de confirmacao de cancelamento
- [ ] Criar modal de troca de plano com preview de proration
- [ ] Adicionar rota GET `/api/subscription/current` para dados da assinatura do usuario
- [ ] Tratamento de erros e mensagens amigaveis
- [ ] Testes unitarios para service de gerenciamento
- [ ] Testes de integracao para rotas API
- [ ] Testes de componente para UI de gerenciamento

---

## Definition of Done

- [ ] Cancelamento funciona com `cancel_at_period_end` (nao imediato)
- [ ] Reativacao reverte cancelamento pendente corretamente
- [ ] Troca de plano funciona com proration para upgrade e downgrade
- [ ] Interface exibe status correto e botoes contextuais
- [ ] Modais de confirmacao funcionam para cancelamento e troca de plano
- [ ] Todas as rotas protegidas por autenticacao
- [ ] Erros do Stripe tratados com mensagens amigaveis
- [ ] Webhooks da Story 9.3 sincronizam alteracoes corretamente
- [ ] Testes unitarios e de integracao passam

---

## Dependencies

- Story 9.3 — checkout de assinatura e webhooks implementados
- Story 9.2 — planos ativos com stripePriceId valido
