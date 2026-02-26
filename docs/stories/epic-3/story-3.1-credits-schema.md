# Story 3.1 — Database Schema: Credits & Transactions

**Epic:** 3 — Créditos & Pagamentos
**Story ID:** 3.1
**Priority:** High
**Estimate:** 3-5 story points
**Status:** Draft

---

## User Story

**As a** developer,
**I want** atomic credit utility functions and a zero-balance database constraint,
**so that** all credit movements are auditable, consistent, and the balance never goes negative.

---

## Context

Esta story implementa a camada de dados do sistema de créditos do SOL. O schema do banco já existe (tabela `credit_transactions`, enum `TransactionType`, campo `User.credits`) — o que está faltando são as **funções utilitárias** que encapsulam as operações de crédito com segurança transacional, e a **constraint no banco** que garante `credits >= 0` mesmo em cenários de concorrência.

**Estado atual (baseline):**
- `CreditTransaction` model: ✅ existe no schema Prisma
- `TransactionType` enum (`purchase | consumption`): ✅ existe
- `User.credits` (Int, default 0): ✅ existe
- Migration aplicada no banco: ✅ aplicada
- `deductCredits()`: ❌ não implementada
- `addCredits()`: ❌ não implementada
- CHECK constraint `credits >= 0` no banco: ❌ não existe

**Escopo desta story:** implementar apenas as funções utilitárias e a constraint — sem lógica de pagamento (Stripe) ou dedução automática no chat (Stories 3.2 e 3.3).

---

## Acceptance Criteria

### AC1: Função `addCredits(userId, amount, stripePaymentId?)`

- [ ] Implementada em `packages/db/src/credits.ts`
- [ ] Executa em **transação atômica** (`prisma.$transaction`):
  1. Incrementa `User.credits` pelo `amount` recebido
  2. Cria registro em `credit_transactions` com `type: purchase`, `amount` positivo
- [ ] `stripePaymentId` é opcional (nullable) — obrigatório apenas quando origina de pagamento Stripe
- [ ] Retorna o novo saldo do usuário
- [ ] Loga operação: `[Credits] addCredits userId=X amount=Y newBalance=Z`

**Test:** Usuário com 10 créditos → `addCredits(userId, 50)` → saldo = 60, 1 registro em `credit_transactions` com `type=purchase, amount=50`.

---

### AC2: Função `deductCredits(userId, amount)`

- [ ] Implementada em `packages/db/src/credits.ts`
- [ ] Verifica saldo ANTES de deduzir — se `user.credits < amount`, lança `InsufficientCreditsError`
- [ ] Executa em **transação atômica** (`prisma.$transaction`):
  1. Decrementa `User.credits` pelo `amount`
  2. Cria registro em `credit_transactions` com `type: consumption`, `amount` negativo (`-amount`)
- [ ] Em caso de erro (saldo insuficiente ou falha de DB), **nenhuma alteração é persistida** (rollback automático da transação)
- [ ] Retorna o novo saldo do usuário
- [ ] Loga operação: `[Credits] deductCredits userId=X amount=Y newBalance=Z`

**Test:** Usuário com 2 créditos → `deductCredits(userId, 5)` → lança `InsufficientCreditsError`, saldo permanece 2, nenhum registro criado em `credit_transactions`.

---

### AC3: `InsufficientCreditsError` custom error

- [ ] Classe `InsufficientCreditsError extends Error` definida no mesmo arquivo
- [ ] Mensagem: `"Saldo insuficiente: usuário {userId} tem {current} crédito(s), necessário {required}"`
- [ ] Exportada de `packages/db/src/credits.ts`

**Test:** Catch de `InsufficientCreditsError` é distinguível de outros erros via `instanceof`.

---

### AC4: CHECK constraint no banco (`credits >= 0`)

- [ ] Nova migration Prisma criada com SQL raw: `ALTER TABLE "User" ADD CONSTRAINT "user_credits_non_negative" CHECK (credits >= 0)`
- [ ] Constraint impede que o campo `credits` seja atualizado para valor negativo mesmo se bypassar a camada de aplicação
- [ ] Migration nomeada de forma descritiva: `add_credits_non_negative_constraint`

**Test:** Tentar `UPDATE "User" SET credits = -1 WHERE id = X` diretamente no PostgreSQL → `ERROR: new row for relation "User" violates check constraint`.

---

### AC5: Exports de `packages/db`

- [ ] `addCredits`, `deductCredits`, `InsufficientCreditsError` exportados de `packages/db/src/credits.ts`
- [ ] Re-exportados via `packages/db/src/index.ts` (`export * from './credits'`)
- [ ] Disponíveis para consumo em `apps/web` via `import { deductCredits } from '@sol/db'`

**Test:** `pnpm typecheck` passa sem erros após adicionar o import em um arquivo de teste.

---

## Technical Implementation Notes

### Arquivo: `packages/db/src/credits.ts`

```typescript
import { prisma } from './index'

export class InsufficientCreditsError extends Error {
  constructor(userId: string, current: number, required: number) {
    super(`Saldo insuficiente: usuário ${userId} tem ${current} crédito(s), necessário ${required}`)
    this.name = 'InsufficientCreditsError'
  }
}

export async function addCredits(
  userId: string,
  amount: number,
  stripePaymentId?: string,
): Promise<number> {
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    })
    await tx.creditTransaction.create({
      data: {
        userId,
        amount,           // positivo
        type: 'purchase',
        description: `Adição de ${amount} crédito(s)`,
        stripePaymentId: stripePaymentId ?? null,
      },
    })
    return user.credits
  })
  console.log(`[Credits] addCredits userId=${userId} amount=${amount} newBalance=${result}`)
  return result
}

export async function deductCredits(userId: string, amount: number): Promise<number> {
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    })
    if (!user || user.credits < amount) {
      throw new InsufficientCreditsError(userId, user?.credits ?? 0, amount)
    }
    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
      select: { credits: true },
    })
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -amount,   // negativo = consumo
        type: 'consumption',
        description: `Dedução de ${amount} crédito(s)`,
      },
    })
    return updated.credits
  })
  console.log(`[Credits] deductCredits userId=${userId} amount=${amount} newBalance=${result}`)
  return result
}
```

### Migration SQL (CHECK constraint)

```sql
-- CreateConstraint
ALTER TABLE "User" ADD CONSTRAINT "user_credits_non_negative" CHECK (credits >= 0);
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `packages/db/src/credits.ts` | CREATE | Funções `addCredits`, `deductCredits`, `InsufficientCreditsError` |
| `packages/db/src/index.ts` | MODIFY | Adicionar `export * from './credits'` |
| `packages/db/prisma/migrations/.../migration.sql` | CREATE | CHECK constraint `credits >= 0` via `pnpm db:migrate` |

---

## Dependencies

- **Blocked by:** Story 2.4 (infraestrutura de créditos inline) ✅ Done
- **Blocks:** Story 3.2 (dedução automática no chat usa `deductCredits`)
- **Blocks:** Story 3.4 (webhook Stripe usa `addCredits`)
- **Schema:** `CreditTransaction`, `TransactionType`, `User.credits` — todos existentes ✅

---

## Testing Checklist

- [ ] `addCredits` persiste `User.credits` incrementado + registro `credit_transactions`
- [ ] `deductCredits` com saldo suficiente: persiste decremento + registro negativo
- [ ] `deductCredits` com saldo insuficiente: lança `InsufficientCreditsError`, rollback total
- [ ] `deductCredits` com saldo exato (amount === credits): deduz para zero sem erro
- [ ] CHECK constraint no banco rejeita `credits < 0`
- [ ] `pnpm typecheck` passa sem erros
- [ ] `pnpm db:migrate` aplica migration sem erros

---

## Definition of Done

- [ ] `credits.ts` implementado com funções e erro customizado
- [ ] `index.ts` exporta funções de créditos
- [ ] Migration com CHECK constraint aplicada
- [ ] Todos os ACs validados manualmente (via Prisma Studio + logs)
- [ ] TypeScript strict: sem `any`, sem `as unknown`
- [ ] Nenhum erro de TypeScript (`pnpm typecheck`)

---

## References

- **PRD:** [docs/prd.md](../../prd.md) — Story 3.1, Epic 3
- **Schema atual:** [packages/db/prisma/schema.prisma](../../../packages/db/prisma/schema.prisma)
- **Padrão existente:** [packages/db/src/conversations.ts](../../../packages/db/src/conversations.ts)
- **Story 3.2:** dedução no chat (consumirá `deductCredits`)
- **Story 3.4:** webhook Stripe (consumirá `addCredits`)
