# User Story: Painel Admin — Controle do Programa de Referral

**ID:** 11.5
**Epic:** 11 - Programa de Indicacao (Referral)
**Status:** DONE
**Agent:** @sm (draft) -> @dev (implement) -> @qa (review)
**Depends on:** Story 11.4 (Interface do Aluno)

---

## Statement

As an admin,
I want a dedicated referral management panel where I can toggle the program on/off, configure credit amounts and limits, and view referral metrics,
so that I have full control over the referral program and can optimize its performance.

---

## Context

O painel admin de referral (`/admin/referral`) centraliza o controle total do programa de indicacao. O admin pode ativar/desativar o programa (`REFERRAL_ENABLED`), configurar creditos para indicador (`REFERRAL_REFERRER_CREDITS`) e indicado (`REFERRAL_REFERRED_CREDITS`), definir o limite maximo de indicacoes por usuario (`REFERRAL_MAX_PER_USER`), e visualizar metricas agregadas. As metricas incluem: total de indicacoes, creditos distribuidos, top indicadores (ranking), e taxa de conversao (indicacoes com status CREDITED / total). Uma lista paginada de indicacoes com filtro por status (PENDING, CREDITED, EXPIRED) permite drill-down. Todas as rotas admin verificam `role: ADMIN` server-side.

---

## Acceptance Criteria

| # | Criterio | Status |
|---|----------|--------|
| 1 | Pagina `/admin/referral` acessivel apenas para usuarios com `role: ADMIN` — redireciona ou retorna 403 para nao-admins | TODO |
| 2 | Toggle on/off atualiza `REFERRAL_ENABLED` no PricingConfig via `PUT /api/admin/referral` | TODO |
| 3 | Campos editaveis: `REFERRAL_REFERRER_CREDITS` (int, min 1), `REFERRAL_REFERRED_CREDITS` (int, min 1), `REFERRAL_MAX_PER_USER` (int, min 1) — salvos via `PUT /api/admin/referral` | TODO |
| 4 | Validacao server-side: todos os campos devem ser inteiros positivos; retorna 400 com mensagem de erro se invalidos | TODO |
| 5 | Secao de metricas exibe: total de indicacoes (todos os status), total de creditos distribuidos (soma de `referrerCredits + referredCredits` onde status = CREDITED), taxa de conversao (CREDITED / total * 100%) | TODO |
| 6 | Top 5 indicadores exibidos com: nome/email, numero de indicacoes CREDITED, total de creditos ganhos | TODO |
| 7 | Lista de indicacoes paginada com: indicador (email), indicado (email mascarado), status, data de criacao, creditos atribuidos | TODO |
| 8 | Filtro por status (ALL, PENDING, CREDITED, EXPIRED) na lista de indicacoes | TODO |
| 9 | API `GET /api/admin/referral` retorna configuracao atual + metricas agregadas | TODO |
| 10 | API `PUT /api/admin/referral` atualiza configuracoes no PricingConfig — protegida por role ADMIN | TODO |
| 11 | API `GET /api/admin/referral/list` retorna lista paginada de referrals com filtros — protegida por role ADMIN | TODO |
| 12 | Alteracoes nas configuracoes refletem imediatamente em novos rewards (nao retroativo para rewards ja CREDITED) | TODO |

---

## Technical Notes

- **Pagina admin:** `apps/web/src/app/(dashboard)/admin/referral/page.tsx`
- **API Routes:**
  - `apps/web/src/app/api/admin/referral/route.ts` — GET (config + metrics) / PUT (update config)
  - `apps/web/src/app/api/admin/referral/list/route.ts` — GET (lista paginada com filtros)
- **PricingConfig keys:** `REFERRAL_ENABLED`, `REFERRAL_REFERRER_CREDITS`, `REFERRAL_REFERRED_CREDITS`, `REFERRAL_MAX_PER_USER`
- **Metricas:** queries de agregacao Prisma — `_count`, `_sum`, `groupBy`
- **Paginacao:** `?page=1&pageSize=20&status=CREDITED` como query params
- **Top indicadores:** `groupBy({ by: ['referrerId'], _count: true, orderBy: { _count: { referrerId: 'desc' } }, take: 5 })`
- **Protecao:** verificar `session.user.role === 'ADMIN'` em todas as rotas
- **Referencia:** PRD Addendum v11.0 — FR47

---

## Tasks / Subtasks

- [ ] Criar API route `GET /api/admin/referral` — retorna config atual + metricas
- [ ] Criar API route `PUT /api/admin/referral` — atualiza config com validacao
- [ ] Criar API route `GET /api/admin/referral/list` — lista paginada com filtro por status
- [ ] Implementar queries de metricas: total, distribuidos, taxa conversao, top 5
- [ ] Criar pagina `/admin/referral` com layout admin existente
- [ ] Implementar toggle REFERRAL_ENABLED com feedback visual
- [ ] Implementar formulario de configuracao (creditos indicador/indicado, limite)
- [ ] Implementar secao de metricas com cards/indicadores
- [ ] Implementar ranking de top indicadores
- [ ] Implementar lista de indicacoes com paginacao e filtro por status
- [ ] Proteger todas as rotas com verificacao de role ADMIN
- [ ] Validacao client-side + server-side dos campos

---

## Definition of Done

- [ ] Toggle on/off funciona e persiste no PricingConfig
- [ ] Campos de configuracao editaveis com validacao
- [ ] Metricas exibidas corretamente (total, creditos, conversao, top 5)
- [ ] Lista de indicacoes paginada e filtravel por status
- [ ] Todas as rotas protegidas por role ADMIN (403 para nao-admins)
- [ ] Alteracoes refletem em novos rewards imediatamente
- [ ] Layout consistente com outras paginas admin existentes
- [ ] TypeScript strict sem erros

---

## Dependencies

- Story 11.1 — modelo `ReferralReward` e campos no User
- Story 11.3 — logica de atribuicao popula dados de rewards
- Story 11.4 — interface do aluno (referencia para consistencia de dados)
- PricingConfig — modelo existente para armazenar settings
