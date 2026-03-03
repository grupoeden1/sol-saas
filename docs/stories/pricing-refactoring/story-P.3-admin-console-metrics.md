# Story P.3 — Atualizar Admin Console (Métricas)

**Epic:** 4 — Admin & Operações
**Story ID:** P.3
**Priority:** High
**Estimate:** 5 story points
**Status:** DONE
**Created by:** River (SM — story-development-cycle workflow)

---

## User Story

**As a** SOL administrator,
**I want** the admin console (/admin) to reflect the new credits model,
**so that** all metrics are consistent with the current pricing system.

---

## Context

Story P.1 migrou o sistema de centavos para créditos. O admin console (`/admin`, Story 4.2) ainda referencia o modelo anterior em várias métricas e na funcionalidade de adição manual de créditos. Esta story atualiza o console para consistência.

**Estado atual (baseline — pós Story P.1):**
- `User.credits` (Int): ✅ migrado de `balanceCents`
- Página `/admin` com métricas: ✅ existe — **métricas precisam atualizar**
- "Sem saldo útil" usa `balanceCents < MIN_COST_CENTS`: ✅ existe — **mudar para `credits = 0`**
- Lista de usuários mostra saldo em R$: ✅ existe — **mudar para créditos**
- Métricas financeiras usam `grossAmountCents`: ✅ existe — **mudar para JOIN com credit_packages**
- Custo OpenAI via `costUsd × exchangeRate`: ✅ existe — **mudar para estimativa via tokens**
- Seção "Métricas de Cotação": ✅ existe — **será removida**
- Adição manual em reais: ✅ existe — **mudar para créditos**
- Link para `/admin/pricing`: ❌ **será adicionado**

**O que NÃO muda:** métricas de uso (mensagens, tokens, modelo), paginação da tabela de usuários, middleware admin, auth.

---

## Acceptance Criteria

### AC1: Todas as métricas em créditos

- [ ] "Sem saldo útil" = `credits = 0` (era `balanceCents < MIN_COST_CENTS`)
- [ ] Lista de usuários: coluna "Saldo" mostra créditos inteiros (não R$)
- [ ] Saldo total retido: `SUM(credits)` de todos os usuários (em créditos)
- [ ] Cards de métricas de usuários atualizados para terminologia de créditos

**Test:** Usuário com `credits = 0` aparece na contagem "Sem saldo útil". Usuário com `credits = 1` não aparece. Lista exibe "47 créditos" (não "R$ 0,47").

---

### AC2: Métricas financeiras atualizadas

- [ ] Receita bruta: `SUM(priceInCents)` dos pacotes vendidos via JOIN `credit_transactions` (type=purchase) com `credit_packages` (usando metadata ou packageId)
- [ ] Custo OpenAI estimado: calculado via tokens consumidos × pricing da API OpenAI (input: $2.50/1M, output: $10.00/1M para GPT-4o) × cotação informada pelo admin
- [ ] Campo "Cotação USD/BRL" editável na UI para cálculos de custo (não salva no banco)
- [ ] Lucro bruto = Receita - Custo estimado
- [ ] Margem e markup calculados corretamente
- [ ] Créditos vendidos: `SUM(amount) WHERE type = purchase`
- [ ] Créditos consumidos: `SUM(ABS(amount)) WHERE type = consumption`
- [ ] Saldo retido: `SUM(credits)` de todos os usuários (em créditos)

**Test:** Receita reflete preço dos pacotes vendidos. Custo OpenAI é estimativa via tokens. Créditos vendidos vs consumidos exibidos.

---

### AC3: Adição manual em créditos

- [ ] Campo "Valor" aceita créditos inteiros (não reais)
- [ ] Label: "Créditos a adicionar" (não "Valor em R$")
- [ ] Confirmação: "Adicionar X créditos ao saldo de [email]?"
- [ ] `POST /api/admin/add-credits` recebe `credits` (inteiro, não `amountBRL`)
- [ ] CreditTransaction registrada com `type: adjustment`, `amount` em créditos, `adminEmail`, `description`
- [ ] Sem `exchangeRate` na transação de adjustment

**Test:** Informar email + 50 créditos + motivo → confirmar → saldo do usuário incrementa 50. CreditTransaction com `amount: 50`, `type: adjustment`.

---

### AC4: Seção de cotação substituída

- [ ] Seção "Métricas de Cotação" (cotação atual, min/max 30d) removida
- [ ] Substituída por: card com link "Gerenciar Precificação →" apontando para `/admin/pricing`
- [ ] Link visível e claro para o novo painel de pricing

**Test:** `/admin` não exibe cotação atual/min/max. Exibe card com link para `/admin/pricing`.

---

### AC5: Sem regressão em métricas de uso e tokens

- [ ] Métricas de uso (mensagens total/hoje/7d) inalteradas
- [ ] Tokens input/output separados inalterados
- [ ] Modelo mais usado inalterado
- [ ] Média de tokens/mensagem inalterada
- [ ] Mensagens com/sem anexo inalteradas
- [ ] Paginação da tabela de usuários funciona

**Test:** Todas as métricas de uso carregam corretamente. Paginação funciona.

---

## Scope

**IN:**
- Atualizar queries de métricas de usuários (`credits = 0` em vez de `balanceCents < MIN_COST_CENTS`)
- Atualizar queries de métricas financeiras (JOIN com `credit_packages`, estimativa de custo via tokens)
- Atualizar UI da lista de usuários (créditos em vez de R$)
- Atualizar formulário de adição manual (créditos em vez de reais)
- Atualizar API `/api/admin/add-credits` (créditos em vez de `amountBRL`)
- Remover seção de métricas de cotação
- Adicionar link para `/admin/pricing`
- Remover referências a `getExchangeRate`, `ExchangeRate`, `exchangeRate` no módulo admin

**OUT:**
- Criação do painel `/admin/pricing` (Story P.2)
- Novos gráficos ou charts
- Exportação CSV/PDF
- Filtros de período customizado
- Real-time/WebSockets

---

## Dependencies

| Dependency | Story | Status |
|---|---|---|
| `User.credits` migrado de `balanceCents` | P.1 | Blocked (prerequisite) |
| `addCredits()` refatorado para créditos | P.1 | Blocked (prerequisite) |
| Tabela `exchange_rates` removida | P.1 | Blocked (prerequisite) |
| Admin console existente (`/admin`) | 4.2 | Done |
| Página `/admin/pricing` para link | P.2 | Parallel (link pode apontar para rota inexistente temporariamente) |

**Blocks:** Nenhum.

---

## Subtasks

### Subtask 1 — Atualizar métricas de usuários

**Arquivo:** `packages/db/src/admin.ts`

**Mudanças:**

```typescript
// ANTES:
// lowBalanceUsers: prisma.user.count({ where: { balanceCents: { lt: MIN_COST_CENTS } } })
// DEPOIS:
usersWithoutCredits: await prisma.user.count({ where: { credits: { equals: 0 } } })
```

```typescript
// Lista de usuários — ANTES:
// select: { email, balanceCents, ... }
// DEPOIS:
select: {
  id: true,
  email: true,
  credits: true,  // era balanceCents
  createdAt: true,
  _count: { select: { conversations: true } },
}
```

```typescript
// Saldo total retido — ANTES:
// prisma.user.aggregate({ _sum: { balanceCents: true } })
// DEPOIS:
totalRetainedCredits: (await prisma.user.aggregate({ _sum: { credits: true } }))._sum.credits ?? 0
```

**Interfaces atualizadas:**
```typescript
export interface UserMetrics {
  totalUsers: number
  activeUsers7d: number
  usersWithoutCredits: number  // era lowBalanceUsers
  newUsers30d: number
}

export interface UserRow {
  id: string
  email: string
  credits: number  // era balanceCents
  totalMessages: number
  createdAt: Date
}
```

**Test:** `getUserMetrics()` retorna `usersWithoutCredits` correto (count where credits = 0). `getUsersPage()` retorna `credits` inteiro.

---

### Subtask 2 — Atualizar métricas financeiras

**Arquivo:** `packages/db/src/admin.ts`

**Mudanças:**

```typescript
// Receita bruta — ANTES:
// SUM(grossAmountCents) WHERE type = 'purchase'
// DEPOIS:
// JOIN credit_transactions (type=purchase) com credit_packages para obter priceInCents
const revenueResult = await prisma.$queryRaw<[{ total_revenue_cents: bigint }]>`
  SELECT COALESCE(SUM(cp.price_in_cents), 0) AS total_revenue_cents
  FROM credit_transactions ct
  JOIN credit_packages cp ON ct.amount = cp.credits
  WHERE ct.type = 'purchase'
`
// Nota: JOIN por amount = credits é aproximação. Alternativa: guardar packageId na transação
// Se packageId existir na metadata, usar isso em vez de JOIN por valor
```

```typescript
// Custo OpenAI — ANTES:
// SUM(cost_usd × exchange_rate) via raw query
// DEPOIS:
// Estimado via tokens consumidos × pricing da API OpenAI
const costResult = await prisma.$queryRaw<[{ estimated_cost_usd: number }]>`
  SELECT COALESCE(
    SUM(
      (COALESCE(input_tokens, 0)::float / 1000000.0 * 2.50) +
      (COALESCE(output_tokens, 0)::float / 1000000.0 * 10.00)
    ), 0
  ) AS estimated_cost_usd
  FROM credit_transactions
  WHERE type = 'consumption'
    AND input_tokens IS NOT NULL
`
// Pricing GPT-4o: input $2.50/1M, output $10.00/1M
// Admin informa cotação USD/BRL na UI para converter para R$
```

**Interface atualizada:**
```typescript
export interface FinancialMetrics {
  totalRevenueCents: number         // via JOIN com credit_packages
  revenue30dCents: number
  estimatedOpenAICostUsd: number    // estimado via tokens (era calculado por transação)
  creditsSold: number               // SUM(amount) WHERE purchase
  creditsConsumed: number           // SUM(ABS(amount)) WHERE consumption
  totalRetainedCredits: number      // SUM(credits) de users (era totalRetainedBalanceCents)
}
// grossProfitCents, grossMarginPercent, markupPercent calculados no frontend
// com cotação informada pelo admin
```

**Remover:**
- Referências a `grossAmountCents`
- Referências a `costUsd`, `exchangeRate` em queries financeiras
- Import de `getExchangeRate` ou `ExchangeRate`

**Test:** `getFinancialMetrics()` retorna receita via JOIN, custo estimado via tokens, créditos vendidos/consumidos corretos.

---

### Subtask 3 — Remover métricas de cotação

**Arquivos:**
- `packages/db/src/admin.ts` — remover `getExchangeMetrics()`
- `apps/web/src/app/admin/page.tsx` — remover seção de cotação

**Remover:**
```typescript
// packages/db/src/admin.ts
// REMOVER inteiramente:
export async function getExchangeMetrics(): Promise<ExchangeMetrics> { ... }
export interface ExchangeMetrics { ... }
```

**Substituir na página `/admin`:**
```typescript
// ANTES: seção de cotação com 3 MetricCards (atual, min, max)
// DEPOIS: card com link
<Card>
  <CardHeader>
    <CardTitle>Precificação</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-muted-foreground">
      Gerencie constantes de precificação, pacotes e simule cenários.
    </p>
    <Link href="/admin/pricing" className="...">
      Gerenciar Precificação →
    </Link>
  </CardContent>
</Card>
```

**Remover do `Promise.all` da página:**
```typescript
// ANTES:
const [userMetrics, usageMetrics, financialMetrics, exchangeMetrics, usersPage] = await Promise.all([...])
// DEPOIS:
const [userMetrics, usageMetrics, financialMetrics, usersPage] = await Promise.all([
  getUserMetrics(),
  getUsageMetrics(),
  getFinancialMetrics(),
  getUsersPage(page, 20),
])
// Sem getExchangeMetrics()
```

**Atualizar exports em `packages/db/src/index.ts`:**
- Remover export de `getExchangeMetrics` e `ExchangeMetrics`

**Test:** `/admin` não exibe cotação atual/min/max. Exibe card com link para `/admin/pricing`. Sem erros de import.

---

### Subtask 4 — Atualizar adição manual de créditos

**Arquivo:** `apps/web/src/app/api/admin/add-credits/route.ts`

**Schema Zod atualizado:**
```typescript
// ANTES:
const schema = z.object({
  userEmail: z.string().email(),
  amountBRL: z.number().positive(),
  reason: z.string().min(3).max(200),
})

// DEPOIS:
const schema = z.object({
  userEmail: z.string().email(),
  credits: z.number().int().positive(),  // créditos inteiros, não reais
  reason: z.string().min(3).max(200),
})
```

**Lógica atualizada:**
```typescript
// ANTES:
const amountCents = Math.round(amountBRL * 100)
const exchangeRate = await getExchangeRate('USD-BRL')
const { balanceCents } = await addCredits(user.id, amountCents, {
  type: 'adjustment', exchangeRate, adminEmail, description
})

// DEPOIS:
const { credits: newCredits } = await addCredits(user.id, parsed.data.credits, {
  type: 'adjustment',
  adminEmail: session.user.email!,
  description: `Ajuste manual por ${session.user.email}: ${parsed.data.reason}`,
})

return NextResponse.json({
  success: true,
  userEmail: parsed.data.userEmail,
  addedCredits: parsed.data.credits,
  newCredits,
})
```

**Arquivo:** `apps/web/src/components/admin/AddCreditsForm.tsx`

**Mudanças na UI:**
```typescript
// ANTES:
// Label: "Valor em R$"
// Input type number com step 0.01
// Confirmação: "Adicionar R$ X,XX ao saldo de [email]?"

// DEPOIS:
// Label: "Créditos a adicionar"
// Input type number com step 1 (inteiro)
// Confirmação: "Adicionar X créditos ao saldo de [email]?"
```

```typescript
// ANTES:
body: JSON.stringify({ userEmail, amountBRL: parseFloat(form.amount), reason })

// DEPOIS:
body: JSON.stringify({ userEmail: form.userEmail, credits: parseInt(form.credits), reason: form.reason })
```

```typescript
// Toast ANTES: "R$ X,XX adicionados ao saldo de email"
// Toast DEPOIS: "X créditos adicionados ao saldo de email"
```

**Remover:**
- Import de `getExchangeRate`
- Qualquer referência a `amountBRL`, `amountCents`, `exchangeRate` no fluxo de adjustment

**Test:** Informar email + 50 créditos + motivo → confirmar → toast "50 créditos adicionados ao saldo de user@test.com". CreditTransaction com `amount: 50`, `type: adjustment`, `adminEmail`, sem `exchangeRate`.

---

### Subtask 5 — Testes

**Testes de métricas:**
- `getUserMetrics()` retorna `usersWithoutCredits` correto
- `getUsersPage()` retorna `credits` (não `balanceCents`)
- `getFinancialMetrics()` retorna receita via JOIN, custo estimado via tokens
- `getExchangeMetrics` não existe mais (removido)

**Testes de adição manual:**
- `POST /api/admin/add-credits` aceita `credits` (inteiro)
- `POST /api/admin/add-credits` rejeita `amountBRL` (campo antigo → 400)
- CreditTransaction criada sem `exchangeRate`
- Saldo incrementa corretamente

**Testes de não-regressão:**
- Métricas de uso (mensagens, tokens, modelo) inalteradas
- Paginação da tabela funciona
- Auth e middleware admin funcionam
- Chat e streaming inalterados

**Quality gates:**
- `pnpm typecheck` passa
- `pnpm build` passa
- Zero referências a `balanceCents`, `getExchangeRate`, `ExchangeMetrics`, `MIN_COST_CENTS` em `packages/db/src/admin.ts` e `apps/web/src/app/admin/`

---

## File List

| File | Action | Description |
|---|---|---|
| `packages/db/src/admin.ts` | UPDATE | Atualizar queries: credits=0, JOIN com credit_packages, estimativa de custo via tokens, remover getExchangeMetrics |
| `packages/db/src/index.ts` | UPDATE | Remover export de getExchangeMetrics e ExchangeMetrics |
| `apps/web/src/app/admin/page.tsx` | UPDATE | Remover seção cotação, adicionar link /admin/pricing, atualizar terminologia para créditos |
| `apps/web/src/app/api/admin/add-credits/route.ts` | UPDATE | Mudar de amountBRL para credits (inteiro), remover getExchangeRate |
| `apps/web/src/components/admin/AddCreditsForm.tsx` | UPDATE | Label "Créditos a adicionar", input inteiro, toast em créditos |
| `apps/web/src/components/admin/MetricCard.tsx` | UPDATE | Ajustar labels de créditos (se necessário) |
| `apps/web/src/components/admin/UsersTable.tsx` | UPDATE | Coluna "Saldo" em créditos (não R$) |

---

## Risks

| Risk | Mitigation |
|---|---|
| JOIN `credit_transactions` com `credit_packages` por `amount = credits` pode ser impreciso se pacotes mudam | Alternativa: guardar `packageId` na CreditTransaction em Story P.1. Se não disponível, JOIN por valor é aproximação aceitável para MVP |
| Custo OpenAI estimado via tokens pode divergir do custo real (preços da API mudam) | Usar constantes de pricing da API como configuração hardcoded. Atualizar quando API pricing mudar |
| Cotação manual na UI pode confundir admin | Label claro: "Informe a cotação atual do dólar para cálculos de custo" |
| Remoção de `getExchangeMetrics` pode quebrar imports | Verificar todos os consumidores do export antes de remover |

---

## Definition of Done

- [ ] "Sem saldo útil" = `credits = 0` implementado
- [ ] Lista de usuários mostra créditos (não R$)
- [ ] Receita calculada via JOIN com `credit_packages`
- [ ] Custo OpenAI estimado via tokens × pricing
- [ ] Seção de cotação removida e substituída por link ao `/admin/pricing`
- [ ] Adição manual aceita créditos inteiros
- [ ] `POST /api/admin/add-credits` atualizado para créditos
- [ ] Zero referências ao modelo anterior no módulo admin
- [ ] `pnpm typecheck` passa
- [ ] `pnpm build` passa
- [ ] Sem regressão em: métricas de uso, paginação, auth, chat
