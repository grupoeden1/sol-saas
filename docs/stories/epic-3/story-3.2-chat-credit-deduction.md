# Story 3.2 — Deducção de Crédito no Chat

**Epic:** 3 — Créditos & Pagamentos
**Story ID:** 3.2
**Priority:** High
**Estimate:** 3-5 story points
**Status:** DONE

---

## User Story

**As a** product owner,
**I want** credits to be deducted automatically when a student sends a message,
**so that** usage is metered correctly.

---

## Context

Esta story conecta o sistema de créditos (Story 3.1) à API de chat existente (Story 2.3). A dedução acontece **após** o stream da Claude API completar com sucesso — se a chamada falhar, nenhum crédito é deducido (o aluno não paga por erro).

**Estado atual (baseline):**
- Verificação `credits === 0 → 402`: ✅ Story 2.4
- `deductCredits(userId, amount)`: ✅ Story 3.1 (atômica, com `InsufficientCreditsError`)
- `X-Credits-Remaining` header: ✅ Story 2.4 (valor pré-dedução)
- Frontend lê header e atualiza badge: ✅ Story 2.4
- Dedução real após stream: ❌ **esta story**
- Badge atualiza pós-dedução (saldo exato): ❌ **esta story**

**Decisão arquitetural (timing da dedução):**
- `X-Credits-Remaining` no header HTTP → enviado **antes** do stream (valor pré-dedução)
- `creditsRemaining` no evento SSE `done` → enviado **após** dedução (valor exato)
- Frontend usa ambos: header para update imediato, `done` para valor final correto

---

## Acceptance Criteria

### AC1: Dedução de 1 crédito após stream bem-sucedido

- [ ] Após salvar a resposta completa do assistente no banco, chamar `deductCredits(user.id, 1)`
- [ ] Dedução ocorre **somente** se o stream completou sem erro
- [ ] Se `deductCredits` lançar `InsufficientCreditsError` (race condition), o log registra mas a resposta já foi entregue
- [ ] 1 crédito por mensagem (custo fixo no MVP)

**Test:** Enviar mensagem com 5 créditos → stream completa → saldo = 4, 1 registro `type=consumption` em `credit_transactions`.

---

### AC2: Nenhum crédito deducido se Claude API falhar

- [ ] Se ocorrer erro durante o streaming (rate limit, timeout, etc.), `deductCredits` **não é chamado**
- [ ] O aluno vê a mensagem de erro amigável sem perder créditos
- [ ] Log: `[Chat API] Claude API error - no credits deducted`

**Test:** Simular erro da Claude API → saldo permanece o mesmo, nenhum registro `consumption` criado.

---

### AC3: `X-Credits-Remaining` atualizado no evento `done`

- [ ] O evento SSE `done` inclui campo `creditsRemaining` com saldo pós-dedução
- [ ] Formato: `{ done: true, conversationId: string, creditsRemaining: number }`
- [ ] Frontend lê `creditsRemaining` do evento `done` e chama `updateCredits()` no CreditsContext
- [ ] Badge no header reflete saldo exato após cada mensagem sem page reload

**Test:** Enviar mensagem com 10 créditos → header mostra 10 → stream completa → evento `done` traz `creditsRemaining: 9` → badge atualiza para 9.

---

### AC4: Logs de consumo em `credit_transactions`

- [ ] Cada dedução cria registro com `type: consumption`, `amount: -1`, `description: "Dedução de 1 crédito(s)"`
- [ ] Registro vinculado ao `userId` correto
- [ ] Timestamp `createdAt` registrado automaticamente

**Test:** Enviar 3 mensagens → 3 registros `consumption` em `credit_transactions`.

---

### AC5: Badge no header e input desabilitam quando saldo chega a zero

- [ ] Se `creditsRemaining === 0` no evento `done`, o frontend:
  - Atualiza badge para 0 (via CreditsContext)
  - Seta `noCredits = true` (desabilita input)
  - **Não** mostra alert inline (o alert inline é para tentativas de envio sem crédito)
- [ ] Próxima tentativa de envio será bloqueada pelo `402` da API

**Test:** Usuário com 1 crédito envia mensagem → stream completa → badge = 0, input desabilitado → tentar enviar novamente → 402 + alert inline.

---

## Technical Implementation Notes

### API Route: fluxo de dedução

```
POST /api/chat
  ├─ auth check
  ├─ credits === 0 → 402 (Story 2.4) ← JÁ EXISTE
  ├─ save user message
  ├─ stream Claude API
  │   ├─ success:
  │   │   ├─ save assistant message
  │   │   ├─ deductCredits(user.id, 1) → newBalance     ← NOVO
  │   │   └─ send { done: true, conversationId, creditsRemaining: newBalance }
  │   └─ error:
  │       ├─ send { error: message }
  │       └─ NO deduction                                ← JÁ EXISTE
  └─ headers: X-Credits-Remaining (pre-deduction value)  ← JÁ EXISTE
```

### Frontend: fluxo de atualização

```
handleSendMessage()
  ├─ res.headers.get('X-Credits-Remaining') → updateCredits(pre)  ← JÁ EXISTE
  └─ stream events:
      └─ data.done:
          └─ data.creditsRemaining → updateCredits(post)          ← NOVO
              └─ if 0: setNoCredits(true)                         ← NOVO
```

---

## Files to Modify

| File | Action | Mudança |
|------|--------|---------|
| `apps/web/src/app/api/chat/route.ts` | MODIFY | Import `deductCredits` + chamar após stream + incluir `creditsRemaining` no done |
| `apps/web/src/app/chat/page.tsx` | MODIFY | Ler `creditsRemaining` do evento `done` e atualizar contexto |

---

## Dependencies

- **Blocked by:** Story 3.1 (`deductCredits` deve existir) ✅ Done
- **Blocked by:** Story 2.4 (402 check + X-Credits-Remaining infra) ✅ Done
- **Blocks:** Story 3.3 (compra de créditos precisa do sistema de dedução funcionando)

---

## Testing Checklist

- [ ] Enviar mensagem com créditos > 0 → saldo decrementa em 1
- [ ] `credit_transactions` registra `type: consumption, amount: -1`
- [ ] Erro da Claude API → saldo permanece inalterado
- [ ] Badge atualiza para saldo pós-dedução após stream completar
- [ ] Saldo chegando a 0 → input desabilita, badge mostra 0
- [ ] Saldo = 0 → 402 na próxima tentativa (Story 2.4 não regride)
- [ ] `pnpm typecheck` passa sem erros

---

## Definition of Done

- [ ] `deductCredits` chamado após stream bem-sucedido na API
- [ ] `creditsRemaining` incluído no evento SSE `done`
- [ ] Frontend consome `creditsRemaining` e atualiza badge + noCredits
- [ ] Erro Claude API não deducta créditos
- [ ] TypeScript strict, nenhum erro no typecheck
