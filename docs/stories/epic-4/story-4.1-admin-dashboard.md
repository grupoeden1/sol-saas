# Story 4.1 — Painel Administrativo

**Epic:** 4 — Admin & Operações
**Status:** Done
**Created by:** SM (story-development-cycle workflow)
**Story ID:** sol-4.1

---

## User Story

As a SOL administrator,
I want an admin dashboard at /admin with real data showing users, credits, token consumption and revenue,
so that I have full visibility into product usage and can manage the platform effectively.

---

## Acceptance Criteria

1. Página `/admin` exibe métricas reais do banco: total de usuários, receita total (soma de credit_transactions tipo purchase), total de tokens consumidos (soma de inputTokens + outputTokens)
2. Tabela de usuários exibe dados reais do Prisma: email, role, balanceCents (formatado como créditos), total de tokens consumidos por usuário, total de conversas, data de criação
3. Tabela paginada (20/página) com server-side pagination via search params
4. Métricas de "este mês" calculadas com filtro `createdAt >= firstDayOfMonth`
5. Proteção de rota: middleware bloqueia acesso a `/admin` para `role !== 'ADMIN'`, redirecionando para `/dashboard` (já implementado)
6. Sessão JWT inclui `role` sem query extra ao banco (já implementado)
7. Remoção completa de dados mock — toda informação vem de queries Prisma
8. Nenhuma regressão em auth, chat ou fluxo de créditos

---

## Scope

**IN:**
- Rewrite de `/admin/page.tsx` — substituir dados mock por queries Prisma reais
- Métricas: total de usuários, receita total em centavos (formatada), tokens totais consumidos
- Métricas "este mês": variação percentual comparado ao mês anterior
- Tabela de usuários com dados reais: email, role, créditos, tokens, conversas, createdAt
- Paginação server-side para tabela de usuários
- Coluna "Plano" removida (não existe no schema — era mock)
- Coluna "Nome" removida (não existe no schema — era mock)

**OUT:**
- CRUD de usuários (editar, deletar, alterar role) — futuro
- Gráficos ou charts de uso ao longo do tempo
- Exportação de dados
- Filtros por período customizado
- Detalhes de transações por usuário (drill-down)
- Ações em batch sobre usuários

---

## Dependencies

| Dependency | Story | Status |
|------------|-------|--------|
| Schema `User` com role enum | 1.2 | Done |
| Schema `CreditTransaction` com tokens/costUsd | 3.1 | Done |
| Schema `Conversation` | 2.1 | Done |
| Middleware role-based `/admin` | 4.1 (parcial) | Done |
| JWT com role | 4.1 (parcial) | Done |

---

## Technical Notes

### Server Component com queries Prisma

A página é async RSC. Todas as métricas e dados vêm de queries diretas do Prisma, sem API routes.

```typescript
// Métricas agregadas
const [totalUsers, totalRevenue, totalTokens] = await Promise.all([
  prisma.user.count(),
  prisma.creditTransaction.aggregate({
    where: { type: 'purchase' },
    _sum: { amount: true },
  }),
  prisma.creditTransaction.aggregate({
    where: { type: 'consumption' },
    _sum: { inputTokens: true, outputTokens: true },
  }),
]);
```

### Tabela de usuários com dados agregados

```typescript
const users = await prisma.user.findMany({
  take: PAGE_SIZE,
  skip: (page - 1) * PAGE_SIZE,
  orderBy: { createdAt: 'desc' },
  select: {
    id: true,
    email: true,
    role: true,
    balanceCents: true,
    createdAt: true,
    _count: { select: { conversations: true } },
  },
});
```

Para tokens por usuário, usar aggregate groupBy ou subquery.

### Métricas mensais com variação

```typescript
const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
```

Variação: `((thisMonth - lastMonth) / lastMonth * 100).toFixed(0) + '%'`

---

## File List

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/app/admin/page.tsx` | UPDATE | Rewrite completo — RSC com dados reais do Prisma |
| `apps/web/src/components/admin/MetricCard.tsx` | CREATE | Componente de métrica com valor, label e variação |
| `apps/web/src/components/admin/UsersTable.tsx` | CREATE | Tabela de usuários com dados reais e paginação |

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Performance com muitos usuários na tabela | Paginação server-side (20/pg), índices existentes |
| Queries agregadas pesadas | Promise.all para paralelismo, agregações simples |
| Token count por usuário pode ser lento | Usar _sum aggregate ao invés de carregar todas as transactions |

---

## Definition of Done

- [x] `/admin` exibe métricas reais do banco (total users, receita, tokens)
- [x] Tabela de usuários com dados reais (email, role, créditos, tokens, conversas)
- [x] Paginação server-side funcional
- [x] Zero dados mock no código
- [x] Proteção de rota por role mantida
- [x] TypeScript compila sem erros
- [x] Build completo sem warnings
- [x] Nenhuma regressão em auth, chat ou fluxo de créditos
