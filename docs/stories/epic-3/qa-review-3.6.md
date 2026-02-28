# QA Review — Story 3.6: Refatoração do Sistema de Precificação

**Reviewer:** @qa
**Date:** 2026-02-27
**Story:** 3.6 — Refatoração do Sistema de Precificação
**Scope:** Delta refactoring (PRD v4.0 / Architecture v3.0)

---

## Gate Decision: PASS (com 1 observação)

**Veredicto:** A implementação está correta e alinhada com a spec. Todos os 14 pontos de validação foram analisados. Nenhum blocker encontrado.

---

## P0 — Integridade Financeira

### 1. Saldo NUNCA negativo
**Veredicto: PASS**

- `deductCredits` usa UPDATE atômico com `WHERE "balanceCents" - ${costCents} >= 0` ([credits.ts:97](packages/db/src/credits.ts#L97))
- Se UPDATE não afeta nenhuma row, lança `InsufficientBalanceError` ([credits.ts:101-112](packages/db/src/credits.ts#L101-L112))
- Campo `minBalanceCents` completamente removido do schema, do código e do banco
- Constraint antiga `user_balance_above_min` removida via migration
- Grep confirma zero referências a `minBalanceCents` em .ts/.tsx

### 2. Gate correto
**Veredicto: PASS**

- `estimateMaxCost` chama `calculateCostCents(inputTokens, MAX_OUTPUT_TOKENS=8192, model, exchangeRate)` ([token-counter.ts:120-125](packages/db/src/token-counter.ts#L120-L125))
- Fórmula: `inputTokens × inputPrice/1M + 8192 × outputPrice/1M` → USD → `Math.ceil(costUsd × exchangeRate × 100)` → `Math.max(result, MIN_COST_CENTS=100)`
- `Math.ceil` usado corretamente — arredonda para cima, protege contra centavos fracionários ([token-counter.ts:103](packages/db/src/token-counter.ts#L103))
- Gate check: `user.balanceCents < maxCostCents` → 402 ([chat/route.ts:139](apps/web/src/app/api/chat/route.ts#L139))
- `max_tokens: MAX_OUTPUT_TOKENS` na chamada OpenAI ([chat/route.ts:156](apps/web/src/app/api/chat/route.ts#L156)) — alinhado com a estimativa do gate

### 3. Dedução real vs máxima
**Veredicto: PASS**

- Após streaming, `outputTokens = countRawTokens(fullResponse, model)` conta tokens reais ([chat/route.ts:184](apps/web/src/app/api/chat/route.ts#L184))
- `calculateRealCost(inputTokens, outputTokens, model, exchangeRate)` calcula custo real ([chat/route.ts:185](apps/web/src/app/api/chat/route.ts#L185))
- `deductCredits(user.id, realCost.costCents, ...)` deduz custo real, não estimado ([chat/route.ts:191](apps/web/src/app/api/chat/route.ts#L191))
- Custo real será sempre <= custo máximo estimado (outputTokens reais < MAX_OUTPUT_TOKENS=8192)

### 4. Race condition
**Veredicto: PASS**

- UPDATE atômico com `WHERE ... AND "balanceCents" - ${costCents} >= 0` avalia condição no momento do write ([credits.ts:92-98](packages/db/src/credits.ts#L92-L98))
- Executado dentro de `$transaction` — isolamento garantido pelo PostgreSQL READ COMMITTED
- Se duas deduções simultâneas: apenas uma tem sucesso, a outra recebe row count 0 → `InsufficientBalanceError`
- Race condition pós-stream (saldo insuficiente após resposta entregue): catch registra audit trail com `amount: 0` e `[Falha]` no description ([chat/route.ts:201-228](apps/web/src/app/api/chat/route.ts#L201-L228))

---

## P1 — Cotação e Fallbacks

### 5. Cotação lazy
**Veredicto: PASS**

- `ensureTodayRate` verifica banco primeiro (`findUnique` por currency+date) ([exchange-rate.ts:134-136](packages/db/src/exchange-rate.ts#L134-L136))
- Se não existe → `fetchExchangeRateFromApi` + `updateExchangeRate` (upsert) ([exchange-rate.ts:143-147](packages/db/src/exchange-rate.ts#L143-L147))
- Segunda chamada usa banco sem chamar API (findUnique retorna resultado)
- `@@unique([currency, date])` garante uma cotação por par por dia

### 6. Fallback chain
**Veredicto: PASS**

- Nível 1: cotação de hoje → Nível 2: última cotação (`ORDER BY date DESC`) → Nível 3: `FALLBACK_USD_BRL_RATE` do .env → Hardcoded `6.00` ([exchange-rate.ts:31-61](packages/db/src/exchange-rate.ts#L31-L61))
- Se API falha, `ensureTodayRate` chama `getExchangeRate` que percorre os 3 níveis ([exchange-rate.ts:148-152](packages/db/src/exchange-rate.ts#L148-L152))
- Validação: `rate.lte(0)` rejeita valores inválidos ([exchange-rate.ts:56](packages/db/src/exchange-rate.ts#L56))
- Se `.env` tem valor inválido: console.error + usa `6.00` ([exchange-rate.ts:58-61](packages/db/src/exchange-rate.ts#L58-L61))
- Sistema NUNCA crasheia por falta de cotação

### 7. Cotação na transação
**Veredicto: PASS**

- `deductCredits` recebe `metadata.exchangeRate` e grava em CreditTransaction ([credits.ts:121](packages/db/src/credits.ts#L121))
- `addCredits` recebe `exchangeRate?` e grava ([credits.ts:59](packages/db/src/credits.ts#L59))
- Webhook passa `exchangeRate` de `getExchangeRate('USD-BRL')` ([webhook/route.ts:58-60](apps/web/src/app/api/webhooks/stripe/route.ts#L58-L60))
- Chat route passa `exchangeRate` de `ensureTodayRate('USD-BRL')` ([chat/route.ts:193](apps/web/src/app/api/chat/route.ts#L193))

**Observação (não blocker):** `addCredits` tem `exchangeRate` como opcional (`?`). O webhook sempre passa, mas a assinatura permite chamadas sem. Para máxima auditabilidade, considerar tornar obrigatório em futura iteração.

---

## P2 — Webhook e Compras

### 8. Webhook idempotência
**Veredicto: PASS**

- `stripePaymentId String? @unique` no schema ([schema.prisma:80](packages/db/prisma/schema.prisma#L80))
- Catch para `PrismaClientKnownRequestError` com `code === 'P2002'` retorna `{ received: true, duplicate: true }` ([webhook/route.ts:66-68](apps/web/src/app/api/webhooks/stripe/route.ts#L66-L68))
- Webhook duplicado não duplica créditos

### 9. CREDIT_PERCENTAGE
**Veredicto: PASS**

- `parseFloat(process.env.CREDIT_PERCENTAGE ?? '0.40')` ([webhook/route.ts:43](apps/web/src/app/api/webhooks/stripe/route.ts#L43))
- NaN guard: `isNaN(creditPercentage) ? 0.40 : creditPercentage` ([webhook/route.ts:44](apps/web/src/app/api/webhooks/stripe/route.ts#L44))
- `Math.floor` para arredondar para baixo (favorece o negócio) ([webhook/route.ts:44](apps/web/src/app/api/webhooks/stripe/route.ts#L44))
- Cálculo: R$29,90 (2990 centavos Stripe) × 0.40 = 1196 centavos = 11 créditos visíveis
- `.env.example` atualizado de `CREDIT_MARGIN_PERCENT="40"` para `CREDIT_PERCENTAGE="0.40"`

---

## P3 — Frontend e UX

### 10. Badge
**Veredicto: PASS**

- Header `X-Balance-Cents` lido no chat page ([chat/page.tsx:352](apps/web/src/app/chat/page.tsx#L352))
- `parseInt(balanceHeader, 10)` converte para número ([chat/page.tsx:354](apps/web/src/app/chat/page.tsx#L354))
- `updateCredits(parsed)` atualiza o CreditsProvider ([chat/page.tsx:356](apps/web/src/app/chat/page.tsx#L356))
- CreditsBadge consome `formatted` do contexto (pré-formatado por `formatBalance`)
- `formatBalance`: 0 → "0 créditos", <100 → "< 1 crédito", >=100 → "X crédito(s)"

### 11. Prompt inline
**Veredicto: PASS**

- 402 retorna `{ error: 'insufficient_credits', required, available }` ([chat/route.ts:140-147](apps/web/src/app/api/chat/route.ts#L140-L147))
- Frontend trata 402: remove mensagem temporária, `setNoCredits(true)`, `updateCredits(0)` ([chat/page.tsx:340-345](apps/web/src/app/chat/page.tsx#L340-L345))
- Done event: `data.balanceCents` atualiza badge e `setNoCredits` ([chat/page.tsx:410-412](apps/web/src/app/chat/page.tsx#L410-L412))

### 12. Nenhuma regressão
**Veredicto: PASS**

- Auth check preservado ([chat/route.ts:36-38](apps/web/src/app/api/chat/route.ts#L36-L38))
- Streaming SSE intacto (ReadableStream + for-await) ([chat/route.ts:163-250](apps/web/src/app/api/chat/route.ts#L163-L250))
- Conversation management inalterado ([chat/route.ts:64-85](apps/web/src/app/api/chat/route.ts#L64-L85))
- Model selection inalterada ([chat/route.ts:103-107](apps/web/src/app/api/chat/route.ts#L103-L107))
- Message persistence inalterada
- OpenAI error handling inalterado ([chat/route.ts:240-248](apps/web/src/app/api/chat/route.ts#L240-L248))
- TypeScript strict: zero errors (db + web)
- Lint: zero novos erros

---

## P4 — Auditoria

### 13. Campos de auditoria
**Veredicto: PASS**

- CreditTransaction de consumo registra: `exchangeRate`, `inputTokens`, `outputTokens`, `modelUsed`, `costUsd`, `maxOutputTokens` ([credits.ts:115-127](packages/db/src/credits.ts#L115-L127))
- `maxOutputTokens: MAX_OUTPUT_TOKENS` (8192) passado na metadata ([chat/route.ts:198](apps/web/src/app/api/chat/route.ts#L198))
- Schema confirma todos os campos como nullable (`Int?`, `Decimal?`, `String?`) para retrocompatibilidade com registros antigos
- Audit trail de falha também registra `maxOutputTokens` ([chat/route.ts:223](apps/web/src/app/api/chat/route.ts#L223))

### 14. Precisão
**Veredicto: PASS**

- `calculateCostCents` usa `Prisma.Decimal` para aritmética de precisão ([token-counter.ts:99-101](packages/db/src/token-counter.ts#L99-L101))
- `Math.ceil` garante arredondamento para cima — diferença máxima de 1 centavo ([token-counter.ts:103](packages/db/src/token-counter.ts#L103))
- `costUsd` armazenado como `Decimal` no banco (precisão preservada)
- `amount` armazenado como `Int` (centavos inteiros, sem frações)
- Consistência: `amount = -costCents` onde `costCents = Math.max(Math.ceil(costUsd × rate × 100), 100)`

---

## Referência cruzada: Grep de patterns antigos

| Pattern | .ts/.tsx results | Status |
|---------|-----------------|--------|
| `minBalanceCents` | 0 | CLEAN |
| `CREDIT_MARGIN_PERCENT` | 0 | CLEAN |
| `X-Balance-Remaining` | 0 | CLEAN |
| `balanceRemaining` | 0 | CLEAN |
| `MAX_OUTPUT_TOKENS.*=.*1000` | 0 | CLEAN |

---

## Migration

| Item | Status |
|------|--------|
| `minBalanceCents` removido do schema | PASS |
| `maxOutputTokens Int?` adicionado | PASS |
| CHECK constraint `user_balance_above_min` removida | PASS |
| `prisma validate` | PASS |
| `prisma migrate status` = up to date | PASS |
| `prisma generate` | PASS |

---

## Observação (não blocker)

**OBS-1: `addCredits` exchangeRate é opcional**
- Assinatura: `addCredits(userId, amountCents, stripePaymentId, exchangeRate?: Prisma.Decimal)`
- O webhook sempre passa `exchangeRate`, mas a assinatura permite omissão
- Impacto: Se algum futuro caller omitir, CreditTransaction ficará com `exchangeRate: null`
- Recomendação: Considerar tornar obrigatório em futura sprint. Não é blocker agora.

---

## Checklist de ACs

| AC | Descrição | Veredicto |
|----|-----------|-----------|
| AC1 | Gate pré-chamada com custo máximo (input + 8192 output) | PASS |
| AC2 | Bloqueio 402 com `{ error, required, available }` | PASS |
| AC3 | Saldo NUNCA negativo (WHERE >= 0, minBalanceCents removido) | PASS |
| AC4 | Dedução de custo real após streaming | PASS |
| AC5 | Auditoria completa por transação (incl. maxOutputTokens) | PASS |
| AC6 | Cotação lazy com fallback 4 níveis | PASS |
| AC7 | Webhook CREDIT_PERCENTAGE (parseFloat, NaN guard) | PASS |
| AC8 | Frontend exibe créditos (formatBalance, X-Balance-Cents) | PASS |
| AC9 | OpenAI max_tokens: 8192, tiktoken cl100k_base | PASS |
| AC10 | Nenhuma regressão | PASS |
| AC11 | TypeScript 0 errors, lint 0 novos erros | PASS |

---

**Resultado final: 14/14 PASS, 0 FAIL, 1 observação**
