# Story 4.2 — Admin Console: Métricas Operacionais e Financeiras

**Epic:** 4 — Admin & Operações
**Status:** In Progress
**Created by:** River (SM — story-development-cycle workflow)
**Story ID:** sol-4.2
**Priority:** High
**Estimate:** 13 story points

---

## User Story

**As a** dono do SOL,
**I want** um painel administrativo com métricas reais e capacidade de adicionar créditos manualmente,
**so that** eu possa monitorar a saúde do negócio e atender alunos com necessidades especiais sem passar pelo Stripe.

---

## Context

Stories 1–3 concluídas. Story 4.1 (autenticação admin/middleware) concluída. Story 3.6 (sistema de precificação com gate + cotação) e Story 2.5 (anexos) implementadas.

**Estado atual do schema:**
- `User.role` com enum `Role { USER, ADMIN }` ✅ existe
- `TransactionType` com `purchase | consumption` ✅ existe — **falta `adjustment`**
- `CreditTransaction` com campos de auditoria completos ✅ existe — **faltam `grossAmountCents` e `adminEmail`**
- `ExchangeRate` ✅ existe
- `addCredits()` com assinatura `(userId, amountCents, stripePaymentId, exchangeRate)` ✅ existe — **precisa refatorar para discriminated union**
- Webhook Stripe ✅ existe — **não registra `grossAmountCents`**
- Página `/admin` ✅ existe (Story 4.1) — **precisa substituir por métricas reais completas**

**O que NÃO muda:** chat, streaming SSE, autenticação, painel do aluno (`/dashboard`), Stripe Checkout. A experiência do aluno é intocada.

---

## Acceptance Criteria

**Schema**
1. Enum `TransactionType` contém `adjustment` (verificar via Prisma Studio ou query direta)
2. `CreditTransaction` tem campo `grossAmountCents Int?` no schema e na tabela
3. `CreditTransaction` tem campo `adminEmail String?` no schema e na tabela
4. Migration aplica sem erros em banco com dados existentes (campos nullable — zero impacto em rows existentes)
5. Backfill: purchases existentes têm `grossAmountCcents` calculado via `ROUND(amount / 0.40)` (CREDIT_PERCENTAGE atual)

**addCredits() e Webhook**
6. `addCredits()` aceita `{ type: 'purchase', stripePaymentId, exchangeRate, grossAmountCents }` — registers `grossAmountCents` na CreditTransaction
7. `addCredits()` aceita `{ type: 'adjustment', exchangeRate, adminEmail, description }` — sem stripePaymentId, sem grossAmountCents
8. Webhook `checkout.session.completed` extrai `session.amount_total` e passa como `grossAmountCents`
9. Idempotência de purchases mantida via `stripePaymentId UNIQUE` (sem alteração de comportamento)

**Métricas — dados reais**
10. Métricas de usuários corretas: total, ativos 7d (≥1 mensagem), saldo insuficiente (`balanceCents < 100`), novos 30d
11. Métricas de uso corretas: mensagens total/hoje/7d, tokens input+output separados, modelo mais usado com %, mensagens com/sem anexo
12. Receita bruta = `SUM(grossAmountCents) WHERE type = 'purchase'` (não `amount`)
13. Custo OpenAI = `SUM(costUsd × exchangeRate)` por transação individual (raw query)
14. Lucro, margem e markup calculados no servidor a partir dos anteriores
15. Saldo retido = `SUM(balanceCents)` de todos os usuários
16. Cotação atual, mínima e máxima dos últimos 30d via tabela `exchange_rates`

**Adição Manual de Créditos**
17. Formulário em `/admin` aceita: email do usuário + valor em R$ + motivo
18. Dialog de confirmação exibe "Adicionar R$ X,XX ao saldo de [email]?" antes de executar
19. `POST /api/admin/add-credits` retorna 403 para `role: USER`, 404 para email inexistente, 400 para input inválido
20. CreditTransaction gerada com `type: adjustment`, `adminEmail`, `description: "Ajuste manual por [adminEmail]: [motivo]"`, `exchangeRate` do dia, `stripePaymentId: null`, `grossAmountCents: null`
21. Saldo do usuário atualizado atomicamente na mesma `$transaction`
22. Toast de sucesso com valor e email. `router.refresh()` atualiza tabela de usuários

**Paginação e Tabela**
23. Tabela de usuários exibe: email, saldo em R$, total de mensagens, data de cadastro
24. Paginação de 20 usuários por página — server-side via search params

**Qualidade**
25. Todas as rotas `/api/admin/*` verificam `role: ADMIN` server-side (além do middleware)
26. Servidor redirect para `/chat` se `role !== ADMIN` tentar acessar `/admin`
27. TypeScript compila sem erros (`pnpm typecheck` passa)
28. `pnpm build` passa sem erros
29. Nenhuma regressão: chat, streaming SSE, webhook Stripe, autenticação, painel do aluno

---

## Scope

**IN:**
- Migration: enum `adjustment`, campos `grossAmountCents` e `adminEmail`
- Backfill de `grossAmountCents` em purchases existentes
- Refatoração de `addCredits()` para discriminated union
- Atualização do webhook Stripe para registrar `grossAmountCents`
- Novo módulo `packages/db/src/admin.ts` com queries de métricas
- Nova API `POST /api/admin/add-credits`
- Rewrite de `apps/web/src/app/admin/page.tsx` com dados reais
- Dialog de confirmação de adição manual (Client Component)
- Paginação da tabela de usuários

**OUT:**
- Gráficos ou charts (MVP = números e tabelas)
- Exportação CSV/PDF
- CRUD de usuários (editar, deletar, bloquear)
- Filtros de período customizado (apenas: hoje, 7d, 30d, total — fixos)
- Real-time ou WebSockets (atualiza no refresh)
- Notificação por email ao aluno após adição manual

---

## Dependencies

| Dependency | Story | Status |
|---|---|---|
| Schema `User.role` com enum `Role` | 1.2 + 4.1 | Done |
| Schema `CreditTransaction` com campos de auditoria | 3.1 + 3.6 | Done |
| Schema `ExchangeRate` | 3.1 + 3.6 | Done |
| `addCredits()` atual (base para refatoração) | 3.1 + 3.6 | Done |
| Webhook Stripe atual (base para atualização) | 3.4 + 3.6 | Done |
| Middleware de proteção `/admin` | 4.1 | Done |
| `getExchangeRate()` | 3.6 | Done |

---

## Subtasks

### Subtask 1 — Migration: adjustment, grossAmountCents, adminEmail

**Arquivo:** `packages/db/prisma/schema.prisma`

**Mudanças no schema:**

```prisma
enum TransactionType {
  purchase
  consumption
  adjustment  // NOVO — adição manual de créditos pelo admin
}

model CreditTransaction {
  // ... campos existentes ...
  grossAmountCents Int?    // NOVO — valor bruto pago no Stripe (apenas purchase)
  adminEmail       String? // NOVO — email do admin executor (apenas adjustment)
}
```

**Passos:**
1. Editar `schema.prisma`: adicionar `adjustment` ao enum, adicionar os dois campos nullable
2. Criar migration: `cd packages/db && npx prisma migrate dev --name add_adjustment_gross_admin`
3. Executar backfill SQL na migration (ou via script separado):

```sql
UPDATE credit_transactions
SET gross_amount_cents = ROUND(amount::numeric / 0.40)
WHERE type = 'purchase'
  AND gross_amount_cents IS NULL;
```

**Nota:** O backfill usa CREDIT_PERCENTAGE=0.40 (valor atual). O resultado é uma aproximação do valor bruto original, suficiente para consistência histórica. Transações futuras terão o valor exato via `session.amount_total`.

**Test:** `npx prisma migrate deploy` sem erros. `npx prisma studio` mostra os novos campos. Query direta confirma `adjustment` no enum. `gross_amount_cents` populado em purchases existentes.

---

### Subtask 2 — Refatorar addCredits() em packages/db/src/credits.ts

**Arquivo:** `packages/db/src/credits.ts`

**Assinatura atual (remover):**
```typescript
addCredits(userId: string, amountCents: number, stripePaymentId: string, exchangeRate: Prisma.Decimal)
```

**Nova assinatura (implementar):**
```typescript
export type AddCreditOptions =
  | {
      type: 'purchase'
      stripePaymentId: string
      exchangeRate: Prisma.Decimal
      grossAmountCents: number
    }
  | {
      type: 'adjustment'
      exchangeRate: Prisma.Decimal
      adminEmail: string
      description: string
    }

export async function addCredits(
  userId: string,
  amountCents: number,
  options: AddCreditOptions,
): Promise<{ balanceCents: number }>
```

**Implementação:**
- Manter transação atômica existente (`prisma.$transaction`)
- Manter `user.update { balanceCents: { increment: amountCents } }`
- Condicionar campos do `creditTransaction.create` pelo `options.type`:

```typescript
// purchase
{
  userId, amount: amountCents, type: 'purchase',
  description: 'Compra de créditos via Stripe',
  stripePaymentId: options.stripePaymentId,
  grossAmountCents: options.grossAmountCents,
  exchangeRate: options.exchangeRate,
}

// adjustment
{
  userId, amount: amountCents, type: 'adjustment',
  description: options.description,
  adminEmail: options.adminEmail,
  exchangeRate: options.exchangeRate,
  stripePaymentId: null,
  grossAmountCents: null,
}
```

- Idempotência de purchase mantida via `stripePaymentId UNIQUE` — a constraint do banco rejeita duplicata, o catch no webhook trata como já processado

**Test:**
- `purchase` cria CreditTransaction com `grossAmountCents` e `stripePaymentId` preenchidos
- Segundo `purchase` com mesmo `stripePaymentId` lança `P2002` (unique constraint) → idempotência ok
- `adjustment` cria CreditTransaction com `adminEmail`, `description`, `stripePaymentId: null`, `grossAmountCents: null`
- Ambos incrementam `balanceCents` corretamente

---

### Subtask 3 — Atualizar Webhook Stripe

**Arquivo:** `apps/web/src/app/api/webhooks/stripe/route.ts`

**Mudança:** Extrair `grossAmountCents` e atualizar a chamada de `addCredits()`.

```typescript
// Antes:
await addCredits(userId, amountCents, stripePaymentId, exchangeRate)

// Depois:
const grossAmountCents = session.amount_total
  ?? Math.round(amountCents / parseFloat(process.env.CREDIT_PERCENTAGE ?? '0.40'))

await addCredits(userId, amountCents, {
  type: 'purchase',
  stripePaymentId,
  exchangeRate,
  grossAmountCents,
})
```

**Nota:** `session.amount_total` é o valor bruto em centavos que o Stripe cobrou do cliente. O fallback (`amountCents / CREDIT_PERCENTAGE`) é apenas para edge cases onde o campo não está disponível no evento — em produção Stripe sempre o envia.

**Test:** Simular evento `checkout.session.completed` com `amount_total: 6990` (R$69,90). CreditTransaction criada com `grossAmountCents: 6990`, `amount: 2796` (40%), idempotência mantida.

---

### Subtask 4 — Queries de Métricas: packages/db/src/admin.ts (NOVO)

**Arquivo:** `packages/db/src/admin.ts`

Módulo com funções tipadas para o painel `/admin`. Todos os cálculos no servidor.

```typescript
import { prisma } from './index'
import { Prisma } from '@prisma/client'

// ─── Types ─────────────────────────────────────────────────────────────

export interface UserMetrics {
  totalUsers: number
  activeUsers7d: number
  lowBalanceUsers: number
  newUsers30d: number
}

export interface UsageMetrics {
  totalMessages: number
  messagesToday: number
  messages7d: number
  totalInputTokens: number
  totalOutputTokens: number
  topModel: string
  topModelPercent: number
  avgTokensPerMessage: number
  messagesWithAttachments: number
  messagesWithoutAttachments: number
}

export interface FinancialMetrics {
  totalRevenueCents: number
  revenue30dCents: number
  totalOpenAICostBRL: number
  grossProfitBRL: number
  grossMarginPercent: number
  markupPercent: number
  creditsSoldCents: number
  creditsConsumedCents: number
  totalRetainedBalanceCents: number
}

export interface ExchangeMetrics {
  currentRate: number
  minRate30d: number
  maxRate30d: number
}

export interface UserRow {
  id: string
  email: string
  balanceCents: number
  totalMessages: number
  createdAt: Date
}

export interface UsersPage {
  users: UserRow[]
  total: number
}
```

**getUserMetrics():**
```typescript
const now = new Date()
const ago7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
const MIN_COST_CENTS = 100

const [totalUsers, usersWithMessages7d, lowBalance, newUsers] = await Promise.all([
  prisma.user.count(),
  prisma.user.count({
    where: {
      conversations: {
        some: {
          messages: { some: { createdAt: { gte: ago7d }, role: 'user' } },
        },
      },
    },
  }),
  prisma.user.count({ where: { balanceCents: { lt: MIN_COST_CENTS } } }),
  prisma.user.count({ where: { createdAt: { gte: ago30d } } }),
])
```

**getUsageMetrics():**
```typescript
const startOfToday = new Date(); startOfToday.setHours(0,0,0,0)

const [totalMessages, messagesToday, messages7d, tokenStats, modelGroups, withAttachments] =
  await Promise.all([
    prisma.message.count({ where: { role: 'user' } }),
    prisma.message.count({ where: { role: 'user', createdAt: { gte: startOfToday } } }),
    prisma.message.count({ where: { role: 'user', createdAt: { gte: ago7d } } }),
    prisma.creditTransaction.aggregate({
      where: { type: 'consumption' },
      _sum: { inputTokens: true, outputTokens: true },
    }),
    prisma.creditTransaction.groupBy({
      by: ['modelUsed'],
      where: { type: 'consumption', modelUsed: { not: null } },
      _count: { id: true },
    }),
    prisma.creditTransaction.count({
      where: { type: 'consumption', hasAttachments: true },
    }),
  ])

// calcular topModel e percentual a partir de modelGroups
// avgTokensPerMessage = (totalInput + totalOutput) / totalTransactions
```

**getFinancialMetrics():**
```typescript
// ATENÇÃO: raw query obrigatória para SUM(cost_usd * exchange_rate)
// Prisma aggregate não suporta multiplicação de campos

const [revenueResult, revenue30dResult, costResult, creditsSold, creditsConsumed, retainedBalance] =
  await Promise.all([
    prisma.creditTransaction.aggregate({
      where: { type: 'purchase' },
      _sum: { grossAmountCents: true },
    }),
    prisma.creditTransaction.aggregate({
      where: { type: 'purchase', createdAt: { gte: ago30d } },
      _sum: { grossAmountCents: true },
    }),
    prisma.$queryRaw<[{ total_cost_brl: number }]>`
      SELECT COALESCE(
        SUM(CAST(cost_usd AS FLOAT) * CAST(exchange_rate AS FLOAT)), 0
      ) AS total_cost_brl
      FROM credit_transactions
      WHERE type = 'consumption'
        AND cost_usd IS NOT NULL
        AND exchange_rate IS NOT NULL
    `,
    prisma.creditTransaction.aggregate({
      where: { type: 'purchase' },
      _sum: { amount: true },
    }),
    prisma.creditTransaction.aggregate({
      where: { type: 'consumption' },
      _sum: { amount: true },  // negativo, usar Math.abs()
    }),
    prisma.user.aggregate({ _sum: { balanceCents: true } }),
  ])

// totalRevenueCents = revenueResult._sum.grossAmountCents ?? 0
// totalOpenAICostBRL = costResult[0].total_cost_brl
// grossProfitBRL = (totalRevenueCents / 100) - totalOpenAICostBRL
// grossMarginPercent = revenue > 0 ? (grossProfit / revenue * 100) : 0
// markupPercent = cost > 0 ? (revenue / cost * 100) : 0
```

**getExchangeMetrics():**
```typescript
const ago30d = ...
const [latest, range] = await Promise.all([
  prisma.exchangeRate.findFirst({ orderBy: { date: 'desc' } }),
  prisma.exchangeRate.aggregate({
    where: { date: { gte: ago30d } },
    _min: { rate: true },
    _max: { rate: true },
  }),
])
```

**getUsersList(page, pageSize):**
```typescript
const [rawUsers, total] = await Promise.all([
  prisma.user.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      balanceCents: true,
      createdAt: true,
      _count: { select: { conversations: true } },
    },
  }),
  prisma.user.count(),
])
// Para totalMessages por usuário: aggregate separado ou subquery via $queryRaw
// Se performance ok: COUNT(messages) via JOIN
```

**Exportar:** Adicionar todos os exports em `packages/db/src/index.ts`.

---

### Subtask 5 — API: POST /api/admin/add-credits

**Arquivo:** `apps/web/src/app/api/admin/add-credits/route.ts` (NOVO)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { prisma } from '@sol/db'
import { addCredits, getExchangeRate } from '@sol/db'

const schema = z.object({
  userEmail: z.string().email(),
  amountBRL: z.number().positive(),
  reason: z.string().min(3).max(200),
})

export async function POST(req: NextRequest) {
  // 1. Auth + role check
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Validação Zod
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { userEmail, amountBRL, reason } = parsed.data

  // 3. Buscar usuário
  const user = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  // 4. Converter e obter cotação
  const amountCents = Math.round(amountBRL * 100)
  const exchangeRate = await getExchangeRate('USD-BRL')

  // 5. Adicionar créditos
  const { balanceCents } = await addCredits(user.id, amountCents, {
    type: 'adjustment',
    exchangeRate,
    adminEmail: session.user.email!,
    description: `Ajuste manual por ${session.user.email}: ${reason}`,
  })

  return NextResponse.json({
    success: true,
    userEmail,
    addedCents: amountCents,
    newBalanceCents: balanceCents,
  })
}
```

---

### Subtask 6 — Página /admin com dados reais

**Arquivo:** `apps/web/src/app/admin/page.tsx` (REWRITE)

```typescript
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getUserMetrics, getUsageMetrics, getFinancialMetrics,
         getExchangeMetrics, getUsersList } from '@sol/db'
import { formatBRL } from '@/lib/format-balance'
import { MetricCard } from '@/components/admin/MetricCard'
import { UsersTable } from '@/components/admin/UsersTable'
import { AddCreditsForm } from '@/components/admin/AddCreditsForm'  // Client Component

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/chat')

  const page = Number(searchParams.page ?? '1')

  const [userMetrics, usageMetrics, financialMetrics, exchangeMetrics, usersPage] =
    await Promise.all([
      getUserMetrics(),
      getUsageMetrics(),
      getFinancialMetrics(),
      getExchangeMetrics(),
      getUsersList(page, 20),
    ])

  return (
    <div className="...">
      {/* Seção 1: Visão Geral de Usuários */}
      {/* Seção 2: Métricas de Uso */}
      {/* Seção 3: Financeiro — cards em amber */}
      {/* Seção 4: Cotação */}
      {/* Seção 5: Tabela de Usuários com paginação */}
      {/* Seção 6: AddCreditsForm (Client Component) */}
    </div>
  )
}
```

**Layout das seções:**
1. **Visão Geral** — 4 MetricCards: Total Usuários | Ativos 7d | Saldo Insuficiente | Novos 30d
2. **Uso** — 6 MetricCards: Mensagens Total | Hoje | 7d | Tokens Input | Tokens Output | Modelo Top
3. **Financeiro** (cards amber/dourado):
   - Receita Bruta Total / 30d
   - Custo OpenAI Total (R$)
   - Lucro Bruto (R$)
   - Margem Bruta (%)
   - Markup (%)
   - Saldo Retido na Plataforma (R$)
4. **Cotação** — Cotação atual | Mín 30d | Máx 30d
5. **Lista de Usuários** — tabela paginada
6. **Adicionar Créditos** — form isolado em Client Component

---

### Subtask 7 — Dialog de Confirmação (Client Component)

**Arquivo:** `apps/web/src/components/admin/AddCreditsForm.tsx` (NOVO)

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle,
         DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'  // ou componente de toast existente no projeto

export function AddCreditsForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ userEmail: '', amountBRL: '', reason: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setOpen(true)  // abre dialog de confirmação
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/add-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: form.userEmail,
          amountBRL: parseFloat(form.amountBRL),
          reason: form.reason,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao adicionar créditos')
      toast.success(`R$ ${form.amountBRL} adicionados ao saldo de ${form.userEmail}`)
      setForm({ userEmail: '', amountBRL: '', reason: '' })
      setOpen(false)
      router.refresh()  // atualiza a tabela de usuários via RSC revalidation
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* Input email, amountBRL, reason */}
        {/* Botão "Adicionar" */}
      </form>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar adição de créditos</DialogTitle>
          </DialogHeader>
          <p>
            Adicionar <strong>R$ {form.amountBRL}</strong> ao saldo de{' '}
            <strong>{form.userEmail}</strong>?
          </p>
          <p className="text-sm text-muted-foreground">Motivo: {form.reason}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? 'Adicionando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

---

### Subtask 8 — Testes

**Testes de migração:**
- Enum tem `adjustment`
- `grossAmountCents` e `adminEmail` existem e são nullable
- Backfill populou `grossAmountCents` em purchases existentes

**Testes de addCredits():**
- `purchase`: registra `grossAmountCents`, `stripePaymentId`, `type: purchase`
- `purchase` duplicado: lança `P2002` → idempotência mantida
- `adjustment`: registra `adminEmail`, `description`, `stripePaymentId: null`, `grossAmountCents: null`
- Ambos incrementam `balanceCents` corretamente

**Testes de webhook:**
- `checkout.session.completed` com `amount_total: 6990` → `grossAmountCents: 6990` na CreditTransaction
- Fallback sem `amount_total` → calcula via `amountCents / CREDIT_PERCENTAGE`

**Testes de admin.ts:**
- `getFinancialMetrics()`: receita = soma de `grossAmountCents` (não `amount`), custo = raw query por transação
- `getUserMetrics()`: contagem correta com banco seedado
- `getUsageMetrics()`: tokens corretos, topModel correto

**Testes de API:**
- `POST /api/admin/add-credits` → 200 com saldo atualizado
- Role USER → 403
- Email inexistente → 404
- Input inválido (amountBRL negativo) → 400 Zod error
- Página `/admin` com role USER → redirect `/chat`
- Página `/admin` com role ADMIN → carrega normalmente

---

## File List

| File | Action | Description |
|---|---|---|
| `packages/db/prisma/schema.prisma` | UPDATE | Adicionar `adjustment` ao enum, `grossAmountCents Int?`, `adminEmail String?` |
| `packages/db/prisma/migrations/TIMESTAMP_admin_console/migration.sql` | CREATE | Migration + backfill grossAmountCents |
| `packages/db/src/credits.ts` | UPDATE | Refatorar `addCredits()` para discriminated union |
| `packages/db/src/admin.ts` | CREATE | Funções de métricas: getUserMetrics, getUsageMetrics, getFinancialMetrics, getExchangeMetrics, getUsersList |
| `packages/db/src/index.ts` | UPDATE | Exportar funções de admin.ts |
| `apps/web/src/app/api/webhooks/stripe/route.ts` | UPDATE | Extrair `session.amount_total` e passar `grossAmountCents` para `addCredits()` |
| `apps/web/src/app/api/admin/add-credits/route.ts` | CREATE | Endpoint POST para adição manual de créditos |
| `apps/web/src/app/admin/page.tsx` | REWRITE | Server Component com métricas reais via Promise.all |
| `apps/web/src/components/admin/AddCreditsForm.tsx` | CREATE | Client Component com form + dialog de confirmação |
| `apps/web/src/components/admin/MetricCard.tsx` | UPDATE | Ajustar para suportar variantes (destaque amber para financeiro) |
| `apps/web/src/components/admin/UsersTable.tsx` | UPDATE | Adaptar colunas: email, saldo R$, mensagens, data |

---

## Risks

| Risk | Mitigation |
|---|---|
| Raw query `SUM(cost_usd * exchange_rate)` — Prisma não suporta multiplicação em aggregate | Usar `prisma.$queryRaw` com cast explícito para FLOAT |
| Backfill de `grossAmountCents` usa CREDIT_PERCENTAGE fixo (0.40) | Aceitável — dados históricos com aproximação, futuras compras terão valor exato via Stripe |
| TypeScript complain na nova assinatura de `addCredits()` — callers existentes | Webhook é o único caller — atualizar na Subtask 3 junto com a refatoração |
| `router.refresh()` pode não revalidar dados do Server Component em todos os cenários | Alternativa: `revalidatePath('/admin')` via Server Action se necessário |
| Dialog de Shadcn pode não estar instalado | Verificar `components/ui/dialog.tsx` — se ausente, usar `alert()` como fallback temporário |

---

## Definition of Done

- [ ] Migration aplicada — `adjustment` no enum, `grossAmountCents` e `adminEmail` no schema
- [ ] Backfill populou `grossAmountCents` em purchases existentes
- [ ] `addCredits()` refatorado — purchase e adjustment funcionando
- [ ] Webhook Stripe registra `grossAmountCents` via `session.amount_total`
- [ ] `packages/db/src/admin.ts` criado com todas as funções de métricas
- [ ] `POST /api/admin/add-credits` implementado (403/404/400/200)
- [ ] Página `/admin` reescrita com dados reais via `Promise.all`
- [ ] Dialog de confirmação funcional com toast de sucesso/erro
- [ ] Paginação funcional (20/página)
- [ ] `pnpm typecheck` passa sem erros
- [ ] `pnpm build` passa sem warnings
- [ ] Nenhuma regressão em: chat, streaming SSE, webhook, autenticação, dashboard do aluno
- [ ] Receita calculada via `grossAmountCents` (verificar no Prisma Studio após compra de teste)
- [ ] Custo OpenAI via raw query por transação individual (não cotação média)
