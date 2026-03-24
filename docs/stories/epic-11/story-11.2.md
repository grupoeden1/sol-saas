# User Story: Fluxo de Cadastro com Referral

**ID:** 11.2
**Epic:** 11 - Programa de Indicacao (Referral)
**Status:** DONE
**Agent:** @sm (draft) -> @dev (implement) -> @qa (review)
**Depends on:** Story 11.1 (Database Schema: Referral Program)

---

## Statement

As a potential student,
I want to register using a friend's referral link,
so that both of us can earn bonus credits when I make my first purchase.

---

## Context

O fluxo de cadastro existente (Story 1.3) deve ser modificado para aceitar codigos de referral via URL. A URL `/?ref=CODIGO` redireciona para `/register?ref=CODIGO`. O codigo e persistido em cookie httpOnly por 30 dias para sobreviver ao fluxo OAuth/registro. Na criacao do usuario, o sistema valida o codigo (existe, programa ativo, limite nao atingido), associa `referredBy`, e cria um `ReferralReward` com status PENDING. Todo novo usuario — com ou sem referral — recebe um `referralCode` unico de 8 caracteres uppercase. Auto-indicacao e bloqueada silenciosamente (usuario nao ve erro, simplesmente ignora o codigo). Cadastro sem referral continua funcionando normalmente sem nenhuma alteracao de comportamento.

---

## Acceptance Criteria

| # | Criterio | Status |
|---|----------|--------|
| 1 | URL `/?ref=CODIGO` redireciona para `/register?ref=CODIGO` preservando o codigo na query string | TODO |
| 2 | Ao acessar `/register?ref=CODIGO`, o codigo e salvo em cookie httpOnly com `maxAge` de 30 dias, `sameSite: lax`, `secure: true` (production) | TODO |
| 3 | Na criacao do usuario, o sistema valida o codigo de referral: (a) codigo existe no banco, (b) `REFERRAL_ENABLED = true`, (c) indicador nao atingiu `REFERRAL_MAX_PER_USER` | TODO |
| 4 | Se validacao passa: campo `referredBy` do novo usuario e preenchido com o ID do indicador, e um `ReferralReward` e criado com status PENDING | TODO |
| 5 | Se validacao falha (codigo invalido, programa desativado, limite atingido): cadastro prossegue normalmente sem referral, sem exibir erro ao usuario | TODO |
| 6 | Auto-indicacao (usuario usando seu proprio codigo) e bloqueada silenciosamente — cadastro prossegue sem associar referral | TODO |
| 7 | Todo novo usuario recebe `referralCode` unico de 8 caracteres uppercase alfanumericos, gerado automaticamente, independente de ter sido indicado ou nao | TODO |
| 8 | Cadastro sem parametro `ref` na URL funciona normalmente, sem nenhuma alteracao de comportamento | TODO |
| 9 | Cookie de referral e limpo apos o cadastro (sucesso ou falha de validacao) | TODO |
| 10 | Se o usuario ja existe (login via OAuth com conta existente), o cookie de referral e ignorado | TODO |

---

## Technical Notes

- **MODIFICA** fluxo de registro existente em Story 1.3 — nao cria novo endpoint, altera o existente
- **Landing page:** middleware ou page handler para `/?ref=CODIGO` faz redirect para `/register?ref=CODIGO`
- **Cookie:** nome sugerido `sol_ref`, httpOnly, 30 dias, path `/`
- **Geracao de codigo:** reutilizar funcao `generateReferralCode()` da Story 11.1
- **Validacao server-side:** NUNCA confiar no frontend para validacao de referral (NFR11)
- **Query de limite:** `SELECT COUNT(*) FROM referral_rewards WHERE referrer_id = ? AND status IN ('PENDING', 'CREDITED')`
- **Referencia:** PRD Addendum v11.0 — FR43, FR44

---

## Tasks / Subtasks

- [ ] Criar middleware/handler para `/?ref=CODIGO` que redireciona para `/register?ref=CODIGO`
- [ ] Implementar logica de cookie: salvar `sol_ref` httpOnly 30 dias ao acessar `/register?ref=CODIGO`
- [ ] Modificar fluxo de criacao de usuario (Story 1.3) para ler cookie `sol_ref`
- [ ] Implementar validacao server-side do codigo de referral (existe, ativo, limite, auto-indicacao)
- [ ] Associar `referredBy` e criar `ReferralReward` PENDING quando validacao passa
- [ ] Garantir geracao automatica de `referralCode` para todo novo usuario
- [ ] Limpar cookie `sol_ref` apos processamento do cadastro
- [ ] Ignorar cookie se usuario ja existe (login com conta existente)
- [ ] Testes unitarios para validacao de codigo de referral
- [ ] Testes de integracao para fluxo completo de cadastro com referral

---

## Definition of Done

- [ ] URL `/?ref=CODIGO` redireciona corretamente para `/register?ref=CODIGO`
- [ ] Cookie httpOnly e criado e persistido por 30 dias
- [ ] Cadastro com referral valido cria usuario com `referredBy` preenchido e `ReferralReward` PENDING
- [ ] Cadastro com referral invalido prossegue sem erro visivel
- [ ] Auto-indicacao e bloqueada silenciosamente
- [ ] Todo novo usuario recebe `referralCode` unico
- [ ] Cadastro sem referral funciona identicamente ao comportamento anterior
- [ ] Cookie e limpo apos cadastro
- [ ] Validacao e 100% server-side
- [ ] Testes cobrindo todos os cenarios (valido, invalido, limite, auto-indicacao, sem referral)

---

## Dependencies

- Story 11.1 — schema ReferralReward, campos referralCode/referredBy no User, PricingConfig seeds
- Story 1.3 — fluxo de registro existente (sera modificado)
