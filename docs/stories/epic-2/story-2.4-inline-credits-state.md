# Story 2.4 — Estado Inline de Créditos Insuficientes

**Epic:** 2 — Chat Core com IA
**Story ID:** 2.4
**Priority:** High
**Estimate:** 3-5 story points
**Status:** Draft

---

## User Story

**As a** student with no credits,
**I want** to see a clear inline prompt when I try to send a message,
**so that** I know exactly what to do to continue using SOL.

---

## Context

Esta story fecha o Epic 2 tornando o estado de saldo zero visível e acionável. Quando o usuário tenta enviar uma mensagem sem créditos, a API retorna `402 Payment Required` e o frontend exibe um prompt inline (não modal, não nova página) diretamente no chat, com CTA direto para compra. Adicionalmente, o badge de créditos no header passa a atualizar em tempo real via header HTTP `X-Credits-Remaining`, eliminando a necessidade de re-render da página para refletir o saldo atual.

**Contexto técnico:**
- Créditos do usuário vivem em `User.credits` (Prisma schema, default 0)
- `POST /api/chat` já valida auth e busca o usuário do banco
- `AppLayout` é Server Component — requer `CreditsProvider` (Client) para atualização em tempo real
- Deducção real de créditos é responsabilidade da Story 3.2 — esta story apenas lê e expõe o saldo

---

## Acceptance Criteria

### AC1: API retorna 402 quando saldo é zero

- [ ] `POST /api/chat` verifica `user.credits` antes de chamar a OpenAI
- [ ] Se `user.credits === 0`, retorna `402 Payment Required` com body JSON: `{ error: 'insufficient_credits' }`
- [ ] Verificação ocorre antes de qualquer chamada externa (sem consumo de tokens da OpenAI)
- [ ] Respostas bem-sucedidas incluem header `X-Credits-Remaining: <n>` com saldo atual do usuário

**Test:** Usuário com `credits = 0` envia mensagem → resposta `402` imediata, sem chamada à OpenAI.

---

### AC2: Prompt inline de créditos insuficientes no chat

- [ ] Ao receber `402`, o frontend exibe mensagem inline na área do chat (não modal, não toast, não redirect)
- [ ] Mensagem: `"Você ficou sem créditos."` seguida de link `"Comprar créditos →"`
- [ ] Link redireciona para `/credits/buy`
- [ ] Mensagem aparece visualmente como um alerta no chat (diferente de mensagem normal)
- [ ] Mensagem do usuário que tentou enviar é removida da UI (não ficou registrada no banco)

**Test:** Usuário sem créditos envia mensagem → mensagem do usuário desaparece + alerta inline aparece no chat.

---

### AC3: Badge de créditos atualiza em tempo real

- [ ] `CreditsBadge` lê créditos de um `CreditsContext` (Client-side), não diretamente do Server
- [ ] `AppLayout` passa o valor inicial de créditos (buscado do banco) para o `CreditsProvider`
- [ ] Após cada mensagem enviada com sucesso, `ChatPage` lê o header `X-Credits-Remaining` e atualiza o contexto
- [ ] Badge reflete o novo saldo sem page reload

**Test:** Enviar mensagem com sucesso → badge atualiza para o valor retornado no header (sem reload).

---

### AC4: Input desabilitado com saldo zero

- [ ] `ChatInput` recebe prop `noCredits: boolean`
- [ ] Quando `noCredits = true`: input está `disabled`, placeholder muda para `"Sem créditos disponíveis"`
- [ ] Botão Enviar também desabilitado quando `noCredits = true`
- [ ] Estado inicial derivado dos créditos do contexto (se `credits === 0` na carga, input já inicia desabilitado)

**Test:** Usuário com `credits = 0` abre chat → input já está desabilitado ao carregar a página.

---

## Technical Implementation Notes

### Arquitetura: CreditsProvider

```
AppLayout (Server Component)
  → busca user.credits do banco
  → passa como initialCredits para:

CreditsProvider (Client Component)
  → gerencia estado de créditos via Context
  → expõe { credits, updateCredits }
  → wraps: Header (CreditsBadge) + Main (ChatPage)

CreditsBadge (Client Component)
  → lê credits do CreditsContext

ChatPage (Client Component)
  → lê credits do CreditsContext para determinar noCredits inicial
  → após stream bem-sucedido, lê X-Credits-Remaining e chama updateCredits
  → ao receber 402, seta estado local noCredits = true
```

### Fluxo: mensagem com saldo zero

```
ChatPage.handleSendMessage()
  → fetch POST /api/chat
  → res.status === 402
  → remove userMessage da UI (não salva no banco)
  → exibe InlineNoCreditsAlert na ChatArea
  → noCredits = true (input desabilitado)
```

### Fluxo: mensagem bem-sucedida (créditos > 0)

```
ChatPage.handleSendMessage()
  → fetch POST /api/chat
  → res.headers.get('X-Credits-Remaining') → N
  → updateCredits(N) → badge atualiza
  → stream processa normalmente
```

### API Route: verificação de créditos

```typescript
// Em POST /api/chat, após buscar o usuário:
if (user.credits === 0) {
  return new Response(JSON.stringify({ error: 'insufficient_credits' }), {
    status: 402,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Nos headers da response de stream:
return new Response(readable, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Credits-Remaining': String(user.credits), // saldo atual (deducção é story 3.2)
  },
});
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/components/layout/CreditsProvider.tsx` | CREATE | Context provider para créditos em tempo real |
| `apps/web/src/app/api/chat/route.ts` | MODIFY | Adicionar verificação 402 + header X-Credits-Remaining |
| `apps/web/src/components/layout/AppLayout.tsx` | MODIFY | Usar CreditsProvider com initialCredits |
| `apps/web/src/components/layout/CreditsBadge.tsx` | MODIFY | Ler créditos do CreditsContext |
| `apps/web/src/app/chat/page.tsx` | MODIFY | Tratar 402, ler header, gerenciar noCredits, passar para children |
| `apps/web/src/app/chat/components/ChatInput.tsx` | MODIFY | Adicionar prop noCredits + visual diferenciado |
| `apps/web/src/app/chat/components/ChatArea.tsx` | MODIFY | Exibir prompt inline de créditos insuficientes |

---

## Dependencies

- **Blocked by:** Story 2.3 (API de chat deve estar funcional) ✅
- **Blocks:** Story 3.2 (Deducção real precisa da verificação 402 já em lugar)
- **Schema:** `User.credits` já existe no Prisma schema ✅
- **Context:** Nenhuma lib externa nova necessária (React Context nativo)

---

## Testing Checklist

- [ ] Usuário com `credits = 0`: `POST /api/chat` retorna `402`
- [ ] Usuário com `credits > 0`: resposta inclui header `X-Credits-Remaining`
- [ ] Badge atualiza após mensagem enviada (sem page reload)
- [ ] Prompt inline aparece após tentativa com saldo zero
- [ ] Link "Comprar créditos →" redireciona para `/credits/buy`
- [ ] Input desabilitado quando credits = 0 (na carga e após 402)
- [ ] `pnpm run typecheck` passa sem erros
- [ ] Nenhuma chamada à OpenAI quando saldo é zero (verificar logs)

---

## Definition of Done

- [ ] Todos os ACs validados manualmente com usuário de créditos zerados
- [ ] Badge atualiza em tempo real via X-Credits-Remaining
- [ ] Prompt inline implementado (não modal, não toast)
- [ ] Input desabilitado corretamente
- [ ] Code review: sem any, sem as unknown, TypeScript strict
- [ ] Nenhum erro de TypeScript (pnpm typecheck)

---

## References

- **PRD:** [docs/prd.md](../../prd.md) — Story 2.4, Epic 2 (FR5, FR6, FR7)
- **Story 2.3:** [story-2.3-openai-integration.md](./story-2.3-openai-integration.md) — API base
- **Story 3.2:** [epic-3] — Deducção real de créditos (consome este 402)
