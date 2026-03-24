import { prisma } from './index'

// Threshold abaixo do qual o saldo é considerado "baixo" (1 crédito)
const LOW_CREDITS_THRESHOLD = 1

// ─── Tipos de retorno ────────────────────────────────────────────────────────

export interface UserMetrics {
  totalUsers: number
  newUsersThisMonth: number
  newUsersLastMonth: number
  activeUsers7d: number
  lowBalanceUsers: number
}

export interface UsageMetrics {
  totalTokens: number
  totalInputTokens: number
  totalOutputTokens: number
  tokensThisMonth: number
  tokensLastMonth: number
  totalMessages: number
}

export interface UserListItem {
  id: string
  email: string
  role: string
  credits: number
  totalMessages: number
  createdAt: Date
}

export interface UserListResult {
  users: UserListItem[]
  total: number
}

export interface FinancialMetrics {
  totalRevenueCents: number
  revenueThisMonthCents: number
  revenueLastMonthCents: number
  totalCreditsConsumed: number
  totalAdjustmentCredits: number
  estimatedApiCostUsd: number
}

// ─── Helpers de data ─────────────────────────────────────────────────────────

function getMonthBoundaries() {
  const now = new Date()
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { now, firstDayThisMonth, firstDayLastMonth }
}

// ─── Métricas de usuários ────────────────────────────────────────────────────

export async function getUserMetrics(): Promise<UserMetrics> {
  const { firstDayThisMonth, firstDayLastMonth, now } = getMonthBoundaries()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [totalUsers, newUsersThisMonth, newUsersLastMonth, activeUsers7d, lowBalanceUsers] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: firstDayThisMonth } } }),
      prisma.user.count({
        where: { createdAt: { gte: firstDayLastMonth, lt: firstDayThisMonth } },
      }),
      prisma.user.count({
        where: {
          conversations: {
            some: {
              messages: {
                some: { role: 'user', createdAt: { gte: sevenDaysAgo } },
              },
            },
          },
        },
      }),
      prisma.user.count({
        where: { credits: { lt: LOW_CREDITS_THRESHOLD } },
      }),
    ])

  return {
    totalUsers,
    newUsersThisMonth,
    newUsersLastMonth,
    activeUsers7d,
    lowBalanceUsers,
  }
}

// ─── Métricas de uso ─────────────────────────────────────────────────────────

export async function getUsageMetrics(): Promise<UsageMetrics> {
  const { firstDayThisMonth, firstDayLastMonth } = getMonthBoundaries()

  const [tokensAll, tokensThisMonth, tokensLastMonth, totalMessages] = await Promise.all([
    prisma.creditTransaction.aggregate({
      where: { type: 'consumption' },
      _sum: { inputTokens: true, outputTokens: true },
    }),
    prisma.creditTransaction.aggregate({
      where: { type: 'consumption', createdAt: { gte: firstDayThisMonth } },
      _sum: { inputTokens: true, outputTokens: true },
    }),
    prisma.creditTransaction.aggregate({
      where: { type: 'consumption', createdAt: { gte: firstDayLastMonth, lt: firstDayThisMonth } },
      _sum: { inputTokens: true, outputTokens: true },
    }),
    prisma.message.count({ where: { role: 'user' } }),
  ])

  const totalInput = tokensAll._sum.inputTokens ?? 0
  const totalOutput = tokensAll._sum.outputTokens ?? 0

  return {
    totalTokens: totalInput + totalOutput,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    tokensThisMonth:
      (tokensThisMonth._sum.inputTokens ?? 0) + (tokensThisMonth._sum.outputTokens ?? 0),
    tokensLastMonth:
      (tokensLastMonth._sum.inputTokens ?? 0) + (tokensLastMonth._sum.outputTokens ?? 0),
    totalMessages,
  }
}

// ─── Lista de usuários paginada ──────────────────────────────────────────────

export async function getUsersList(
  page: number,
  pageSize: number,
): Promise<UserListResult> {
  const [total, usersPage] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      take: pageSize,
      skip: (page - 1) * pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        credits: true,
        createdAt: true,
      },
    }),
  ])

  const userIds = usersPage.map((u) => u.id)

  type MsgCountRow = { userId: string; msgCount: bigint }
  const msgCounts: MsgCountRow[] =
    userIds.length > 0
      ? await prisma.$queryRawUnsafe<MsgCountRow[]>(
          `SELECT c."userId", COUNT(m.id)::bigint AS "msgCount"
           FROM "Message" m
           JOIN "Conversation" c ON m."conversationId" = c.id
           WHERE m.role = 'user'
             AND c."userId" = ANY($1::text[])
           GROUP BY c."userId"`,
          userIds,
        )
      : []

  const msgMap = new Map<string, number>(
    msgCounts.map((r) => [r.userId, Number(r.msgCount)]),
  )

  const users: UserListItem[] = usersPage.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    credits: u.credits,
    totalMessages: msgMap.get(u.id) ?? 0,
    createdAt: u.createdAt,
  }))

  return { users, total }
}

// ─── Métricas financeiras ─────────────────────────────────────────────────────

// API pricing (USD per 1M tokens) — updated 2026-03
export const API_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
  // OpenAI
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini-2024-07-18': { input: 0.15, output: 0.60 },
  'gpt-4o-2024-11-20': { input: 2.50, output: 10.00 },
}
export const DEFAULT_MODEL_PRICING = API_PRICING['claude-haiku-4-5-20251001']!

export async function getFinancialMetrics(): Promise<FinancialMetrics> {
  const { firstDayThisMonth, firstDayLastMonth } = getMonthBoundaries()

  // Revenue: JOIN purchases with credit_packages to get actual priceBrl
  type RevenueRow = { total_cents: bigint | null }
  const [revenueAllRows, revenueThisMonthRows, revenueLastMonthRows] = await Promise.all([
    prisma.$queryRaw<RevenueRow[]>`
      SELECT COALESCE(SUM(cp."priceBrl"), 0)::bigint AS total_cents
      FROM "CreditTransaction" ct
      JOIN "CreditPackage" cp ON ct.amount = cp.credits
      WHERE ct.type = 'purchase' AND ct."stripePaymentId" IS NOT NULL`,
    prisma.$queryRaw<RevenueRow[]>`
      SELECT COALESCE(SUM(cp."priceBrl"), 0)::bigint AS total_cents
      FROM "CreditTransaction" ct
      JOIN "CreditPackage" cp ON ct.amount = cp.credits
      WHERE ct.type = 'purchase' AND ct."stripePaymentId" IS NOT NULL
        AND ct."createdAt" >= ${firstDayThisMonth}`,
    prisma.$queryRaw<RevenueRow[]>`
      SELECT COALESCE(SUM(cp."priceBrl"), 0)::bigint AS total_cents
      FROM "CreditTransaction" ct
      JOIN "CreditPackage" cp ON ct.amount = cp.credits
      WHERE ct.type = 'purchase' AND ct."stripePaymentId" IS NOT NULL
        AND ct."createdAt" >= ${firstDayLastMonth} AND ct."createdAt" < ${firstDayThisMonth}`,
  ])

  // API cost estimation: group consumption tokens by model
  type CostRow = { modelUsed: string | null; total_input: bigint; total_output: bigint }
  const costRows = await prisma.$queryRaw<CostRow[]>`
    SELECT "modelUsed",
           COALESCE(SUM("inputTokens"), 0)::bigint AS total_input,
           COALESCE(SUM("outputTokens"), 0)::bigint AS total_output
    FROM "CreditTransaction"
    WHERE type = 'consumption'
    GROUP BY "modelUsed"`

  let estimatedApiCostUsd = 0
  for (const row of costRows) {
    const pricing = API_PRICING[row.modelUsed ?? ''] ?? DEFAULT_MODEL_PRICING
    const inputCost = (Number(row.total_input) / 1_000_000) * pricing.input
    const outputCost = (Number(row.total_output) / 1_000_000) * pricing.output
    estimatedApiCostUsd += inputCost + outputCost
  }

  const [consumptionAll, adjustmentsAll] = await Promise.all([
    prisma.creditTransaction.aggregate({
      where: { type: 'consumption' },
      _sum: { amount: true },
    }),
    prisma.creditTransaction.aggregate({
      where: { type: 'adjustment' },
      _sum: { amount: true },
    }),
  ])

  return {
    totalRevenueCents: Number(revenueAllRows[0]?.total_cents ?? 0),
    revenueThisMonthCents: Number(revenueThisMonthRows[0]?.total_cents ?? 0),
    revenueLastMonthCents: Number(revenueLastMonthRows[0]?.total_cents ?? 0),
    totalCreditsConsumed: Math.abs(consumptionAll._sum.amount ?? 0),
    totalAdjustmentCredits: adjustmentsAll._sum.amount ?? 0,
    estimatedApiCostUsd: Math.round(estimatedApiCostUsd * 100) / 100,
  }
}
