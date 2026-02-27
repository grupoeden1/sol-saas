# Story 3.6 — Refatoração do Sistema de Precificação

**Epic:** 3 — Créditos & Pagamentos
**Story ID:** 3.6
**Priority:** Critical
**Estimate:** 13 story points
**Status:** Draft

---

## User Story

**As a** product owner,
**I want** the credit system to deduct costs based on real token consumption and daily USD-BRL exchange rate,
**so that** the business margin is protected regardless of exchange rate fluctuation or model pricing changes, and usage is metered accurately.

---

## Context

O sistema de créditos foi implementado com o modelo "1 crédito = 1 mensagem" (Stories 3.1 e 3.2). O modelo mudou fundamentalmente para "créditos como saldo monetário interno em centavos de real, com custo variável por mensagem baseado em tokens consumidos e cotação do dia".

**Estado atual (baseline):**
- `User.credits` (Int, unidades de mensagem): ✅ existe — **precisa virar `balanceCents`**
- `CreditTransaction` com `amount` (unidades): ✅ existe — **precisa virar centavos + novos campos**
- `deductCredits(userId, 1)` após stream: ✅ Story 3.2 — **precisa refatorar para custo variável**
- `addCredits(userId, amount, stripePaymentId)`: ✅ Story 3.1 — **precisa refatorar para centavos + exchangeRate**
- CHECK constraint `credits >= 0`: ✅ Story 3.1 — **precisa alterar para `balanceCents >= minBalanceCents`**
- Tabela `ExchangeRate`: ❌ **não existe**
- Contagem de tokens via `tiktoken`: ❌ **não existe**
- Cotação USD-BRL via AwesomeAPI: ❌ **não existe**
- Campos de auditoria (`exchangeRate`, `inputTokens`, `outputTokens`, `modelUsed`, `costUsd`): ❌ **não existem**

**O que NÃO muda:** Autenticação, chat UI (visual), streaming SSE, Stripe Checkout, fluxo geral de webhooks. A experiência do aluno não muda visivelmente — ele continua vendo créditos e enviando mensagens.

---

## Subtasks

### Subtask 1: Migration — Alterar schema do banco

**Escopo:** Criar migration Prisma que aplica todas as mudanças de schema.

- [ ] Criar tabela `ExchangeRate` com campos: `id` (cuid), `currency` (String), `rate` (Decimal), `date` (DateTime @db.Date), `createdAt`. Constraint: `@@unique([currency, date])`
- [ ] Renomear `User.credits` → `User.balanceCents` (Int, default 0, semântica: centavos de real)
- [ ] Adicionar `User.minBalanceCents` (Int, default -200 — limite de saldo negativo = -R$2,00)
- [ ] Adicionar campos em `CreditTransaction`: `exchangeRate` (Decimal?), `inputTokens` (Int?), `outputTokens` (Int?), `modelUsed` (String?), `costUsd` (Decimal?)
- [ ] Remover CHECK constraint antiga `user_credits_non_negative` (já não se aplica)
- [ ] Adicionar CHECK constraint nova: `ALTER TABLE "User" ADD CONSTRAINT "user_balance_above_min" CHECK ("balanceCents" >= "minBalanceCents")`
- [ ] `pnpm db:migrate` aplica sem erros

**Test:** Migration aplica sem erros. `prisma generate` produz tipos corretos. Queries antigas falham com `credits` → confirma que campo foi renomeado.

---

### Subtask 2: Implementar serviço de cotação (packages/db)

**Escopo:** Funções para buscar, armazenar e consultar cotação USD-BRL.

- [ ] Criar `packages/db/src/exchange-rate.ts`
- [ ] Função `getExchangeRate(currency: string): Promise<Decimal>`
  1. Busca na tabela `exchange_rates` onde `currency` = par e `date` = hoje
  2. Se encontrar, retorna `rate`
  3. Se não encontrar, busca última cotação disponível para o par
  4. Se não existir nenhuma, retorna `Decimal(process.env.FALLBACK_USD_BRL_RATE ?? '6.00')`
- [ ] Função `updateExchangeRate(currency: string, rate: Decimal): Promise<ExchangeRate>`
  1. Faz upsert na tabela com `currency` + `date` = hoje (midnight UTC-3)
  2. Retorna o registro criado/atualizado
- [ ] Função `fetchExchangeRateFromApi(currency: string): Promise<Decimal>`
  1. GET `https://economia.awesomeapi.com.br/json/last/USD-BRL`
  2. Parse do campo `bid` da resposta
  3. Retorna `Decimal(bid)`
  4. Em caso de erro (network, parse), lança `ExchangeRateApiError`
- [ ] Função `ensureTodayRate(currency: string): Promise<Decimal>` (lazy refresh)
  1. Tenta `getExchangeRate` — se retornou cotação de hoje, retorna
  2. Se cotação não é de hoje, tenta `fetchExchangeRateFromApi` + `updateExchangeRate`
  3. Se API falhar, retorna última cotação disponível via `getExchangeRate`
- [ ] Exportar tudo de `packages/db/src/index.ts`
- [ ] Adicionar `FALLBACK_USD_BRL_RATE` ao `.env.example`

**Test:** `getExchangeRate` com cotação do dia → retorna. Sem cotação do dia → retorna última. Sem nenhuma → retorna fallback. `updateExchangeRate` faz upsert corretamente. `fetchExchangeRateFromApi` com mock → parse correto.

---

### Subtask 3: Implementar contagem de tokens (apps/web)

**Escopo:** Integrar `tiktoken` para contagem exata de tokens antes e após chamada OpenAI.

- [ ] Instalar `tiktoken` como dependência de `apps/web`
- [ ] Criar `apps/web/src/lib/token-counter.ts`
- [ ] Função `countTokens(messages: Array<{ role: string, content: string }>, model: string): number`
  1. Obtém encoding para o modelo (ex: `cl100k_base` para gpt-4o)
  2. Conta tokens de cada mensagem (incluindo overhead de role/formatting)
  3. Retorna total de tokens de input
- [ ] Função `calculateCostCents(inputTokens: number, outputTokens: number, model: string, exchangeRate: Decimal): { costUsd: Decimal, costCents: number }`
  1. Consulta tabela de preços por modelo (hardcoded no MVP, ex: gpt-4o input=$2.50/1M, output=$10.00/1M)
  2. Calcula `costUsd = (inputTokens × pricePerInputToken + outputTokens × pricePerOutputToken)`
  3. Calcula `costCents = Math.ceil(costUsd × exchangeRate × 100)`
  4. Retorna ambos
- [ ] Constante `MODEL_PRICING` com preços dos modelos suportados

**Test:** `countTokens` com mensagem conhecida → conta corretamente. `calculateCostCents` com valores conhecidos → cálculo correto. Modelo desconhecido → usa preço default.

---

### Subtask 4: Refatorar `deductCredits` em packages/db

**Escopo:** Nova assinatura com metadata de auditoria e suporte a saldo negativo controlado.

- [ ] Refatorar `deductCredits` em `packages/db/src/credits.ts`:

```typescript
deductCredits(
  userId: string,
  costCents: number,
  metadata: {
    exchangeRate: Decimal;
    inputTokens: number;
    outputTokens: number;
    modelUsed: string;
    costUsd: Decimal;
  }
): Promise<{ balanceCents: number }>
```

- [ ] Transação atômica:
  1. Lê `User.balanceCents` e `User.minBalanceCents`
  2. Valida `balanceCents - costCents >= minBalanceCents` — se não, lança `InsufficientBalanceError`
  3. Decrementa `balanceCents` por `costCents`
  4. Cria `CreditTransaction` com: `amount: -costCents`, `type: 'consumption'`, `exchangeRate`, `inputTokens`, `outputTokens`, `modelUsed`, `costUsd`, `description: "Consumo de X tokens (modelo)"`
- [ ] Retorna `{ balanceCents: newBalance }`
- [ ] Renomear `InsufficientCreditsError` → `InsufficientBalanceError` com mensagem: `"Saldo insuficiente: usuário {userId} tem {current} centavos, necessário {required}, limite mínimo {min}"`

**Test:** Saldo 1000, custo 200 → saldo 800 + registro com metadata. Saldo 100, custo 200, min -200 → saldo -100 (permitido). Saldo -100, custo 200, min -200 → `InsufficientBalanceError` (ficaria -300, abaixo de -200).

---

### Subtask 5: Refatorar `addCredits` em packages/db

**Escopo:** Nova assinatura com `exchangeRate` e semântica em centavos.

- [ ] Refatorar `addCredits` em `packages/db/src/credits.ts`:

```typescript
addCredits(
  userId: string,
  amountCents: number,
  stripePaymentId: string,
  exchangeRate?: Decimal
): Promise<{ balanceCents: number }>
```

- [ ] Transação atômica:
  1. Incrementa `User.balanceCents` por `amountCents`
  2. Cria `CreditTransaction` com: `amount: amountCents`, `type: 'purchase'`, `stripePaymentId`, `exchangeRate: exchangeRate ?? null`, `description: "Compra de créditos via Stripe"`
- [ ] Retorna `{ balanceCents: newBalance }`
- [ ] Idempotência mantida via `stripePaymentId` UNIQUE

**Test:** `addCredits(userId, 2796, "pi_123", 5.45)` → saldo incrementa 2796, registro com `exchangeRate: 5.45`. Chamada duplicada com mesmo `stripePaymentId` → erro unique constraint (não duplica).

---

### Subtask 6: Refatorar `POST /api/chat`

**Escopo:** Implementar fluxo de dedução baseado em tokens no endpoint de chat.

- [ ] **Antes da chamada OpenAI:**
  1. Montar array de mensagens (system prompt + histórico + mensagem nova)
  2. Contar tokens de input via `countTokens(messages, model)`
  3. Buscar cotação via `ensureTodayRate("USD-BRL")`
  4. Calcular custo estimado do input via `calculateCostCents(inputTokens, 0, model, exchangeRate)`
  5. Verificar `balanceCents >= costCents` (pré-check com custo do input apenas)
  6. Se insuficiente → retornar `402` com JSON `{ error: "Saldo insuficiente" }`

- [ ] **Após streaming completo:**
  1. Contar tokens de output (via `usage` da resposta OpenAI ou via `countTokens` do texto completo)
  2. Calcular custo real total via `calculateCostCents(inputTokens, outputTokens, model, exchangeRate)`
  3. Chamar `deductCredits(userId, costCents, { exchangeRate, inputTokens, outputTokens, modelUsed: model, costUsd })`
  4. Enviar evento SSE `done` com `{ done: true, conversationId, balanceRemaining: newBalanceCents }`

- [ ] Substituir header `X-Credits-Remaining` por `X-Balance-Remaining` (valor pré-dedução para feedback imediato)
- [ ] Se `deductCredits` falhar por `InsufficientBalanceError` (race condition pós-stream): logar warning, não reverter resposta já entregue
- [ ] Se chamada OpenAI falhar: nenhuma dedução

**Fluxo atualizado:**
```
POST /api/chat
  ├─ auth check
  ├─ countTokens(messages, model) → inputTokens
  ├─ ensureTodayRate("USD-BRL") → exchangeRate
  ├─ calculateCostCents(inputTokens, 0, model, exchangeRate) → estimatedCostCents
  ├─ balanceCents < estimatedCostCents → 402
  ├─ save user message
  ├─ stream OpenAI
  │   ├─ success:
  │   │   ├─ save assistant message
  │   │   ├─ countTokens(response) → outputTokens
  │   │   ├─ calculateCostCents(inputTokens, outputTokens, model, exchangeRate) → { costCents, costUsd }
  │   │   ├─ deductCredits(userId, costCents, metadata) → { balanceCents }
  │   │   └─ send { done: true, conversationId, balanceRemaining }
  │   └─ error:
  │       ├─ send { error: message }
  │       └─ NO deduction
  └─ headers: X-Balance-Remaining (pre-deduction value)
```

**Test:** Mensagem curta → custo baixo. Mensagem com histórico longo → custo maior. Saldo insuficiente para input → 402. Stream completa → dedução real registrada com metadata. OpenAI fail → zero dedução.

---

### Subtask 7: Refatorar webhook do Stripe

**Escopo:** Adaptar webhook para creditar `balanceCents` com margem configurável.

- [ ] No handler de `checkout.session.completed` em `apps/web/src/app/api/webhooks/stripe/route.ts`:
  1. Ler `amount_total` do checkout session (centavos BRL do Stripe)
  2. Calcular `amountCents = Math.floor(amountTotal × (CREDIT_MARGIN_PERCENT / 100))`
  3. Buscar cotação via `getExchangeRate("USD-BRL")` para registro
  4. Chamar `addCredits(userId, amountCents, stripePaymentId, exchangeRate)`
- [ ] Adicionar `CREDIT_MARGIN_PERCENT` ao `.env.example` (default: `40`)
- [ ] Log: `[Webhook] Crediting userId=X amountCents=Y (margin=40%, original=Z)`

**Test:** Pagamento de R$69,90 (6990 centavos Stripe) → `amountCents = Math.floor(6990 × 0.40) = 2796` → `addCredits(userId, 2796, ...)`.

---

### Subtask 8: Atualizar frontend

**Escopo:** Adaptar componentes para consumir `balanceCents` em vez de `credits`.

- [ ] **CreditsProvider / CreditsContext:**
  - Renomear internamente `credits` → `balanceCents`
  - Função `formatBalance(balanceCents: number): string` que converte para exibição amigável (ex: 2796 → "27,96 créditos" ou mapeamento para "~X scripts")
  - Manter API externa do contexto compatível (`updateCredits` aceita novo valor)

- [ ] **AppLayout / CreditsBadge:**
  - Exibe saldo formatado via `formatBalance()`
  - Aluno vê "créditos" (nunca "reais" ou "centavos")

- [ ] **Chat page:**
  - Ler `balanceRemaining` do evento SSE `done` (em vez de `creditsRemaining`)
  - Ler `X-Balance-Remaining` do header (em vez de `X-Credits-Remaining`)
  - Condição de "sem créditos" baseada em `balanceCents <= 0` (ou threshold configurável)

- [ ] **Página de compra (`/credits/buy`):**
  - Exibir "aproximadamente X scripts" por pacote (valor estático no MVP baseado em estimativa de custo médio)
  - Manter preços em reais como estão

- [ ] **Prompt inline de créditos insuficientes:**
  - Mensagem continua "Seus créditos são insuficientes" (sem mencionar reais)
  - Comportamento mantido (inline no chat, não modal)

**Test:** Badge exibe valor formatado. Evento `done` atualiza badge. Saldo zero desabilita input. Compra de pacote exibe estimativa de scripts.

---

### Subtask 9: Testes

**Escopo:** Garantir cobertura dos novos fluxos com testes unitários e de integração.

- [ ] **Unit — Exchange Rate:**
  - `getExchangeRate` com cotação do dia → retorna rate
  - `getExchangeRate` sem cotação do dia, com cotação antiga → retorna última
  - `getExchangeRate` sem nenhuma cotação → retorna fallback env var
  - `updateExchangeRate` cria registro para hoje
  - `updateExchangeRate` faz upsert se já existir

- [ ] **Unit — Token Counting:**
  - `countTokens` com array de mensagens → conta corretamente
  - `countTokens` com model gpt-4o → usa encoding correto
  - `calculateCostCents` com valores conhecidos → cálculo exato

- [ ] **Unit — Credits:**
  - `deductCredits` com saldo suficiente → decrementa + registra metadata
  - `deductCredits` permitindo saldo negativo até `minBalanceCents` → funciona
  - `deductCredits` abaixo de `minBalanceCents` → `InsufficientBalanceError`
  - `addCredits` incrementa + registra `exchangeRate`
  - `addCredits` com `stripePaymentId` duplicado → unique constraint error

- [ ] **Integration — Chat Flow:**
  - Mensagem com saldo suficiente → deduz custo variável (não fixo 1)
  - Saldo insuficiente para input → 402
  - OpenAI error → zero dedução
  - `CreditTransaction` registra `exchangeRate`, `inputTokens`, `outputTokens`, `modelUsed`, `costUsd`

- [ ] **Integration — Webhook:**
  - Webhook credita `amountCents` calculado com margem
  - `CreditTransaction` registra `exchangeRate` do momento

- [ ] `pnpm typecheck` passa sem erros
- [ ] `pnpm lint` passa sem novos erros

---

## Acceptance Criteria

### AC1: Dedução baseada em consumo real
- [ ] Mensagem enviada deduz custo real em centavos baseado em tokens consumidos (input + output) e cotação USD-BRL do dia
- [ ] Custo varia por mensagem — mensagens curtas custam menos, longas custam mais

### AC2: Bloqueio por saldo insuficiente
- [ ] Saldo insuficiente para cobrir custo estimado do input → `402 Payment Required` com prompt inline
- [ ] Pré-check usa apenas custo do input (não inclui output estimado)

### AC3: Saldo negativo controlado
- [ ] Saldo pode ficar negativo até `minBalanceCents` (default -200 = -R$2,00) após output
- [ ] Saldo negativo bloqueia próxima mensagem (pré-check falha)

### AC4: Auditoria completa por transação
- [ ] Toda `CreditTransaction` de consumption registra: `exchangeRate`, `inputTokens`, `outputTokens`, `modelUsed`, `costUsd`
- [ ] Toda `CreditTransaction` de purchase registra: `exchangeRate` (do momento da compra)

### AC5: Cotação diária armazenada
- [ ] Cotação USD-BRL é buscada uma vez ao dia via AwesomeAPI e armazenada em `exchange_rates`
- [ ] Se API falhar, sistema usa última cotação ou fallback do `.env`

### AC6: Webhook credita saldo em centavos
- [ ] Webhook do Stripe credita `valor_pago × CREDIT_MARGIN_PERCENT%` em centavos no `balanceCents`
- [ ] Registro inclui `exchangeRate` e `stripePaymentId` (idempotente)

### AC7: Frontend exibe créditos (não reais)
- [ ] Aluno vê saldo em "créditos" (nunca em reais, centavos ou dólares)
- [ ] Badge atualiza após cada mensagem via `X-Balance-Remaining` header e evento `done`
- [ ] Página de compra mostra "aproximadamente X scripts"

### AC8: Contagem precisa de tokens
- [ ] `tiktoken` conta tokens com precisão para o modelo utilizado
- [ ] Custo calculado com fórmula: `costCents = Math.ceil(costUsd × exchangeRate × 100)`

### AC9: Nenhuma regressão
- [ ] Autenticação, chat UI, streaming SSE, Stripe Checkout funcionam como antes
- [ ] Erro da OpenAI → nenhum crédito deduzido

### AC10: Cobertura de testes
- [ ] Testes unitários passam para: exchange rate, token counting, deductCredits, addCredits
- [ ] Testes de integração passam para: fluxo de chat com dedução variável, webhook com novo addCredits
- [ ] `pnpm typecheck` e `pnpm lint` passam sem erros

---

## Files to Create/Modify

| File | Action | Mudança |
|------|--------|---------|
| `packages/db/prisma/schema.prisma` | MODIFY | Rename credits→balanceCents, add minBalanceCents, add ExchangeRate model, add fields to CreditTransaction |
| `packages/db/prisma/migrations/.../migration.sql` | CREATE | Migration com todas as alterações de schema |
| `packages/db/src/exchange-rate.ts` | CREATE | getExchangeRate, updateExchangeRate, fetchExchangeRateFromApi, ensureTodayRate |
| `packages/db/src/credits.ts` | MODIFY | Refatorar deductCredits e addCredits com novas assinaturas |
| `packages/db/src/index.ts` | MODIFY | Export exchange-rate functions |
| `apps/web/src/lib/token-counter.ts` | CREATE | countTokens, calculateCostCents, MODEL_PRICING |
| `apps/web/src/app/api/chat/route.ts` | MODIFY | Integrar contagem de tokens, cálculo de custo, nova dedução |
| `apps/web/src/app/api/webhooks/stripe/route.ts` | MODIFY | Calcular amountCents com margem, passar exchangeRate |
| `apps/web/src/components/layout/CreditsProvider.tsx` | MODIFY | Renomear internamente, adicionar formatBalance |
| `apps/web/src/components/layout/CreditsBadge.tsx` | MODIFY | Usar formatBalance para exibição |
| `apps/web/src/components/layout/AppLayout.tsx` | MODIFY | Adaptar query de balanceCents |
| `apps/web/src/app/chat/page.tsx` | MODIFY | Ler X-Balance-Remaining e balanceRemaining |
| `.env.example` | MODIFY | Adicionar FALLBACK_USD_BRL_RATE, CREDIT_MARGIN_PERCENT |

---

## Dependencies

- **Blocked by:** Story 3.1 (schema base + funções existentes) ✅ Done
- **Blocked by:** Story 3.2 (dedução no chat existente) ✅ Done
- **Blocked by:** Story 3.4 (webhook Stripe existente) ✅ Done
- **Blocked by:** Story 2.3 (streaming OpenAI funcional) ✅ Done
- **Blocks:** Nenhuma — esta é uma refatoração de stories já implementadas
- **New dependencies:** `tiktoken` (npm package)

---

## Migration Strategy

### Ordem de implementação recomendada

1. **Subtask 1** (Migration) — schema primeiro, tudo mais depende disso
2. **Subtask 2** (Exchange Rate) — independente, pode ser testado isoladamente
3. **Subtask 3** (Token Counter) — independente, pode ser testado isoladamente
4. **Subtask 4 + 5** (Credits functions) — dependem de Subtask 1
5. **Subtask 6** (API Chat) — depende de Subtasks 2, 3, 4
6. **Subtask 7** (Webhook) — depende de Subtask 5
7. **Subtask 8** (Frontend) — depende de Subtask 6
8. **Subtask 9** (Tests) — depende de todas as anteriores

### Dados existentes

- Registros existentes em `credit_transactions` com `amount` em unidades de mensagem serão mantidos como-is (campo nullable nos novos campos)
- `User.credits` será renomeado para `balanceCents` — valores existentes precisam de data migration (multiplicar por custo médio estimado ou resetar durante deploy)
- **Decisão de data migration:** A ser definida pelo @dev com base no estado do banco em staging/produção

---

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `FALLBACK_USD_BRL_RATE` | Cotação USD-BRL de fallback quando API e banco estão indisponíveis | `6.00` | No |
| `CREDIT_MARGIN_PERCENT` | Porcentagem do valor pago disponibilizada como saldo interno | `40` | No |

---

## Testing Checklist

- [ ] Migration aplica sem erros (`pnpm db:migrate`)
- [ ] `getExchangeRate` retorna cotação do dia, última ou fallback
- [ ] `updateExchangeRate` faz upsert corretamente
- [ ] `countTokens` conta tokens com precisão
- [ ] `calculateCostCents` calcula custo corretamente
- [ ] `deductCredits` decrementa `balanceCents` + registra metadata completa
- [ ] `deductCredits` permite saldo negativo até `minBalanceCents`
- [ ] `deductCredits` rejeita abaixo de `minBalanceCents`
- [ ] `addCredits` incrementa `balanceCents` + registra `exchangeRate`
- [ ] Chat: mensagem deduz custo variável (não fixo 1)
- [ ] Chat: saldo insuficiente para input → 402
- [ ] Chat: OpenAI error → zero dedução
- [ ] Webhook: credita centavos com margem configurável
- [ ] Frontend: badge exibe "créditos" (não reais)
- [ ] Frontend: evento `done` atualiza badge
- [ ] `pnpm typecheck` passa sem erros
- [ ] `pnpm lint` passa sem novos erros

---

## Definition of Done

- [ ] Migration aplicada com sucesso
- [ ] `ExchangeRate` table populável e consultável
- [ ] `tiktoken` integrado e contando tokens
- [ ] `deductCredits` e `addCredits` com novas assinaturas
- [ ] `POST /api/chat` deduz custo real baseado em tokens
- [ ] Webhook credita em centavos com margem
- [ ] Frontend exibe saldo formatado e atualiza via `X-Balance-Remaining`
- [ ] Todos os ACs validados
- [ ] Testes unitários e de integração passam
- [ ] TypeScript strict: sem `any`, sem `as unknown`
- [ ] Nenhum erro de TypeScript (`pnpm typecheck`)

---

## References

- **PRD v2.1:** [docs/prd.md](../../prd.md) — Stories 3.1, 3.2, 3.4 (atualizadas)
- **Architecture v2.1:** [docs/architecture.md](../../architecture.md) — Data Models, Core Workflows, Database Schema, Credit Functions
- **Story 3.1 (baseline):** [story-3.1-credits-schema.md](./story-3.1-credits-schema.md)
- **Story 3.2 (baseline):** [story-3.2-chat-credit-deduction.md](./story-3.2-chat-credit-deduction.md)
- **AwesomeAPI:** `https://economia.awesomeapi.com.br/json/last/USD-BRL`
- **tiktoken:** `https://github.com/openai/tiktoken`
