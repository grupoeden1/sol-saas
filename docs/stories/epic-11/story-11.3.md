# User Story: Atribuicao de Bonus na Primeira Compra

**ID:** 11.3
**Epic:** 11 - Programa de Indicacao (Referral)
**Status:** DONE
**Agent:** @sm (draft) -> @dev (implement) -> @qa (review)
**Depends on:** Story 11.2 (Fluxo de Cadastro com Referral)

---

## Statement

As a referred student,
I want both me and the person who referred me to receive bonus credits when I make my first purchase,
so that we are both rewarded for growing the SOL community.

---

## Context

O bonus de referral e atribuido na **primeira compra** do indicado — nao no cadastro. Isso garante que apenas usuarios que realmente convertem geram custo de aquisicao. Ao completar a primeira compra (webhook Stripe `checkout.session.completed` ou fluxo de pagamento existente), o sistema verifica se o usuario tem um `ReferralReward` com status PENDING. Se sim, e o programa ainda esta ativo (`REFERRAL_ENABLED = true`), ambos (indicador e indicado) recebem creditos via `addCredits(type: 'referral')`. Os valores de creditos usam os valores **atuais** do admin (`REFERRAL_REFERRER_CREDITS`, `REFERRAL_REFERRED_CREDITS`) — nao um snapshot do momento do cadastro. Se o programa foi desativado entre o cadastro e a compra, o reward e marcado como EXPIRED e nenhum bonus e atribuido. O bonus e atribuido apenas 1 vez — compras subsequentes nao re-ativam o reward.

---

## Acceptance Criteria

| # | Criterio | Status |
|---|----------|--------|
| 1 | Apos a primeira compra bem-sucedida de um usuario indicado, o sistema verifica se existe `ReferralReward` com status PENDING para esse usuario | TODO |
| 2 | Se reward PENDING existe e `REFERRAL_ENABLED = true`: o indicador recebe creditos via `addCredits(type: 'referral')` com valor atual de `REFERRAL_REFERRER_CREDITS` | TODO |
| 3 | Se reward PENDING existe e `REFERRAL_ENABLED = true`: o indicado recebe creditos via `addCredits(type: 'referral')` com valor atual de `REFERRAL_REFERRED_CREDITS` | TODO |
| 4 | Apos atribuicao: status do `ReferralReward` muda para CREDITED e `triggerTransactionId` e preenchido com o ID da transacao de compra | TODO |
| 5 | Se `REFERRAL_ENABLED = false` no momento da compra: status do `ReferralReward` muda para EXPIRED, nenhum bonus e atribuido | TODO |
| 6 | Segunda compra e compras subsequentes nao re-ativam o bonus — reward ja esta CREDITED ou EXPIRED | TODO |
| 7 | Os valores de creditos usam as configuracoes **atuais** do admin (nao snapshot do cadastro) — se admin mudou de 100 para 150 creditos, a compra usa 150 | TODO |
| 8 | Ambas as operacoes de credito (indicador + indicado) sao executadas em transacao atomica — se uma falha, nenhuma e aplicada | TODO |
| 9 | Usuario sem `ReferralReward` PENDING (cadastro sem referral) nao e afetado — fluxo de compra funciona normalmente | TODO |

---

## Technical Notes

- **Hook no fluxo de compra:** adicionar verificacao de referral apos `addCredits(type: 'purchase')` no handler de pagamento existente
- **Transacao atomica:** usar `prisma.$transaction()` para garantir atomicidade das 3 operacoes (credito indicador, credito indicado, update reward)
- **Leitura de config:** buscar `REFERRAL_ENABLED`, `REFERRAL_REFERRER_CREDITS`, `REFERRAL_REFERRED_CREDITS` do PricingConfig no momento da compra
- **Idempotencia:** verificar status do reward antes de processar — se ja CREDITED ou EXPIRED, nao fazer nada
- **Descricao da transacao:** incluir referencia ao referral na descricao do credito (ex: "Bonus de indicacao - usuario X indicou Y")
- **Referencia:** PRD Addendum v11.0 — FR45

---

## Tasks / Subtasks

- [ ] Criar service/funcao `processReferralReward(userId, transactionId)` que encapsula toda a logica
- [ ] Buscar `ReferralReward` PENDING para o usuario indicado
- [ ] Verificar `REFERRAL_ENABLED` no PricingConfig
- [ ] Se ativo: executar `addCredits(type: 'referral')` para indicador e indicado em transacao atomica
- [ ] Atualizar `ReferralReward`: status CREDITED, `triggerTransactionId`
- [ ] Se desativado: marcar `ReferralReward` como EXPIRED
- [ ] Integrar `processReferralReward` no fluxo de compra existente (apos confirmacao de pagamento)
- [ ] Garantir idempotencia: verificar status antes de processar
- [ ] Testes unitarios para cada cenario (ativo, desativado, ja creditado, sem referral)
- [ ] Teste de integracao para fluxo completo: cadastro com referral -> primeira compra -> bonus atribuido

---

## Definition of Done

- [ ] Primeira compra de usuario indicado atribui bonus para ambos (indicador e indicado)
- [ ] Valores de creditos refletem configuracao atual do admin
- [ ] Reward PENDING -> CREDITED apos bonus atribuido
- [ ] Reward PENDING -> EXPIRED se programa desativado
- [ ] Segunda compra nao re-ativa bonus
- [ ] Operacoes de credito sao atomicas
- [ ] Fluxo de compra sem referral nao e afetado
- [ ] Testes cobrindo todos os cenarios criticos
- [ ] Descricao da transacao de credito inclui contexto de referral

---

## Dependencies

- Story 11.2 — fluxo de cadastro cria `ReferralReward` PENDING e associa `referredBy`
- Story 1.3 / 3.3 — fluxo de compra existente (sera modificado para chamar `processReferralReward`)
- Funcao `addCredits` existente — deve suportar `type: 'referral'`
