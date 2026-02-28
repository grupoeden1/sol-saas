# Story 3.5 — Painel do Usuário

**Epic:** 3 — Credits & Payments
**Status:** Done
**Created by:** SM (story-development-cycle workflow)
**Story ID:** sol-3.5

---

## User Story

As a student,
I want a dashboard showing my credits, purchase history and conversation history,
so that I can track my usage and manage my account.

---

## Acceptance Criteria

1. Página `/dashboard` exibe: saldo atual de créditos, lista de `credit_transactions` com tipo, valor e data (paginada, 20/página), lista de conversas com título e data (link para reabrir no chat)
2. Dados carregados via Server Components do Next.js 14
3. Link "Comprar mais créditos" em destaque quando saldo < 10 créditos (`balanceCents < 1000`)
4. Layout consistente com o shell definido no Epic 1

---

## Scope

**IN:**
- Rewrite de `/dashboard/page.tsx` — substituir page de boas-vindas por painel com dados reais
- Seção "Saldo de Créditos" — card com saldo formatado e CTA condicional
- Seção "Histórico de Transações" — tabela com `credit_transactions` (tipo, valor, data), paginada 20/página com Server Components
- Seção "Conversas" — lista de conversas com título e data, link para `/chat?id={conversationId}`
- Todos os dados carregados via Server Components (queries Prisma direto no RSC, sem API routes adicionais)
- Componente de paginação server-side para transações (query params `?page=1`)

**OUT:**
- Gráficos ou analytics de uso (futuro)
- Exportação/download de transações
- Detalhes expandidos de transações individuais (tokens, modelo, custo USD)
- Filtros por tipo de transação ou período
- Modificação no header/AppLayout existente

---

## Dependencies

| Dependency | Story | Status |
|------------|-------|--------|
| Schema `CreditTransaction` com campos de auditoria | 3.1 | ✅ Done |
| Schema `Conversation` com título e data | 2.1 | ✅ Done |
| `balanceCents` no model `User` | 1.2 | ✅ Done |
| AppLayout shell com CreditsBadge | 1.4 | ✅ Done |
| `formatBalance()` para exibição de créditos | 3.6 | ✅ Done |

---

## Technical Notes

### Server Components para dados

Toda a página usa React Server Components (RSC) do Next.js 14. Queries Prisma executam diretamente no componente — sem necessidade de API routes dedicadas para leitura do dashboard.

```typescript
// Dentro do RSC — query direta
const transactions = await prisma.creditTransaction.findMany({
  where: { userId: user.id },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: (page - 1) * 20,
});
```

### Paginação server-side

Paginação via search params (`?page=1`). Componente de paginação renderiza links `<Link href="/dashboard?page=N">` que fazem soft navigation sem client-side state.

```typescript
const page = Number(searchParams?.page) || 1;
const PAGE_SIZE = 20;
const totalCount = await prisma.creditTransaction.count({ where: { userId: user.id } });
const totalPages = Math.ceil(totalCount / PAGE_SIZE);
```

### Formatação de transações

- **Tipo `purchase`:** exibir como "Compra de créditos" com valor positivo em verde
- **Tipo `consumption`:** exibir como "Uso do chat" com valor negativo em vermelho/muted
- **Valor:** usar `formatBalance(Math.abs(amount))` para exibição amigável
- **Data:** `toLocaleDateString('pt-BR')` ou similar

### Link para conversa

Cada conversa na lista linka para `/chat?id={conversationId}` para reabrir no chat. Verificar se a chat page já suporta query param `id` para carregar conversa existente.

### CTA condicional

```typescript
const showBuyPrompt = balanceCents < 1000; // < 10 créditos
```

Quando `showBuyPrompt`, renderizar card de destaque com link para `/credits/buy`.

---

## File List

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/app/dashboard/page.tsx` | UPDATE | Rewrite completo — RSC com saldo, transações paginadas e conversas |
| `apps/web/src/components/dashboard/CreditSummary.tsx` | CREATE | Componente RSC: card de saldo com CTA condicional |
| `apps/web/src/components/dashboard/TransactionHistory.tsx` | CREATE | Componente RSC: tabela de transações paginada com layout responsivo |
| `apps/web/src/components/dashboard/ConversationList.tsx` | CREATE | Componente RSC: lista de conversas com links para `/chat?id=` |
| `apps/web/src/components/dashboard/Pagination.tsx` | CREATE | Componente de paginação server-side via search params |
| `apps/web/src/app/chat/page.tsx` | UPDATE | Suporte a query param `?id=` para abrir conversa diretamente do dashboard |

---

## Business Value

Fecha a visibilidade do aluno sobre seu uso da plataforma. Sem o dashboard, o aluno só vê o saldo no header — não tem acesso ao histórico de compras, consumo ou conversas anteriores. Esse painel é pré-requisito para confiança no sistema de créditos.

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Performance com muitas transações | Paginação server-side (20/página), índice `@@index([userId])` já existe |
| Chat page não suporta query param `id` | Verificar implementação atual; se não suporta, linkar para `/chat` com sidebar aberta |
| Inconsistência de saldo entre header e dashboard | Ambos leem `balanceCents` do banco via RSC — consistente por natureza |

---

## Definition of Done

- [x] `/dashboard` exibe saldo de créditos formatado
- [x] Lista de transações com tipo, valor e data exibida corretamente
- [x] Transações paginadas (20/página) com navegação funcional
- [x] Lista de conversas com título, data e link para reabrir
- [x] CTA "Comprar mais créditos" visível quando saldo < 10 créditos
- [x] Todos os dados carregados via Server Components (zero client-side fetch)
- [x] Layout consistente com AppLayout/shell do Epic 1
- [x] Nenhuma regressão em auth, chat ou fluxo de créditos
