import { prisma } from './index'

// Threshold abaixo do qual o saldo é considerado "baixo" (R$ 1,00)
const MIN_COST_CENTS = 100

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
  tokensThisMonth: number
  tokensLastMonth: number
  totalMessages: number
}

export interface UserListItem {
  id: string
  email: string
  role: string
  balanceCents: number
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
  totalOpenAICostBRL: number
  totalAdjustmentsCents: number
}

export interface ExchangeMetrics {
  lastRateBRL: number
  lastRateDate: Date | null
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
      // Usuários com mensagens enviadas nos últimos 7 dias
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
      // Usuários com saldo abaixo do mínimo usável
      prisma.user.count({
        where: { balanceCents: { lt: MIN_COST_CENTS } },
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

  return {
    totalTokens:
      (tokensAll._sum.inputTokens ?? 0) + (tokensAll._sum.outputTokens ?? 0),
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
        balanceCents: true,
        createdAt: true,
      },
    }),
  ])

  // Contar mensagens de usuário por conversa (rawQuery para JOIN eficiente)
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
    balanceCents: u.balanceCents,
    totalMessages: msgMap.get(u.id) ?? 0,
    createdAt: u.createdAt,
  }))

  return { users, total }
}

// ─── Métricas financeiras ─────────────────────────────────────────────────────

export async function getFinancialMetrics(): Promise<FinancialMetrics> {
  const { firstDayThisMonth, firstDayLastMonth } = getMonthBoundaries()

  // grossAmountCents registra o valor bruto pago no Stripe
  const [revenueAll, revenueThisMonth, revenueLastMonth, adjustments, openAICostRaw] =
    await Promise.all([
      prisma.creditTransaction.aggregate({
        where: { type: 'purchase' },
        _sum: { grossAmountCents: true },
      }),
      prisma.creditTransaction.aggregate({
        where: { type: 'purchase', createdAt: { gte: firstDayThisMonth } },
        _sum: { grossAmountCents: true },
      }),
      prisma.creditTransaction.aggregate({
        where: {
          type: 'purchase',
          createdAt: { gte: firstDayLastMonth, lt: firstDayThisMonth },
        },
        _sum: { grossAmountCents: true },
      }),
      prisma.creditTransaction.aggregate({
        where: { type: 'adjustment' },
        _sum: { amount: true },
      }),
      // Prisma não suporta multiplicação de campos em aggregate → $queryRaw
      prisma.$queryRaw<Array<{ total_cost_brl: number }>>`
        SELECT COALESCE(
          SUM(CAST("costUsd" AS FLOAT) * CAST("exchangeRate" AS FLOAT)),
          0
        ) AS total_cost_brl
        FROM "CreditTransaction"
        WHERE "type" = 'consumption'
          AND "costUsd" IS NOT NULL
          AND "exchangeRate" IS NOT NULL
      `,
    ])

  return {
    totalRevenueCents: revenueAll._sum.grossAmountCents ?? 0,
    revenueThisMonthCents: revenueThisMonth._sum.grossAmountCents ?? 0,
    revenueLastMonthCents: revenueLastMonth._sum.grossAmountCents ?? 0,
    totalOpenAICostBRL: openAICostRaw[0]?.total_cost_brl ?? 0,
    totalAdjustmentsCents: adjustments._sum.amount ?? 0,
  }
}

// ─── Métricas de câmbio ──────────────────────────────────────────────────────

export async function getExchangeMetrics(): Promise<ExchangeMetrics> {
  const latest = await prisma.exchangeRate.findFirst({
    where: { currency: 'USD-BRL' },
    orderBy: { date: 'desc' },
    select: { rate: true, date: true },
  })

  return {
    lastRateBRL: latest ? Number(latest.rate) : 0,
    lastRateDate: latest?.date ?? null,
  }
}
