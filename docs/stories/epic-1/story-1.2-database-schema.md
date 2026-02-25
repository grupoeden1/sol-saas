# Story 1.2 — Database Schema: Users & Sessions

**Epic:** 1 — Foundation & Auth
**Story ID:** 1.2
**Priority:** High
**Estimate:** 3-5 story points
**Status:** Ready for Dev

---

## User Story

**As a** developer,
**I want** the core database schema for users,
**so that** authentication can be implemented against a properly structured database.

---

## Context

Esta story estabelece o foundation layer de persistência do SOL. O schema deve suportar autenticação via NextAuth.js v5 (sessões JWT armazenadas no banco), gestão de créditos por usuário, e preparar as relações para os epics seguintes (conversas e transações de crédito). Toda a lógica de dados deve estar centralizada no pacote `packages/db` para garantir reusabilidade e type safety end-to-end.

---

## Acceptance Criteria

### AC1: Tabela `users` Criada com Campos Obrigatórios

- [ ] Migration Prisma cria tabela `users` com os seguintes campos:
  - `id` (String, cuid, PK)
  - `email` (String, unique, indexed)
  - `passwordHash` (String, para bcrypt com min 10 rounds)
  - `credits` (Int, default 0, >= 0)
  - `createdAt` (DateTime, default now)
  - `updatedAt` (DateTime, auto-atualizado)
- [ ] Constraint garantindo `credits >= 0` implementado via migration SQL customizada
- [ ] Índice único em `email` para performance em queries de autenticação
- [ ] Relações definidas: `sessions[]`, `conversations[]`, `transactions[]`

**Test:** Execute `prisma migrate dev` sem erros. Verifique schema gerado em PostgreSQL via `psql` ou cliente DB.

---

### AC2: Tabela `sessions` Compatível com NextAuth.js v5

- [ ] Migration Prisma cria tabela `sessions` com os campos:
  - `id` (String, cuid, PK)
  - `sessionToken` (String, unique, indexed)
  - `userId` (String, FK → users.id com onDelete Cascade)
  - `expires` (DateTime)
- [ ] Relação `user` corretamente tipada no modelo Prisma
- [ ] Índice em `userId` para queries de sessões por usuário
- [ ] Schema compatível com adaptador `@auth/prisma-adapter` do NextAuth.js v5

**Test:** Execute `prisma migrate dev`. Valide que `sessionToken` possui constraint UNIQUE no banco.

---

### AC3: Prisma Client Tipado Disponível em `packages/db`

- [ ] Comando `pnpm run db:generate` (alias para `prisma generate`) executa sem erros
- [ ] Prisma Client exportado em `packages/db/src/index.ts` como singleton:
  ```typescript
  export * from '@prisma/client';
  export { prisma } from './client';
  ```
- [ ] Tipos TypeScript gerados acessíveis em `apps/web` via import:
  ```typescript
  import { prisma, User, Session } from '@repo/db';
  ```
- [ ] Nenhum erro de tipagem em modo `strict` do TypeScript

**Test:** Execute `pnpm run typecheck` no workspace root. Importe `User` type em arquivo de teste em `apps/web`.

---

### AC4: Seed Script Cria Usuário de Desenvolvimento

- [ ] Script `packages/db/prisma/seed.ts` criado com usuário de teste:
  - Email: `dev@sol.local`
  - Senha (plain): `dev12345` → hash via `bcrypt` com 10 rounds
  - Créditos iniciais: `50`
- [ ] Seed executável via `pnpm run db:seed` (configurado em `package.json`)
- [ ] Seed é idempotente: rodar múltiplas vezes não cria usuários duplicados (verifica email antes de inserir)
- [ ] Console log confirma criação: `✓ Dev user created: dev@sol.local`

**Test:** Execute `pnpm run db:seed` duas vezes. Na segunda execução, deve exibir mensagem de que usuário já existe. Valide no banco que existe apenas 1 registro.

---

### AC5: Relações Prisma Preparadas para Epics Futuros

- [ ] Modelos `Conversation`, `Message`, `CreditTransaction` definidos no schema (podem estar vazios de dados, mas relações devem existir)
- [ ] Relação `User.conversations` → `Conversation[]` definida
- [ ] Relação `User.transactions` → `CreditTransaction[]` definida
- [ ] Todos os campos `userId` possuem `onDelete: Cascade` para integridade referencial
- [ ] Query de teste funcionando:
  ```typescript
  const userWithRelations = await prisma.user.findUnique({
    where: { email: 'dev@sol.local' },
    include: { sessions: true, conversations: true, transactions: true }
  });
  ```

**Test:** Execute query acima em script de teste. Deve retornar objeto sem erros de tipo.

---

## Technical Implementation Notes

### Migration Strategy

1. **Arquivo de migration:** `packages/db/prisma/migrations/XXXXXX_init_users_sessions/migration.sql`
2. **CHECK constraint manual para créditos:**
   ```sql
   ALTER TABLE "User" ADD CONSTRAINT "User_credits_check" CHECK (credits >= 0);
   ```
3. **Ordem de criação:**
   - Criar tabela `User` primeiro
   - Criar tabela `Session` com FK para `User`
   - Aplicar constraints customizados

### Prisma Client Singleton Pattern

**Arquivo:** `packages/db/src/client.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Rationale:** Evita múltiplas instâncias do Prisma Client em desenvolvimento (hot reload do Next.js).

### Seed Script Structure

**Arquivo:** `packages/db/prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const devEmail = 'dev@sol.local';

  const existing = await prisma.user.findUnique({
    where: { email: devEmail },
  });

  if (existing) {
    console.log('✓ Dev user already exists');
    return;
  }

  const passwordHash = await bcrypt.hash('dev12345', 10);

  await prisma.user.create({
    data: {
      email: devEmail,
      passwordHash,
      credits: 50,
    },
  });

  console.log('✓ Dev user created: dev@sol.local');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## Dependencies

- **Blocked by:** Story 1.1 (Infraestrutura e Docker devem estar funcionais)
- **Blocks:** Story 1.3 (Autenticação depende deste schema)

---

## Testing Checklist

- [ ] `pnpm run db:migrate` completa sem erros
- [ ] `pnpm run db:generate` gera tipos sem warnings
- [ ] `pnpm run db:seed` cria usuário de dev idempotente
- [ ] `pnpm run typecheck` passa em todos os workspaces
- [ ] Query manual via `psql` confirma constraint `credits >= 0`
- [ ] Schema visualizado em Prisma Studio (`npx prisma studio`) exibe tabelas corretamente

---

## Definition of Done

- [x] Schema Prisma commitado em `packages/db/prisma/schema.prisma`
- [x] Migration SQL gerada e aplicada ao banco de desenvolvimento
- [x] Prisma Client exportado e acessível em `apps/web`
- [x] Seed script funcional e documentado no README
- [ ] Todos os ACs validados com testes manuais ou scripts
- [ ] Code review aprovado pelo @architect ou @lead-dev
- [ ] Documentação atualizada em `docs/architecture.md` (se schema divergir do planejado)

---

## References

- **PRD:** [docs/prd.md](../../prd.md) — Story 1.2, Epic 1
- **Architecture:** [docs/architecture.md](../../architecture.md) — Database Schema section
- **NextAuth.js v5 Schema:** https://authjs.dev/getting-started/adapters/prisma
- **Prisma Best Practices:** https://www.prisma.io/docs/guides/performance-and-optimization/connection-management

---

## Notes for Developers

⚠️ **Importante:** Esta story está **praticamente completa** — o schema já foi implementado no commit inicial. O trabalho restante consiste em:

1. Validar que todos os ACs estão sendo atendidos
2. Criar e executar o seed script
3. Adicionar o CHECK constraint manual para `credits >= 0` via migration SQL
4. Testar a exportação do Prisma Client em `apps/web`
5. Documentar o processo de migration no README principal

**Próxima Story:** 1.3 — Authentication: Register & Login
