# Story 3.6 — Refatoração do Sistema de Precificação

**Epic:** 3 — Créditos & Pagamentos
**Story ID:** 3.6
**Priority:** Critical
**Estimate:** 13 story points
**Status:** Done

---

## User Story

**As a** product owner,
**I want** the credit system to use a pre-call gate that estimates maximum cost (input + 8192 output tokens) and deducts the real cost after streaming,
**so that** the student's balance never goes negative, the business margin is protected regardless of exchange rate fluctuation, and usage is metered accurately.

---

## Context

O sistema de créditos foi implementado com o modelo "1 crédito = 1 mensagem" (Stories 3.1 e 3.2). O modelo mudou fundamentalmente para "créditos como saldo monetário interno em centavos de real, com custo variável por mensagem baseado em tokens consumidos e cotação do dia". O saldo NUNCA fica negativo graças a um gate pré-chamada que verifica o custo máximo possível antes de executar a chamada OpenAI.

**Estado atual (baseline):**
- `User.credits` (Int, unidades de mensagem): ✅ existe — **precisa virar `balanceCents`**
- `CreditTransaction` com `amount` (unidades): ✅ existe — **precisa virar centavos + novos campos**
- `deductCredits(userId, 1)` após stream: ✅ Story 3.2 — **precisa refatorar para custo variável com gate**
- `addCredits(userId, amount, stripePaymentId)`: ✅ Story 3.1 — **precisa refatorar para centavos + exchangeRate**
- CHECK constraint `credits >= 0`: ✅ Story 3.1 — **precisa alterar para `balanceCents >= 0` (nunca negativo)**
- Tabela `ExchangeRate`: ❌ **não existe**
- Contagem de tokens via `tiktoken`: ❌ **não existe**
- Cotação USD-BRL via AwesomeAPI (lazy): ❌ **não existe**
- Gate pré-chamada com custo máximo: ❌ **não existe**
- Campos de auditoria (`exchangeRate`, `inputTokens`, `outputTokens`, `modelUsed`, `costUsd`, `maxOutputTokens`): ❌ **não existem**

**O que NÃO muda:** Autenticação, chat UI (visual), streaming SSE, Stripe Checkout, fluxo geral de webhooks, monorepo structure. A experiência do aluno não muda visivelmente — ele continua vendo créditos e enviando mensagens.

---

## Subtasks

### Subtask 1: Migration Prisma — Schema do banco

**Escopo:** Criar migration Prisma que aplica todas as mudanças de schema.

- [ ] Criar tabela `ExchangeRate` com campos: `id` (cuid), `currency` (String), `rate` (Decimal), `date` (DateTime @db.Date), `createdAt`. Constraint: `@@unique([currency, date])`
- [ ] Renomear `User.credits` → `User.balanceCents` (Int, default 0, semântica: centavos de real)
- [ ] Adicionar campos em `CreditTransaction`: `exchangeRate` (Decimal?), `inputTokens` (Int?), `outputTokens` (Int?), `modelUsed` (String?), `costUsd` (Decimal?), `maxOutputTokens` (Int?)
- [ ] Remover CHECK constraint antiga `user_credits_non_negative`
- [ ] Criar migration Prisma: `pnpm db:migrate` aplica sem erros
- [ ] Dados existentes: se houver usuários de teste com saldo, zerar `balanceCents` (dados de desenvolvimento)

**Test:** Migration aplica sem erros. `prisma generate` produz tipos corretos. Queries antigas com `credits` falham → confirma rename.

---

### Subtask 2: Serviço de cotação em packages/db

**Escopo:** Funções para buscar (lazy on-demand), armazenar e consultar cotação USD-BRL.

- [ ] Criar `packages/db/src/exchange-rate.ts`
- [ ] Função `getExchangeRate(currency: string): Promise<number>`
  1. Busca no banco pela data de hoje (sem horário)
  2. Se encontrar, retorna `rate`
  3. Se não encontrar → chama AwesomeAPI: `GET https://economia.awesomeapi.com.br/json/last/USD-BRL` → parse `USDBRL.bid` → salva no banco via upsert → retorna
  4. Se API falhar → busca última cotação no banco (`ORDER BY date DESC LIMIT 1`)
  5. Se banco vazio → usa `parseFloat(process.env.FALLBACK_USD_BRL_RATE)`
  6. Se nada disponível → `throw Error` com mensagem clara (não crash silencioso)
- [ ] Função `updateExchangeRate(currency: string, rate: number): Promise<ExchangeRate>`
  1. Faz upsert na tabela com `currency` + `date` = hoje
  2. Chamada internamente por `getExchangeRate()` quando busca cotação na API
- [ ] Zod validation no response da AwesomeAPI (schema `{ USDBRL: { bid: string } }`)
- [ ] Exportar de `packages/db/src/index.ts`
- [ ] Adicionar `FALLBACK_USD_BRL_RATE` ao `.env.example`

**Test:** API ok → retorna + salva. API falha com banco populado → retorna última cotação. API falha com banco vazio → retorna fallback .env. Banco e API e env indisponíveis → throw Error.

---

### Subtask 3: Contagem de tokens e cálculo de custos em packages/db

**Escopo:** Integrar `tiktoken` para contagem exata de tokens e funções de cálculo de custo.

- [ ] Instalar `tiktoken` como dependência de `packages/db`
- [ ] Criar `packages/db/src/token-counter.ts`
- [ ] Função `countTokens(messages: Array<{ role: string, content: string }>): number`
  1. Usa encoding `cl100k_base` (compatível com GPT-4o e GPT-4o-mini)
  2. Conta tokens de cada mensagem (incluindo overhead de role/formatting)
  3. Retorna total de tokens de input
- [ ] Constante exportada `MAX_OUTPUT_TOKENS = 8192`
- [ ] Constante exportada `MIN_COST_CENTS = 100`
- [ ] Constante `MODEL_PRICING` com preços por modelo:
  - GPT-4o: input $2.50/1M, output $10.00/1M
  - GPT-4o-mini: input $0.15/1M, output $0.60/1M
  - **ATUALIZAR COM PREÇOS VIGENTES NO MOMENTO DA IMPLEMENTAÇÃO**
- [ ] Função `estimateMaxCost(inputTokens: number, model: string, exchangeRate: number): number`
  1. `maxCostUsd = inputTokens × inputPrice + MAX_OUTPUT_TOKENS × outputPrice`
  2. `maxCostCents = Math.ceil(maxCostUsd × exchangeRate × 100)`
  3. Retorna `Math.max(maxCostCents, MIN_COST_CENTS)`
- [ ] Função `calculateRealCost(inputTokens: number, outputTokens: number, model: string, exchangeRate: number): { costCents: number, costUsd: number }`
  1. `costUsd = inputTokens × inputPrice + outputTokens × outputPrice`
  2. `costCents = Math.ceil(costUsd × exchangeRate × 100)`
  3. Retorna `{ costCents: Math.max(costCents, MIN_COST_CENTS), costUsd }`
- [ ] Exportar de `packages/db/src/index.ts`

**Test:** `countTokens` com mensagem conhecida → conta corretamente. `estimateMaxCost` com valores conhecidos → cálculo correto com arredondamento para cima. `calculateRealCost` retorna mínimo MIN_COST_CENTS. Modelo desconhecido → usa preço default.

---

### Subtask 4: Refatorar `deductCredits` em packages/db

**Escopo:** Nova assinatura com metadata de auditoria. Saldo nunca fica negativo.

- [ ] Refatorar `deductCredits` em `packages/db/src/credits.ts`:

```typescript
deductCredits(
  userId: string,
  costCents: number,
  metadata: {
    exchangeRate: number;
    inputTokens: number;
    outputTokens: number;
    modelUsed: string;
    costUsd: number;
    conversationTitle: string;
    maxOutputTokens: number;
  }
): Promise<{ balanceCents: number }>
```

- [ ] Transação atômica via `$transaction`:
  1. UPDATE atômico: `UPDATE "User" SET "balanceCents" = "balanceCents" - $costCents WHERE "id" = $userId AND "balanceCents" - $costCents >= 0 RETURNING "balanceCents"`
  2. Se UPDATE não afeta nenhuma row → lança `InsufficientBalanceError`
  3. Insere `CreditTransaction` com: `amount: -costCents`, `type: 'consumption'`, `description: metadata.conversationTitle`, e todos os campos de metadata
- [ ] Retorna `{ balanceCents: newBalance }`
- [ ] Renomear `InsufficientCreditsError` → `InsufficientBalanceError`
- [ ] Proteção extra: validação defensiva `balanceCents - costCents < 0` rejeita (não deveria acontecer se gate funciona, mas proteção contra race conditions)

**Test:** Saldo 1000, custo 200 → saldo 800 + registro com metadata completa. Saldo 100, custo 200 → `InsufficientBalanceError` (saldo ficaria negativo). Race condition: duas deduções simultâneas → UPDATE atômico garante que apenas uma tem sucesso.

---

### Subtask 5: Refatorar `addCredits` em packages/db

**Escopo:** Nova assinatura com `exchangeRate` e semântica em centavos.

- [ ] Refatorar `addCredits` em `packages/db/src/credits.ts`:

```typescript
addCredits(
  userId: string,
  amountCents: number,
  stripePaymentId: string,
  exchangeRate: number
): Promise<{ balanceCents: number }>
```

- [ ] Transação atômica:
  1. Incrementa `User.balanceCents` por `amountCents`
  2. Cria `CreditTransaction` com: `amount: +amountCents`, `type: 'purchase'`, `stripePaymentId`, `exchangeRate`, `description: "Compra de créditos via Stripe"`
- [ ] Retorna `{ balanceCents: newBalance }`
- [ ] `amountCents` = `valor_pago_centavos × CREDIT_PERCENTAGE` (calculado na API Route, não aqui)
- [ ] Idempotência mantida via `stripePaymentId` UNIQUE

**Test:** `addCredits(userId, 2796, "pi_123", 5.45)` → saldo incrementa 2796, registro com `exchangeRate: 5.45`. Chamada duplicada com mesmo `stripePaymentId` → unique constraint error (não duplica).

---

### Subtask 6: Refatorar `POST /api/chat`

**Escopo:** Implementar gate pré-chamada + dedução de custo real após streaming.

- [ ] **Fluxo completo revisado:**

```
POST /api/chat
  ├─ auth check
  ├─ receive { conversationId, message }
  ├─ mount messages (system prompt + resumo últimas 10 + nova) — JÁ EXISTE, manter
  ├─ countTokens(messages) → inputTokens
  ├─ getExchangeRate("USD-BRL") → exchangeRate
  ├─ model = determinarModelo() — JÁ EXISTE
  ├─ estimateMaxCost(inputTokens, model, exchangeRate) → maxCostCents
  ├─ fetch user.balanceCents
  ├─ GATE: balanceCents < maxCostCents → 402 { error: "insufficient_credits", required: maxCostCents, available: balanceCents }
  ├─ save user message
  ├─ stream OpenAI with max_tokens: 8192
  │   ├─ success:
  │   │   ├─ save assistant message
  │   │   ├─ extract usage.completion_tokens from response
  │   │   ├─ calculateRealCost(inputTokens, completion_tokens, model, exchangeRate) → { costCents, costUsd }
  │   │   ├─ deductCredits(userId, costCents, { exchangeRate, inputTokens, outputTokens, modelUsed, costUsd, conversationTitle, maxOutputTokens: 8192 })
  │   │   └─ send { done: true, conversationId, balanceCents }
  │   └─ error:
  │       ├─ send { error: message }
  │       └─ NO deduction
  └─ header: X-Balance-Cents (post-deduction value)
```

- [ ] Chamar OpenAI com `max_tokens: 8192` em todas as chamadas
- [ ] Se chamada OpenAI falhar → nenhum crédito deduzido (manter comportamento atual)
- [ ] Se `deductCredits` falhar por `InsufficientBalanceError` (race condition improvável): logar warning, não reverter resposta já entregue

**Test:** Gate aceita (saldo suficiente para pior caso) → stream → deduz custo real (menor que estimado). Gate rejeita (saldo insuficiente) → 402. OpenAI fail → zero dedução. `CreditTransaction` registra todos os campos de auditoria.

---

### Subtask 7: Refatorar webhook do Stripe (`POST /api/webhooks/stripe`)

**Escopo:** Adaptar webhook para creditar `balanceCents` com `CREDIT_PERCENTAGE`.

- [ ] No handler de `checkout.session.completed`:
  1. Ler `amount_total` do checkout session (centavos BRL do Stripe)
  2. Buscar cotação: `const exchangeRate = await getExchangeRate("USD-BRL")`
  3. Calcular `amountCents = Math.floor(amountTotal × parseFloat(process.env.CREDIT_PERCENTAGE ?? '0.40'))`
  4. Chamar `addCredits(userId, amountCents, stripePaymentId, exchangeRate)`
- [ ] `CREDIT_PERCENTAGE` vem de `process.env.CREDIT_PERCENTAGE` (default `"0.40"`)
- [ ] Log: `[Webhook] Crediting userId=X amountCents=Y (percentage=40%, original=Z)`
- [ ] Idempotência mantida via `stripe_payment_id` UNIQUE — não muda

**Test:** Pagamento de R$69,90 (6990 centavos Stripe) × 0.40 = 2796 centavos → `addCredits(userId, 2796, ...)`.

---

### Subtask 8: Atualizar frontend

**Escopo:** Adaptar componentes para consumir `balanceCents` em vez de `credits`.

- [ ] **CreditsProvider / CreditsContext:**
  - Renomear internamente `credits` → `balanceCents`
  - Criar utility `formatBalance(balanceCents: number): string` que converte centavos para exibição:
    - `balanceCents <= 0` → `"0 créditos"`
    - `balanceCents < 100` → `"< 1 crédito"`
    - Else → `"X crédito(s)"` onde `X = Math.floor(balanceCents / 100)`
  - 1 crédito visível = 100 centavos internos (alinhado com MIN_COST_CENTS)
  - Manter API do contexto compatível (`updateCredits` aceita novo valor)

- [ ] **AppLayout / CreditsBadge:**
  - Exibe saldo formatado via `formatBalance()`
  - Aluno vê "créditos" (nunca "reais" ou "centavos")

- [ ] **Chat page:**
  - Ler `balanceCents` do evento SSE `done`
  - Ler `X-Balance-Cents` do header de resposta
  - Condição de "sem créditos" baseada em `balanceCents <= 0`

- [ ] **Prompt inline de créditos insuficientes:**
  - Mensagem continua "Seus créditos são insuficientes" (sem mencionar reais)
  - Ajustar para usar 402 com novo payload `{ error, required, available }`
  - Comportamento mantido (inline no chat, não modal)

- [ ] **Página de compra (`/credits/buy`):**
  - Manter pacotes existentes e preços em reais
  - Adicionar texto "aproximadamente X scripts" (valor estático para MVP)

**Test:** Badge exibe "X créditos". Evento `done` atualiza badge. Saldo zero desabilita input. 402 mostra prompt inline.

---

### Subtask 9: Atualizar `.env.example`

**Escopo:** Documentar novas variáveis de ambiente.

- [ ] Adicionar `FALLBACK_USD_BRL_RATE=6.00` com comentário explicativo
- [ ] Adicionar `CREDIT_PERCENTAGE=0.40` com comentário explicativo
- [ ] Remover `CREDIT_MARGIN_PERCENT` se existir (substituído por `CREDIT_PERCENTAGE`)

---

### Subtask 10: Testes

**Escopo:** Garantir cobertura dos novos fluxos com testes unitários e de integração.

- [ ] **Unit — Exchange Rate (`packages/db`):**
  - `getExchangeRate` com cotação do dia no banco → retorna rate (sem chamar API)
  - `getExchangeRate` sem cotação do dia → chama API, salva, retorna
  - `getExchangeRate` API falha, banco tem cotação antiga → retorna última
  - `getExchangeRate` API falha, banco vazio → retorna fallback .env
  - `updateExchangeRate` faz upsert corretamente

- [ ] **Unit — Token Counting (`packages/db`):**
  - `countTokens` com mensagens de tamanhos variados → conta corretamente
  - `estimateMaxCost` com valores conhecidos e modelos diferentes → cálculo correto
  - `calculateRealCost` com valores conhecidos → retorna `{ costCents, costUsd }` corretos
  - Arredondamento: `Math.ceil` sempre arredonda para cima
  - Custo mínimo: resultado nunca abaixo de `MIN_COST_CENTS` (100)

- [ ] **Unit — Credits (`packages/db`):**
  - `deductCredits` com saldo suficiente → decrementa + registra metadata completa
  - `deductCredits` com saldo insuficiente → `InsufficientBalanceError` (saldo nunca negativo)
  - `deductCredits` race condition → UPDATE atômico garante consistência
  - `addCredits` incrementa + registra `exchangeRate`
  - `addCredits` com `stripePaymentId` duplicado → unique constraint error

- [ ] **Integration — Chat Flow (API Routes):**
  - POST /api/chat com mock OpenAI: gate aceita → stream → deduz custo real < estimado
  - POST /api/chat com mock OpenAI: gate rejeita (saldo insuficiente para max cost) → 402
  - POST /api/chat: OpenAI error → zero dedução
  - `CreditTransaction` registra `exchangeRate`, `inputTokens`, `outputTokens`, `modelUsed`, `costUsd`, `maxOutputTokens`

- [ ] **Integration — Webhook:**
  - POST /api/webhooks/stripe: webhook credita saldo em centavos × `CREDIT_PERCENTAGE`
  - `CreditTransaction` registra `exchangeRate` do momento

- [ ] **Integration — Cotação lazy:**
  - Primeira chamada do dia → busca API, salva no banco
  - Segunda chamada do dia → retorna do banco (sem chamar API)

- [ ] `pnpm typecheck` passa sem erros
- [ ] `pnpm lint` passa sem novos erros

---

## Acceptance Criteria

### AC1: Gate pré-chamada com custo máximo
- [ ] Gate verifica custo máximo estimado `(inputTokens × inputPrice + 8192 × outputPrice) × cotação × 100` antes de chamar OpenAI
- [ ] Custo máximo estimado usa `MAX_OUTPUT_TOKENS = 8192` como pior caso para output

### AC2: Bloqueio por saldo insuficiente
- [ ] Saldo insuficiente para cobrir custo **máximo estimado** → `402 Payment Required` com prompt inline
- [ ] Resposta 402 inclui `{ error: "insufficient_credits", required: maxCostCents, available: balanceCents }`

### AC3: Saldo NUNCA negativo
- [ ] Saldo não pode ficar negativo — gate garante cobertura para pior caso (8192 tokens output)
- [ ] `deductCredits` usa UPDATE atômico com `WHERE balanceCents - costCents >= 0` como proteção adicional
- [ ] Conceito de `minBalanceCents` removido — não é necessário com gate

### AC4: Dedução de custo real após streaming
- [ ] Após streaming completo, custo REAL é deduzido (sempre <= custo máximo estimado)
- [ ] Custo mínimo por mensagem: `MIN_COST_CENTS = 100` (1 crédito)
- [ ] Se chamada OpenAI falhar → nenhum crédito deduzido

### AC5: Auditoria completa por transação
- [ ] Toda `CreditTransaction` de consumption registra: `exchangeRate`, `inputTokens`, `outputTokens`, `modelUsed`, `costUsd`, `maxOutputTokens`
- [ ] Toda `CreditTransaction` de purchase registra: `exchangeRate` (do momento da compra) e `stripePaymentId`

### AC6: Cotação lazy com fallback
- [ ] Cotação USD-BRL buscada via lazy loading (1x/dia): banco → AwesomeAPI → última cotação → fallback .env
- [ ] Zod validation no response da AwesomeAPI
- [ ] Armazenada em `exchange_rates` com constraint `@@unique([currency, date])`

### AC7: Webhook credita com CREDIT_PERCENTAGE
- [ ] Webhook do Stripe credita `valor_pago_centavos × CREDIT_PERCENTAGE` em centavos no `balanceCents`
- [ ] `CREDIT_PERCENTAGE` configurável via `.env` (default `0.40`)
- [ ] Registro inclui `exchangeRate` e `stripePaymentId` (idempotente)

### AC8: Frontend exibe créditos
- [ ] Aluno vê saldo em "créditos" (nunca em reais, centavos ou dólares)
- [ ] 1 crédito visível = 100 centavos internos (alinhado com MIN_COST_CENTS)
- [ ] Badge atualiza após cada mensagem via header `X-Balance-Cents` e evento `done`

### AC9: OpenAI com max_tokens: 8192
- [ ] Todas as chamadas OpenAI usam `max_tokens: 8192`
- [ ] `tiktoken` com encoding `cl100k_base` conta tokens com precisão

### AC10: Nenhuma regressão
- [ ] Autenticação, chat UI, streaming SSE, Stripe Checkout, histórico de conversas funcionam como antes
- [ ] Erro da OpenAI → nenhum crédito deduzido

### AC11: Cobertura de testes
- [ ] Testes unitários passam para: exchange rate (todos fallbacks), token counting, estimateMaxCost, calculateRealCost, deductCredits, addCredits
- [ ] Testes de integração passam para: chat flow (gate aceita/rejeita, custo real), webhook, cotação lazy
- [ ] `pnpm typecheck` e `pnpm lint` passam sem erros

---

## Files to Create/Modify

| File | Action | Mudança |
|------|--------|---------|
| `packages/db/prisma/schema.prisma` | MODIFY | Rename credits→balanceCents, add ExchangeRate model, add fields to CreditTransaction (incl. maxOutputTokens) |
| `packages/db/prisma/migrations/.../migration.sql` | CREATE | Migration com todas as alterações de schema |
| `packages/db/src/exchange-rate.ts` | CREATE | getExchangeRate (lazy on-demand), updateExchangeRate |
| `packages/db/src/token-counter.ts` | CREATE | countTokens, estimateMaxCost, calculateRealCost, MODEL_PRICING, MAX_OUTPUT_TOKENS, MIN_COST_CENTS |
| `packages/db/src/credits.ts` | MODIFY | Refatorar deductCredits (UPDATE atômico, metadata com maxOutputTokens) e addCredits (CREDIT_PERCENTAGE) |
| `packages/db/src/index.ts` | MODIFY | Export exchange-rate e token-counter functions |
| `apps/web/src/app/api/chat/route.ts` | MODIFY | Gate pré-chamada, max_tokens: 8192, dedução custo real, header X-Balance-Cents |
| `apps/web/src/app/api/webhooks/stripe/route.ts` | MODIFY | CREDIT_PERCENTAGE, getExchangeRate, addCredits com exchangeRate |
| `apps/web/src/lib/format-balance.ts` | CREATE | formatBalance(balanceCents): string (utility para RSC e client) |
| `apps/web/src/components/layout/CreditsProvider.tsx` | MODIFY | Renomear credits→balanceCents, usar formatBalance |
| `apps/web/src/app/chat/page.tsx` | MODIFY | Ler X-Balance-Cents e balanceCents do evento done |
| `apps/web/src/components/dashboard/CreditSummary.tsx` | MODIFY | Usar formatBalance |
| `apps/web/src/components/dashboard/TransactionHistory.tsx` | MODIFY | Usar formatBalance |
| `.env.example` | MODIFY | Adicionar FALLBACK_USD_BRL_RATE, CREDIT_PERCENTAGE |

---

## Dependencies

- **Blocked by:** Story 3.1 (schema base + funções existentes) ✅ Done
- **Blocked by:** Story 3.2 (dedução no chat existente) ✅ Done
- **Blocked by:** Story 3.4 (webhook Stripe existente) ✅ Done
- **Blocked by:** Story 2.3 (streaming OpenAI funcional) ✅ Done
- **Blocks:** Nenhuma — esta é uma refatoração de stories já implementadas
- **New dependencies:** `tiktoken` (npm package para packages/db)

---

## Implementation Plan

### Ordem de implementação

1. **Subtask 1** (Migration) — schema primeiro, tudo mais depende disso
2. **Subtask 2** (Exchange Rate) — independente, pode ser testado isoladamente
3. **Subtask 3** (Token Counter + Cost) — independente, pode ser testado isoladamente
4. **Subtask 4 + 5** (Credits functions) — dependem de Subtask 1
5. **Subtask 6** (API Chat) — depende de Subtasks 2, 3, 4
6. **Subtask 7** (Webhook) — depende de Subtasks 2, 5
7. **Subtask 8** (Frontend) — depende de Subtask 6
8. **Subtask 9** (.env.example) — independente, pode ser feita a qualquer momento
9. **Subtask 10** (Tests) — depende de todas as anteriores

### Dados existentes

- Registros existentes em `credit_transactions` com `amount` em unidades de mensagem serão mantidos como-is (novos campos são nullable)
- `User.credits` será renomeado para `balanceCents` — valores existentes de desenvolvimento devem ser zerados na migration
- **Ambiente:** Apenas dados de desenvolvimento, sem dados de produção. Zerar saldos é seguro.

---

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `FALLBACK_USD_BRL_RATE` | Cotação USD-BRL de fallback quando API e banco estão indisponíveis | `6.00` | No |
| `CREDIT_PERCENTAGE` | Fração do valor pago disponibilizada como saldo interno (0.40 = 40%) | `0.40` | No |

---

## Constants

| Constant | Value | Location | Purpose |
|----------|-------|----------|---------|
| `MAX_OUTPUT_TOKENS` | `8192` | `packages/db/src/token-counter.ts` | Teto de segurança para gate e `max_tokens` da OpenAI |
| `MIN_COST_CENTS` | `100` | `packages/db/src/token-counter.ts` | Custo mínimo por mensagem = 1 crédito |
| `MODEL_PRICING` | `{ gpt-4o, gpt-4o-mini }` | `packages/db/src/token-counter.ts` | Preços input/output por modelo |

---

## Testing Checklist

- [ ] Migration aplica sem erros (`pnpm db:migrate`)
- [ ] `getExchangeRate` retorna cotação do dia (sem chamar API se já existe)
- [ ] `getExchangeRate` chama API quando não tem cotação do dia, salva no banco
- [ ] `getExchangeRate` retorna última cotação quando API falha
- [ ] `getExchangeRate` retorna fallback .env quando banco vazio
- [ ] `countTokens` conta tokens com precisão
- [ ] `estimateMaxCost` calcula custo máximo com MAX_OUTPUT_TOKENS=8192
- [ ] `calculateRealCost` calcula custo real, nunca abaixo de MIN_COST_CENTS
- [ ] `deductCredits` decrementa `balanceCents` + registra metadata completa (incl. maxOutputTokens)
- [ ] `deductCredits` rejeita quando saldo ficaria negativo
- [ ] `addCredits` incrementa `balanceCents` + registra `exchangeRate`
- [ ] `addCredits` com `stripePaymentId` duplicado → unique constraint error
- [ ] Chat: gate aceita → stream → deduz custo real
- [ ] Chat: gate rejeita → 402 com payload
- [ ] Chat: OpenAI error → zero dedução
- [ ] Webhook: credita centavos com CREDIT_PERCENTAGE
- [ ] Frontend: badge exibe "X créditos" (1 crédito = 100 centavos)
- [ ] Frontend: header X-Balance-Cents atualiza badge
- [ ] `pnpm typecheck` passa sem erros
- [ ] `pnpm lint` passa sem novos erros

---

## Definition of Done

- [ ] Migration aplicada com sucesso (ExchangeRate table, balanceCents, novos campos)
- [ ] `getExchangeRate` funcional com lazy loading e fallback em 4 níveis
- [ ] `tiktoken` integrado e contando tokens (`cl100k_base`)
- [ ] `estimateMaxCost` e `calculateRealCost` calculam corretamente
- [ ] `deductCredits` com UPDATE atômico e metadata completa
- [ ] `addCredits` com CREDIT_PERCENTAGE e exchangeRate
- [ ] `POST /api/chat` implementa gate → stream → custo real → dedução
- [ ] OpenAI chamada com `max_tokens: 8192`
- [ ] Saldo nunca fica negativo
- [ ] Webhook credita em centavos × CREDIT_PERCENTAGE
- [ ] Frontend exibe saldo formatado e atualiza via `X-Balance-Cents`
- [ ] Todos os ACs validados
- [ ] Testes unitários e de integração passam
- [ ] TypeScript strict: sem `any`, sem `as unknown`
- [ ] Nenhum erro de TypeScript (`pnpm typecheck`)

---

## References

- **PRD v4.0:** [docs/prd.md](../../prd.md) — FR5, FR6, FR9, Stories 3.1, 3.2, 3.4, 3.6
- **Architecture v3.0:** [docs/architecture.md](../../architecture.md) — Data Models, Core Workflows, Database Schema, Credit Functions, Configuration & Constants
- **Story 3.1 (baseline):** [story-3.1-credits-schema.md](./story-3.1-credits-schema.md)
- **Story 3.2 (baseline):** [story-3.2-chat-credit-deduction.md](./story-3.2-chat-credit-deduction.md)
- **AwesomeAPI:** `https://economia.awesomeapi.com.br/json/last/USD-BRL`
- **tiktoken:** `https://github.com/openai/tiktoken`
