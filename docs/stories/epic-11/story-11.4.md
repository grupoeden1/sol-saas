# User Story: Interface do Aluno — Compartilhar e Acompanhar Indicacoes

**ID:** 11.4
**Epic:** 11 - Programa de Indicacao (Referral)
**Status:** DONE
**Agent:** @sm (draft) -> @dev (implement) -> @qa (review)
**Depends on:** Story 11.3 (Atribuicao de Bonus na Primeira Compra)

---

## Statement

As a student,
I want a "Refer & Earn" section in my dashboard where I can share my referral link and track my referrals,
so that I can invite friends and monitor the credits I have earned.

---

## Context

O aluno precisa de uma interface para compartilhar seu codigo de referral e acompanhar o status de suas indicacoes. A secao "Indique e Ganhe" no dashboard exibe o codigo pessoal, um link compartilhavel (`https://sol.app/?ref=CODIGO`), e botoes de compartilhamento. No mobile, usa Web Share API nativa; no desktop, fallback para copiar link para clipboard. Um contador mostra total de indicacoes e creditos ganhos. Uma lista exibe cada indicacao com email mascarado (ex: `j***@gmail.com`) e status (PENDING, CREDITED, EXPIRED). Toda a secao so e visivel se `REFERRAL_ENABLED = true` — se o admin desativar o programa, a secao desaparece do dashboard.

---

## Acceptance Criteria

| # | Criterio | Status |
|---|----------|--------|
| 1 | Secao "Indique e Ganhe" e exibida no dashboard do aluno quando `REFERRAL_ENABLED = true` | TODO |
| 2 | Secao NAO e exibida quando `REFERRAL_ENABLED = false` | TODO |
| 3 | Codigo de referral do usuario e exibido de forma destacada com botao "Copiar" | TODO |
| 4 | Link compartilhavel completo (`https://{domain}/?ref={code}`) e exibido com botao "Copiar Link" | TODO |
| 5 | Em dispositivos mobile, botao "Compartilhar" usa Web Share API nativa (`navigator.share`) com titulo, texto e URL pre-preenchidos | TODO |
| 6 | Em desktop (ou se Web Share API indisponivel), fallback exibe botao "Copiar Link" que copia para clipboard com feedback visual | TODO |
| 7 | Contador exibe: total de indicacoes realizadas e total de creditos ganhos via referral | TODO |
| 8 | Lista de indicacoes exibe cada referral com: email mascarado do indicado (ex: `j***@gmail.com`), status (PENDING, CREDITED, EXPIRED), data de criacao | TODO |
| 9 | Dados carregados via API `GET /api/referral/stats` que retorna: `referralCode`, `totalReferrals`, `creditsEarned`, lista de referrals | TODO |
| 10 | Emails sao mascarados no **servidor** (nunca enviar email completo para o frontend) | TODO |

---

## Technical Notes

- **Componente:** criar componente `ReferralSection` para o dashboard do aluno
- **API route:** `GET /api/referral/stats` — retorna dados do referral do usuario logado
- **Mascaramento de email:** implementar no server — `john@gmail.com` -> `j***@gmail.com` (primeira letra + *** + @dominio)
- **Web Share API:** verificar `navigator.share` antes de exibir botao de compartilhar; fallback para clipboard (`navigator.clipboard.writeText`)
- **Feedback visual:** toast/snackbar apos copiar codigo ou link
- **Visibilidade condicional:** buscar `REFERRAL_ENABLED` via API ou contexto de configuracao do app
- **Referencia:** PRD Addendum v11.0 — FR43, FR46

---

## Tasks / Subtasks

- [ ] Criar endpoint `GET /api/referral/stats` com autenticacao de usuario
- [ ] Implementar query para buscar referrals do usuario com contadores e lista
- [ ] Implementar funcao de mascaramento de email no servidor
- [ ] Criar componente `ReferralSection` no dashboard
- [ ] Exibir codigo de referral com botao copiar
- [ ] Exibir link compartilhavel completo com botao copiar
- [ ] Implementar Web Share API com deteccao de suporte e fallback clipboard
- [ ] Exibir contadores: total indicacoes + creditos ganhos
- [ ] Exibir lista de indicacoes com email mascarado, status e data
- [ ] Condicionar visibilidade da secao a `REFERRAL_ENABLED = true`
- [ ] Testes unitarios para mascaramento de email
- [ ] Testes de componente para `ReferralSection` (estados: com dados, vazio, loading)

---

## Definition of Done

- [ ] Secao "Indique e Ganhe" aparece no dashboard quando programa ativo
- [ ] Secao desaparece quando programa desativado
- [ ] Codigo e link compartilhavel sao exibidos e copiaveis
- [ ] Web Share API funciona em mobile; clipboard funciona em desktop
- [ ] Contadores refletem dados reais do banco
- [ ] Lista exibe referrals com email mascarado e status correto
- [ ] Emails NUNCA sao enviados completos ao frontend
- [ ] API `GET /api/referral/stats` retorna dados corretamente com autenticacao
- [ ] Testes cobrindo componente e API

---

## Dependencies

- Story 11.3 — logica de bonus implementada (status CREDITED refletido na lista)
- Story 11.1 — campo `referralCode` no User, modelo ReferralReward
- Dashboard do aluno existente (Epic 1/3) — secao sera adicionada ao layout existente
