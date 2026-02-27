import { PrismaClient } from '@prisma/client'

// Singleton pattern para Prisma Client
// Previne múltiplas instâncias em desenvolvimento (hot reload)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export * from '@prisma/client'
export * from './conversations'
export * from './credits'
export * from './exchange-rate'
// token-counter re-export removed from barrel — tiktoken uses WASM and cannot
// be bundled by webpack for client components. Import directly:
//   import { countTokens, ... } from '@sol/db/token-counter'
