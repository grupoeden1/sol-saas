# Story P.1 — Migration e Refatoração do Core de Créditos

**Epic:** Pricing Refactoring (cross-cutting: Epics 2, 3, 4)
**Story ID:** P.1
**Priority:** Critical
**Estimate:** 21 story points
**Status:** Draft
**Created by:** River (SM — story-development-cycle workflow)

---

## User Story

**As a** developer,
**I want** the schema and credit logic migrated to the new model (credits per tokens),
**so that** the entire system uses the new pricing without any reference to the old model.

---

## Context

O modelo anterior de precificação (centavos de real, câmbio diário via AwesomeAPI, `CREDIT_PERCENTAGE`, `MIN_COST_CENTS`, `grossAmountCents`, `costUsd`, `exchangeRate` por transação) está sendo substituído por um modelo simplificado de créditos por tokens. Esta story é a fundação de toda a refatoração — toca schema, backend e frontend.

**Estado atual (baseline):**
- `User.balanceCents` (Int): ✅ existe — **será renomeado para `credits`**
- `CreditTransaction.exchangeRate`, `costUsd`, `grossAmountCents`: ✅ existem — **serão removidos**
- Tabela `exchange_rates`: ✅ existe — **será removida**
- `lib/exchange-rate.ts` com `getExchangeRate()`, `updateExchangeRate()`: ✅ existe — **será removido**
- `CREDIT_PERCENTAGE`, `MIN_COST_CENTS` em .env: ✅ existem — **serão removidos**
- Tabela `pricing_config`: ❌ **será criada nesta story**
- Tabela `credit_packages`: ❌ **será criada nesta story**
- `lib/pricing.ts` com `getPricingConfig()`, `calculateCredits()`, `calculateMaxCredits()`: ❌ **será criado nesta story**
- Gate em créditos (não centavos): ❌ **será implementado nesta story**
- Snapshot de config em CreditTransaction: ❌ **será implementado nesta story**

**O que NÃO muda:** autenticação, sistema de conversas/mensagens, streaming SSE, admin middleware (Story 4.1), layout shell, dark theme.

---

## Acceptance Criteria

### AC1: User.credits substitui balanceCents

- [ ] Campo `User.credits` (Int, default 0) existe e substitui `balanceCents` em todo o sistema
- [ ] Migration converte saldos existentes (discutir lógica de conversão com PO antes de produção)
- [ ] Nenhuma referência a `balanceCents` no código (exceto na migration)

**Test:** Query `SELECT credits FROM users` retorna valores inteiros. Nenhum campo `balance_cents` na tabela.

---

### AC2: Fórmula de créditos implementada corretamente

- [ ] `creditsUsed = Math.max(1, Math.ceil((inputTokens/1_000_000 × CREDITS_PER_M_INPUT) + (outputTokens/1_000_000 × CREDITS_PER_M_OUTPUT)))`
- [ ] Mínimo 1 crédito por mensagem
- [ ] Valores inteiros sempre (ceil)

**Test:** 1000 tokens input + 500 tokens output com defaults (500/2000) → `max(1, ceil(0.001×500 + 0.0005×2000))` = `max(1, ceil(0.5 + 1.0))` = 2 créditos.

---

### AC3: Gate verifica créditos máximos estimados

- [ ] `maxCredits = Math.max(1, Math.ceil((inputTokens/1_000_000 × CREDITS_PER_M_INPUT) + (MAX_OUTPUT_TOKENS/1_000_000 × CREDITS_PER_M_OUTPUT)))`
- [ ] Se `user.credits < maxCredits` → 402 Payment Required
- [ ] Gate usa `MAX_OUTPUT_TOKENS` do banco (não hardcoded)

**Test:** Usuário com 5 créditos, gate calcula maxCredits = 17 → 402. Usuário com 20 créditos → passa.

---

### AC4: Dedução real após streaming

- [ ] Após streaming completar, calcula créditos reais (sempre ≤ estimado)
- [ ] Deduz via `deductCredits(userId, creditsUsed, metadata)` em transação atômica
- [ ] Se OpenAI falhar, nenhum crédito deduzido

**Test:** Gate estima 17 créditos, stream consome 3 → deduz 3 (não 17). Saldo correto.

---

### AC5: Webhook credita créditos do pacote

- [ ] Evento `checkout.session.completed` identifica pacote via metadata
- [ ] `addCredits(userId, package.credits, { type: 'purchase', stripePaymentId })`
- [ ] Sem conversão cambial, sem porcentagem
- [ ] Idempotência mantida via `stripePaymentId` UNIQUE

**Test:** Compra do pacote Pro (500 créditos) → saldo incrementa exatamente 500.

---

### AC6: Pacotes carregados do banco

- [ ] Página `/credits` lista pacotes ativos da tabela `credit_packages`
- [ ] `POST /api/payments/checkout` busca pacote ativo pelo `packageId` → 404 se não encontrado ou inativo
- [ ] Metadata da sessão Stripe inclui `packageId` e `credits`

**Test:** Desativar pacote via Prisma Studio → não aparece em `/credits`. Reativar → aparece.

---

### AC7: Config de pricing no banco

- [ ] Tabela `pricing_config` com seeds: CREDITS_PER_M_INPUT=500, CREDITS_PER_M_OUTPUT=2000, MAX_OUTPUT_TOKENS=8192
- [ ] `getPricingConfig()` busca do banco com cache 60s em memória
- [ ] Não são variáveis de ambiente

**Test:** Alterar valor via Prisma Studio → após 60s, próxima mensagem usa novo valor.

---

### AC8: Snapshot de config em cada CreditTransaction

- [ ] Campo `creditsPerMInput` (Int?) em CreditTransaction — preenchido em `consumption`
- [ ] Campo `creditsPerMOutput` (Int?) em CreditTransaction — preenchido em `consumption`
- [ ] Permite auditoria retroativa mesmo após mudanças de config

**Test:** Enviar mensagem → CreditTransaction tem `creditsPerMInput: 500`, `creditsPerMOutput: 2000`.

---

### AC9: Tabela exchange_rates removida

- [ ] Tabela `exchange_rates` removida do schema Prisma
- [ ] Migration drop table aplicada
- [ ] Nenhuma referência a `ExchangeRate` no código

**Test:** `SELECT * FROM exchange_rates` retorna erro (tabela não existe).

---

### AC10: Nenhuma referência ao modelo anterior

- [ ] Nenhuma referência a `balanceCents`, `exchangeRate` (como campo de transação), `costUsd`, `grossAmountCents`, `MIN_COST_CENTS`, `CREDIT_PERCENTAGE`, `FALLBACK_USD_BRL_RATE`, `getExchangeRate`, `updateExchangeRate`, `AwesomeAPI` no código novo
- [ ] Referências históricas em Change Log dos docs são aceitáveis

**Test:** `grep -r "balanceCents\|CREDIT_PERCENTAGE\|MIN_COST_CENTS\|getExchangeRate\|AwesomeAPI" apps/ packages/ --include="*.ts" --include="*.tsx"` retorna zero resultados.

---

### AC11: Sem regressão

- [ ] Auth (login, register, logout) funciona
- [ ] Chat streaming SSE funciona
- [ ] Anexos de arquivos no chat funcionam
- [ ] Admin console (`/admin`) carrega sem erros
- [ ] `pnpm typecheck` passa
- [ ] `pnpm build` passa

**Test:** Executar todos os cenários manualmente e confirmar.

---

## Scope

**IN:**
- Migration Prisma: `pricing_config`, `credit_packages`, `User.credits`, `CreditTransaction` (novos campos, remoção de campos antigos), drop `exchange_rates`
- Novo arquivo `apps/web/src/lib/pricing.ts` com `getPricingConfig()`, `calculateCredits()`, `calculateMaxCredits()`
- Refatoração de `apps/web/src/lib/credits.ts` (`deductCredits` e `addCredits` operam em créditos)
- Remoção de `apps/web/src/lib/exchange-rate.ts`
- Atualização de `POST /api/chat` (gate + dedução em créditos, headers X-Credits-Remaining e X-Credits-Used)
- Atualização de `POST /api/webhooks/stripe` (créditos do pacote, sem conversão)
- Atualização de `POST /api/payments/checkout` (pacotes do banco)
- Atualização do frontend (badge, `/credits`, X-Credits-Remaining, X-Credits-Used)

**OUT:**
- Painel admin de precificação (Story P.2)
- Atualização de métricas do admin console (Story P.3)
- Novos testes de admin metrics (Story P.3)
- Simulador de precificação (Story P.2)

---

## Dependencies

| Dependency | Story | Status |
|---|---|---|
| Schema `User` com `balanceCents` | 1.2 | Done |
| Schema `CreditTransaction` com campos de auditoria | 3.1 + 3.6 | Done |
| Schema `ExchangeRate` | 3.1 + 3.6 | Done (será removido) |
| `deductCredits()` e `addCredits()` atuais | 3.1 + 3.6 | Done (serão refatorados) |
| Chat API com gate e dedução | 3.2 + 3.6 | Done (será refatorado) |
| Webhook Stripe | 3.4 + 3.6 | Done (será refatorado) |
| Checkout Stripe | 3.3 | Done (será refatorado) |
| Chat com anexos | 2.5 | Done (tokens de anexo serão incluídos) |

**Blocks:** Story P.2 (Pricing Admin), Story P.3 (Admin Console Metrics)

---

## Subtasks

### Subtask 1 — Migration Prisma

**Arquivos:** `packages/db/prisma/schema.prisma`, nova migration

**Mudanças no schema:**

```prisma
// NOVO — tabela de constantes de precificação
model PricingConfig {
  id        String   @id @default(cuid())
  key       String   @unique  // "CREDITS_PER_M_INPUT", "CREDITS_PER_M_OUTPUT", "MAX_OUTPUT_TOKENS"
  value     Int
  updatedAt DateTime @updatedAt
  updatedBy String              // email do admin que alterou
}

// NOVO — pacotes de créditos para compra
model CreditPackage {
  id           String   @id @default(cuid())
  name         String              // "Starter", "Pro", "Max"
  credits      Int                  // créditos concedidos
  priceInCents Int                  // preço em centavos BRL
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model User {
  // ...
  credits  Int  @default(0)   // RENOMEADO de balanceCents → créditos inteiros
  // remover balanceCents
}

model CreditTransaction {
  // ... campos existentes mantidos ...
  creditsPerMInput  Int?   // NOVO — snapshot da config
  creditsPerMOutput Int?   // NOVO — snapshot da config
  // REMOVER: exchangeRate, costUsd, grossAmountCents, maxOutputTokens
  // amount agora representa créditos (não centavos)
}

// REMOVER model ExchangeRate inteiro
```

**Passos:**
1. Editar `schema.prisma` com todas as mudanças
2. Criar migration: `npx prisma migrate dev --name pricing_credits_refactoring`
3. Migration SQL deve incluir:
   - `ALTER TABLE users RENAME COLUMN balance_cents TO credits`
   - Drop columns de CreditTransaction: `exchange_rate`, `cost_usd`, `gross_amount_cents`, `max_output_tokens`
   - Add columns: `credits_per_m_input Int?`, `credits_per_m_output Int?`
   - Create tables: `pricing_config`, `credit_packages`
   - Drop table: `exchange_rates`
4. Seed script para pricing_config e credit_packages

**Seed data:**
```typescript
// pricing_config
await prisma.pricingConfig.createMany({
  data: [
    { key: 'CREDITS_PER_M_INPUT', value: 500, updatedBy: 'system@sol.com' },
    { key: 'CREDITS_PER_M_OUTPUT', value: 2000, updatedBy: 'system@sol.com' },
    { key: 'MAX_OUTPUT_TOKENS', value: 8192, updatedBy: 'system@sol.com' },
  ],
})

// credit_packages
await prisma.creditPackage.createMany({
  data: [
    { name: 'Starter', credits: 100, priceInCents: 2990 },
    { name: 'Pro', credits: 500, priceInCents: 9990 },
    { name: 'Max', credits: 1200, priceInCents: 19990 },
  ],
})
```

**Nota sobre conversão de saldos existentes:** Se já existem usuários com `balanceCents`, a migration renomeia a coluna. Os valores antigos (centavos) precisam ser convertidos para créditos. Lógica sugerida: `credits = Math.floor(balanceCents / (preço_médio_centavos_por_crédito))` ou definir manualmente. **Discutir com PO antes de rodar em produção.**

**Test:** `npx prisma migrate deploy` sem erros. `npx prisma studio` mostra novas tabelas com seeds. Tabela `exchange_rates` não existe.

---

### Subtask 2 — Criar lib/pricing.ts

**Arquivo:** `apps/web/src/lib/pricing.ts` (NOVO)

```typescript
import { prisma } from '@sol/db'

export interface PricingConfig {
  creditsPerMInput: number
  creditsPerMOutput: number
  maxOutputTokens: number
}

// Cache em memória com TTL de 60 segundos
let cachedConfig: PricingConfig | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 60_000

export async function getPricingConfig(): Promise<PricingConfig> {
  const now = Date.now()
  if (cachedConfig && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedConfig
  }

  const rows = await prisma.pricingConfig.findMany()
  const configMap = Object.fromEntries(rows.map(r => [r.key, r.value]))

  cachedConfig = {
    creditsPerMInput: configMap['CREDITS_PER_M_INPUT'] ?? 500,
    creditsPerMOutput: configMap['CREDITS_PER_M_OUTPUT'] ?? 2000,
    maxOutputTokens: configMap['MAX_OUTPUT_TOKENS'] ?? 8192,
  }
  cacheTimestamp = now

  return cachedConfig
}

export function invalidatePricingConfigCache(): void {
  cachedConfig = null
  cacheTimestamp = 0
}

export function calculateCredits(
  inputTokens: number,
  outputTokens: number,
  config: PricingConfig,
): number {
  return Math.max(
    1,
    Math.ceil(
      (inputTokens / 1_000_000) * config.creditsPerMInput +
      (outputTokens / 1_000_000) * config.creditsPerMOutput
    ),
  )
}

export function calculateMaxCredits(
  inputTokens: number,
  config: PricingConfig,
): number {
  return Math.max(
    1,
    Math.ceil(
      (inputTokens / 1_000_000) * config.creditsPerMInput +
      (config.maxOutputTokens / 1_000_000) * config.creditsPerMOutput
    ),
  )
}
```

**Test:**
- `calculateCredits(1000, 500, { creditsPerMInput: 500, creditsPerMOutput: 2000, maxOutputTokens: 8192 })` → 2
- `calculateCredits(0, 0, ...)` → 1 (mínimo)
- `calculateMaxCredits(1000, ...)` → `max(1, ceil(0.001×500 + 0.008192×2000))` = `max(1, ceil(0.5 + 16.384))` = 17
- `getPricingConfig()` retorna dados do banco. Segunda chamada em <60s retorna cache. Após `invalidatePricingConfigCache()`, busca do banco novamente.

---

### Subtask 3 — Refatorar lib/credits.ts

**Arquivo:** `apps/web/src/lib/credits.ts` (ou `packages/db/src/credits.ts`)

**deductCredits — nova assinatura:**
```typescript
export async function deductCredits(
  userId: string,
  credits: number,
  metadata: {
    inputTokens: number
    outputTokens: number
    modelUsed: string
    creditsPerMInput: number    // snapshot da config
    creditsPerMOutput: number   // snapshot da config
    conversationTitle?: string
    hasAttachments?: boolean
    attachmentTypes?: string[]
    attachmentTokens?: number
    pipelineType?: PipelineType
    assemblyAiCostUsd?: number
    elevenLabsCostUsd?: number
    videoDurationSeconds?: number
  },
): Promise<{ credits: number }> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: userId, credits: { gte: credits } },
      data: { credits: { decrement: credits } },
    })
    if (updated.count === 0) throw new InsufficientCreditsError()

    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -credits,
        type: 'consumption',
        description: metadata.conversationTitle
          ? `Consumo: ${metadata.conversationTitle}`
          : 'Consumo de créditos',
        inputTokens: metadata.inputTokens,
        outputTokens: metadata.outputTokens,
        modelUsed: metadata.modelUsed,
        creditsPerMInput: metadata.creditsPerMInput,
        creditsPerMOutput: metadata.creditsPerMOutput,
        hasAttachments: metadata.hasAttachments ?? false,
        attachmentTypes: metadata.attachmentTypes ?? [],
        attachmentTokens: metadata.attachmentTokens,
        pipelineType: metadata.pipelineType,
        assemblyAiCostUsd: metadata.assemblyAiCostUsd,
        elevenLabsCostUsd: metadata.elevenLabsCostUsd,
        videoDurationSeconds: metadata.videoDurationSeconds,
      },
    })

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })
    return { credits: user.credits }
  })
}
```

**addCredits — nova assinatura:**
```typescript
export type AddCreditsOptions =
  | { type: 'purchase'; stripePaymentId: string }
  | { type: 'adjustment'; adminEmail: string; description: string }

export async function addCredits(
  userId: string,
  credits: number,
  options: AddCreditsOptions,
): Promise<{ credits: number }> {
  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: credits } },
    })

    await tx.creditTransaction.create({
      data: {
        userId,
        amount: credits,
        type: options.type,
        description: options.type === 'purchase'
          ? 'Compra de créditos via Stripe'
          : options.description,
        stripePaymentId: options.type === 'purchase' ? options.stripePaymentId : null,
        adminEmail: options.type === 'adjustment' ? options.adminEmail : null,
      },
    })

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })
    return { credits: user.credits }
  })
}
```

**Mudanças-chave:**
- Opera em créditos (inteiros), não centavos
- `deductCredits` registra snapshot de config (`creditsPerMInput`, `creditsPerMOutput`)
- `addCredits` simplificado — sem `exchangeRate`, sem `grossAmountCents`
- Transação atômica Prisma mantida em ambos
- `deductCredits` usa `updateMany` com `WHERE credits >= ${credits}` para atomicidade

**Test:**
- Dedução de 5 créditos com saldo 10 → saldo 5, CreditTransaction com `amount: -5`, snapshot de config
- Dedução de 5 créditos com saldo 3 → lança `InsufficientCreditsError`
- Adição purchase: incrementa créditos, registra `stripePaymentId`
- Adição adjustment: incrementa créditos, registra `adminEmail` e `description`
- Segundo purchase com mesmo `stripePaymentId` → lança P2002 (unique constraint)

---

### Subtask 4 — Remover código de cotação

**Arquivos a remover:**
- `apps/web/src/lib/exchange-rate.ts` (ou equivalente)

**Referências a remover:**
- Imports e chamadas de `getExchangeRate()`, `updateExchangeRate()`
- Referências a `AwesomeAPI`
- `FALLBACK_USD_BRL_RATE` e `CREDIT_PERCENTAGE` do código e `.env.example`
- Qualquer lógica de câmbio em routes, lib ou componentes

**Atualizar `.env.example`:**
- Remover: `CREDIT_PERCENTAGE`, `FALLBACK_USD_BRL_RATE`, `MIN_COST_CENTS`
- Manter: `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXTAUTH_SECRET`, `DATABASE_URL`
- Adicionar nota: `# Pricing config (CREDITS_PER_M_INPUT, etc.) is stored in the database, not in .env`

**Test:** `grep -r "getExchangeRate\|updateExchangeRate\|AwesomeAPI\|FALLBACK_USD_BRL\|CREDIT_PERCENTAGE\|MIN_COST_CENTS" apps/ packages/ --include="*.ts" --include="*.tsx"` retorna zero resultados.

---

### Subtask 5 — Atualizar POST /api/chat

**Arquivo:** `apps/web/src/app/api/chat/route.ts`

**Mudanças:**

```
POST /api/chat
  ├─ auth check
  ├─ parse request (JSON ou multipart/form-data)
  ├─ [se anexos] validar e processar arquivos
  ├─ contar totalInputTokens via tiktoken
  ├─ const config = await getPricingConfig()                      ← NOVO
  ├─ const maxCredits = calculateMaxCredits(totalInputTokens, config) ← NOVO
  ├─ user.credits < maxCredits → 402                              ← ALTERADO (era balanceCents)
  ├─ stream OpenAI com max_tokens: config.maxOutputTokens         ← ALTERADO (usa config)
  │   ├─ success:
  │   │   ├─ save assistant message
  │   │   ├─ const creditsUsed = calculateCredits(inputTokens, outputTokens, config) ← NOVO
  │   │   ├─ deductCredits(userId, creditsUsed, {                 ← ALTERADO
  │   │   │     inputTokens, outputTokens, modelUsed,
  │   │   │     creditsPerMInput: config.creditsPerMInput,        ← NOVO snapshot
  │   │   │     creditsPerMOutput: config.creditsPerMOutput,      ← NOVO snapshot
  │   │   │     conversationTitle, hasAttachments, attachmentTypes, attachmentTokens
  │   │   │   })
  │   │   └─ send { done: true, conversationId, creditsRemaining }
  │   └─ error:
  │       ├─ send { error: message }
  │       └─ NO deduction
  └─ headers:
      ├─ X-Credits-Remaining: user.credits (pós-dedução)          ← RENOMEADO
      └─ X-Credits-Used: creditsUsed                               ← NOVO
```

**Remover:**
- Import de `getExchangeRate`, `estimateMaxCost`, `calculateRealCost`
- Referência a `balanceCents`, `costCents`, `MIN_COST_CENTS`
- Header `X-Balance-Remaining` e `X-Balance-Cents`

**Test:** Enviar mensagem com 50 créditos. Gate calcula maxCredits=17, stream consome 3 créditos. Header `X-Credits-Remaining: 47`, `X-Credits-Used: 3`. CreditTransaction com snapshot de config.

---

### Subtask 6 — Atualizar POST /api/webhooks/stripe

**Arquivo:** `apps/web/src/app/api/webhooks/stripe/route.ts`

**Antes (simplificado):**
```typescript
const exchangeRate = await getExchangeRate('USD-BRL')
const amountCents = Math.round(credits * parseFloat(CREDIT_PERCENTAGE))
await addCredits(userId, amountCents, stripePaymentId, exchangeRate)
```

**Depois:**
```typescript
// Extrair packageId e credits do metadata da sessão Stripe
const packageId = session.metadata?.packageId
const packageCredits = Number(session.metadata?.credits)

if (!packageId || !packageCredits) {
  console.error('[Webhook] Missing package metadata', { sessionId: session.id })
  return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
}

await addCredits(userId, packageCredits, {
  type: 'purchase',
  stripePaymentId: session.payment_intent as string,
})
```

**Remover:**
- Import de `getExchangeRate`
- Cálculo de `amountCents` via `CREDIT_PERCENTAGE`
- `grossAmountCents` e `exchangeRate` na chamada de `addCredits`

**Test:** Simular evento `checkout.session.completed` com metadata `{ packageId: "xxx", credits: "500" }`. CreditTransaction criada com `type: purchase`, `amount: 500`. Idempotência mantida.

---

### Subtask 7 — Atualizar POST /api/payments/checkout

**Arquivo:** `apps/web/src/app/api/payments/checkout/route.ts`

**Mudança:** Buscar pacotes do banco em vez de hardcoded.

```typescript
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { packageId } = await req.json()

  // Buscar pacote ativo do banco
  const pkg = await prisma.creditPackage.findFirst({
    where: { id: packageId, active: true },
  })
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

  // Criar sessão Stripe com dados do pacote
  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],  // PIX configurado via Stripe Dashboard
    line_items: [{
      price_data: {
        currency: 'brl',
        product_data: { name: `SOL — ${pkg.name}` },
        unit_amount: pkg.priceInCents,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits`,
    metadata: {
      userId: session.user.id,
      packageId: pkg.id,
      credits: String(pkg.credits),  // para o webhook
    },
  })

  return NextResponse.json({ sessionUrl: checkoutSession.url })
}
```

**Test:** Requisitar checkout com `packageId` válido → sessão Stripe criada com `priceInCents` do banco e metadata correta. `packageId` inválido ou inativo → 404.

---

### Subtask 8 — Atualizar frontend (badge e exibição)

**Arquivos:**
- `apps/web/src/components/` (badge de créditos no header)
- `apps/web/src/app/chat/page.tsx` (ler X-Credits-Remaining e X-Credits-Used)
- `apps/web/src/app/credits/page.tsx` (pacotes do banco)
- Context de créditos (se existir)

**Mudanças:**

1. **Badge no header:** Exibe `user.credits` (inteiro) em vez de formatação em R$
2. **Após mensagem no chat:**
   - Ler header `X-Credits-Remaining` → atualizar badge
   - Ler header `X-Credits-Used` → mostrar "Gastou X crédito(s)" temporariamente
   - Ler `creditsRemaining` do evento SSE `done` para valor final
3. **Página `/credits`:**
   - Buscar pacotes ativos da API ou Server Component (tabela `credit_packages`)
   - Exibir: nome, créditos, preço em R$
   - Botão de compra com `packageId`
4. **Remover:** Referências a `balanceCents`, formatação em R$ do saldo, `X-Balance-Remaining`

**Test:** Badge mostra "47 créditos" (não "R$ 0,47"). Após mensagem, badge atualiza e exibe "Gastou 3 créditos". Página `/credits` lista 3 pacotes do banco.

---

### Subtask 9 — Testes

**Testes de unidade:**
- `calculateCredits()` com diversos volumes de tokens (verificar mínimo 1)
- `calculateMaxCredits()` com diversos inputs
- `getPricingConfig()` com cache e invalidação
- `deductCredits()` com snapshot de config
- `addCredits()` nos dois modos (purchase e adjustment)

**Testes de integração:**
- Gate bloqueia (402) quando créditos insuficientes para custo máximo
- Dedução real é sempre ≤ estimada
- Créditos nunca ficam negativos
- Webhook credita créditos exatos do pacote
- Checkout usa pacotes do banco
- Chat com anexos inclui tokens de anexos no cálculo de créditos
- Headers `X-Credits-Remaining` e `X-Credits-Used` corretos

**Testes de limpeza:**
- Zero referências a: `balanceCents`, `exchangeRate` (como campo), `costUsd`, `grossAmountCents`, `MIN_COST_CENTS`, `CREDIT_PERCENTAGE`, `getExchangeRate`, `AwesomeAPI` em `apps/` e `packages/` (excluindo migrations e docs)

**Quality gates:**
- `pnpm typecheck` passa sem erros
- `pnpm build` passa sem erros

---

## File List

| File | Action | Description |
|---|---|---|
| `packages/db/prisma/schema.prisma` | UPDATE | Adicionar PricingConfig, CreditPackage, renomear balanceCents→credits, alterar CreditTransaction, remover ExchangeRate |
| `packages/db/prisma/migrations/TIMESTAMP_pricing_credits_refactoring/migration.sql` | CREATE | Migration completa |
| `packages/db/prisma/seed.ts` | UPDATE | Seeds para pricing_config e credit_packages |
| `apps/web/src/lib/pricing.ts` | CREATE | getPricingConfig, calculateCredits, calculateMaxCredits |
| `apps/web/src/lib/credits.ts` | UPDATE | Refatorar deductCredits e addCredits para créditos |
| `apps/web/src/lib/exchange-rate.ts` | DELETE | Remover código de cotação |
| `apps/web/src/app/api/chat/route.ts` | UPDATE | Gate em créditos, dedução real, headers X-Credits-Remaining/Used |
| `apps/web/src/app/api/webhooks/stripe/route.ts` | UPDATE | Créditos do pacote via metadata, sem conversão |
| `apps/web/src/app/api/payments/checkout/route.ts` | UPDATE | Buscar pacotes do banco |
| `apps/web/src/app/credits/page.tsx` | UPDATE | Pacotes do banco, exibição em créditos |
| `apps/web/src/app/chat/page.tsx` | UPDATE | Ler X-Credits-Remaining e X-Credits-Used |
| `apps/web/src/components/` (badge, context) | UPDATE | Badge em créditos, remover formatação R$ |
| `.env.example` | UPDATE | Remover variáveis obsoletas, adicionar nota sobre pricing_config |

---

## Risks

| Risk | Mitigation |
|---|---|
| Conversão de saldos existentes (balanceCents → credits) pode perder precisão | Discutir lógica de conversão com PO. Backup do banco antes da migration em produção |
| Drop de tabela `exchange_rates` é irreversível | Backup completo antes. Só rodar em produção após validação em staging |
| Cache de 60s do pricing config pode causar inconsistência temporária | Aceitável para MVP. Admin é avisado que mudanças levam até 60s para refletir |
| Remoção de `grossAmountCents` perde dados de auditoria histórica | Migrations preservam dados existentes como backup. Alternativa: tornar nullable e deprecated em vez de remover |
| Múltiplos arquivos alterados simultaneamente aumenta risco de regressão | Subtasks ordenadas por dependência. Cada subtask testável isoladamente |

---

## Definition of Done

- [ ] Migration Prisma aplicada: `pricing_config`, `credit_packages`, `User.credits`, `CreditTransaction` atualizado, `exchange_rates` removido
- [ ] Seeds populados: 3 constantes + 3 pacotes
- [ ] `lib/pricing.ts` criado com cache e funções de cálculo
- [ ] `lib/credits.ts` refatorado para créditos
- [ ] `lib/exchange-rate.ts` removido
- [ ] `POST /api/chat` usa gate e dedução em créditos com snapshot de config
- [ ] `POST /api/webhooks/stripe` credita créditos do pacote sem conversão
- [ ] `POST /api/payments/checkout` usa pacotes do banco
- [ ] Frontend exibe créditos (não R$) em badge, chat e `/credits`
- [ ] Headers `X-Credits-Remaining` e `X-Credits-Used` funcionando
- [ ] Zero referências ao modelo anterior no código
- [ ] `pnpm typecheck` passa
- [ ] `pnpm build` passa
- [ ] Sem regressão em: auth, chat, streaming, anexos, admin
