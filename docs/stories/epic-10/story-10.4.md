# User Story: Engine de Entrega de Popups e Upsell Automático

**ID:** 10.4
**Epic:** 10 - Promoções & Upsell One-Click
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 10.2 (One-Click Payment Engine), Story 10.3 (Admin de Campanhas)

---

## Statement

As a student using the platform,
I want to see relevant promotional offers and low-credit alerts at the right moment,
so that I can take advantage of deals and keep my balance topped up without interruptions.

---

## Context

A Engine de Entrega é responsável por exibir popups promocionais e banners de upsell automático aos alunos no momento certo. Quando há campanhas ACTIVE cujos filtros de segmentação se aplicam ao perfil do usuário, o sistema entrega um popup com a oferta. Regras rígidas: máximo 1 popup por campanha por usuário (unique constraint no `PromoDelivery`), máximo 1 popup por sessão, e NUNCA durante streaming de chat ou geração de roteiro. Eventos de interação (viewed, clicked, converted, dismissed) são rastreados para métricas. Separadamente, um banner inline (não popup) de upsell automático é exibido quando os créditos do usuário estão abaixo do `UPSELL_LOW_CREDITS_THRESHOLD` configurável pelo admin.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | API `GET /api/promos/active` retorna a campanha aplicável ao user logado: busca campanhas com `status: ACTIVE`, `startsAt <= now`, `endsAt >= now` (ou null), aplica filtros de segmentação ao perfil do user, e exclui campanhas já entregues (existe `PromoDelivery` para este user+campaign). Retorna no máximo 1 campanha ou `null` | TODO |
| 2 | API `POST /api/promos/track` aceita `{ campaignId, event }` onde event é `viewed` \| `clicked` \| `converted` \| `dismissed`. Cria `PromoDelivery` (upsert) e atualiza o campo correspondente (`viewedAt`, `clickedAt`, `convertedAt`, `dismissedAt`) com timestamp atual | TODO |
| 3 | Unique constraint `(campaignId, userId)` garante máximo 1 entrega por campanha por usuário. Tentativa de criar duplicata faz upsert (atualiza campos de evento) | TODO |
| 4 | Popups NUNCA são exibidos durante streaming de chat (resposta da IA sendo gerada) ou durante geração de roteiro. Frontend verifica estado de streaming antes de exibir | TODO |
| 5 | Máximo 1 popup por sessão do usuário. Após exibir ou dismissar um popup, nenhum outro popup é mostrado até a próxima sessão (controle via sessionStorage ou state) | TODO |
| 6 | Banner inline de upsell automático (não popup) é exibido quando `credits <= UPSELL_LOW_CREDITS_THRESHOLD` (valor lido de PricingConfig). Banner aparece no dashboard ou área de chat, com CTA para compra de créditos | TODO |
| 7 | Banner de upsell só aparece se `UPSELL_ENABLED` está `true` em PricingConfig | TODO |
| 8 | Popup promocional exibe: título da campanha, mensagem, botão de ação (integrado com one-click ou checkout), botão de dismiss. Evento `viewed` é rastreado ao exibir, `clicked` ao clicar CTA, `dismissed` ao fechar, `converted` após compra bem-sucedida | TODO |

---

## Technical Notes

- **API Routes:** `apps/api/src/routes/promos/active.ts`, `apps/api/src/routes/promos/track.ts`
- **Frontend:** Componente `PromoPopup` (modal) e componente `UpsellBanner` (inline)
- **Segmentação query:** Filtros JSON da campanha aplicados ao user: créditos restantes (via `credit_balance`), última atividade (via `last_conversation.createdAt`), total de mensagens (via `COUNT(conversations)`)
- **Session control:** `sessionStorage.setItem('promo_popup_shown', 'true')` para limitar 1 popup por sessão
- **Streaming guard:** Verificar flag `isStreaming` / `isGenerating` no state do chat/roteiro antes de exibir popup
- **Upsell threshold:** Lido via API existente de PricingConfig ou incluído no payload de sessão do user
- **Referência:** PRD Addendum v11.0 — FR41, FR42

---

## Tasks / Subtasks

- [ ] Implementar `GET /api/promos/active` com lógica de segmentação e exclusão de campanhas já entregues
- [ ] Implementar query de filtros JSON (créditos, atividade, mensagens) sobre perfil do user
- [ ] Implementar `POST /api/promos/track` com upsert de PromoDelivery e atualização de evento
- [ ] Criar componente `PromoPopup` com título, mensagem, botão CTA (one-click ou checkout) e botão dismiss
- [ ] Integrar PromoPopup com One-Click Payment Engine (Story 10.2) para compra direta
- [ ] Implementar guard de streaming: não exibir popup durante `isStreaming` ou `isGenerating`
- [ ] Implementar controle de 1 popup por sessão via sessionStorage
- [ ] Criar componente `UpsellBanner` inline para créditos baixos
- [ ] Implementar lógica de exibição do UpsellBanner quando `credits <= UPSELL_LOW_CREDITS_THRESHOLD` e `UPSELL_ENABLED === true`
- [ ] Rastrear eventos (viewed, clicked, converted, dismissed) em cada interação do user
- [ ] Tratar caso de `converted`: marcar após confirmação de pagamento (callback do one-click ou webhook)

---

## Definition of Done

- [ ] `GET /api/promos/active` retorna campanha correta baseada em segmentação do user
- [ ] Campanhas já entregues ao user são excluídas da resposta
- [ ] Tracking de eventos funciona para viewed, clicked, converted, dismissed
- [ ] Unique constraint impede entregas duplicadas por campanha+user
- [ ] Popup nunca aparece durante streaming ou geração de roteiro
- [ ] Máximo 1 popup por sessão respeitado
- [ ] Banner de upsell aparece quando créditos abaixo do threshold e UPSELL_ENABLED = true
- [ ] Banner de upsell não aparece quando UPSELL_ENABLED = false
- [ ] Integração com One-Click Payment Engine funciona no popup
- [ ] Testes unitários e de integração passam

---

## Dependencies

- Story 10.2 — One-Click Payment Engine implementado (botão de compra no popup)
- Story 10.3 — CRUD de campanhas e API admin implementados
- Story 10.1 — modelos PromoCampaign, PromoDelivery, PricingConfig seeds (UPSELL_ENABLED, UPSELL_LOW_CREDITS_THRESHOLD)
