import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma, ReferralStatus } from '@sol/db'
import { maskEmail } from '@sol/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20))
  const statusFilter = searchParams.get('status')

  // Build where clause
  const where: { status?: ReferralStatus } = {}
  if (
    statusFilter &&
    ['PENDING', 'CREDITED', 'EXPIRED'].includes(statusFilter)
  ) {
    where.status = statusFilter as ReferralStatus
  }

  const [total, rewards] = await Promise.all([
    prisma.referralReward.count({ where }),
    prisma.referralReward.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        referrer: { select: { email: true } },
        referred: { select: { email: true } },
      },
    }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  const items = rewards.map((r) => ({
    id: r.id,
    referrerEmail: r.referrer.email,
    referredEmail: maskEmail(r.referred.email),
    status: r.status,
    referrerCredits: r.referrerCredits,
    referredCredits: r.referredCredits,
    createdAt: r.createdAt.toISOString(),
  }))

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages,
  })
}
