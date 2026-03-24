import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'

// GET /api/admin/referral — return config + metrics
export async function GET() {
  const session = await auth()
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [configRows, totalRewards, creditedRewards, topReferrers] =
    await Promise.all([
      prisma.pricingConfig.findMany({
        where: {
          key: {
            in: [
              'REFERRAL_ENABLED',
              'REFERRAL_REFERRER_CREDITS',
              'REFERRAL_REFERRED_CREDITS',
              'REFERRAL_MAX_PER_USER',
            ],
          },
        },
      }),
      prisma.referralReward.count(),
      prisma.referralReward.findMany({
        where: { status: 'CREDITED' },
        select: { referrerCredits: true, referredCredits: true },
      }),
      prisma.referralReward.groupBy({
        by: ['referrerId'],
        where: { status: 'CREDITED' },
        _count: { referrerId: true },
        _sum: { referrerCredits: true },
        orderBy: { _count: { referrerId: 'desc' } },
        take: 5,
      }),
    ])

  const configMap = new Map(configRows.map((c) => [c.key, c.value]))

  const config = {
    REFERRAL_ENABLED: configMap.get('REFERRAL_ENABLED') ?? 0,
    REFERRAL_REFERRER_CREDITS: configMap.get('REFERRAL_REFERRER_CREDITS') ?? 100,
    REFERRAL_REFERRED_CREDITS: configMap.get('REFERRAL_REFERRED_CREDITS') ?? 50,
    REFERRAL_MAX_PER_USER: configMap.get('REFERRAL_MAX_PER_USER') ?? 20,
  }

  const totalCredited = creditedRewards.length
  const totalCreditsDistributed = creditedRewards.reduce(
    (sum, r) => sum + r.referrerCredits + r.referredCredits,
    0,
  )
  const conversionRate =
    totalRewards > 0
      ? Math.round((totalCredited / totalRewards) * 10000) / 100
      : 0

  // Fetch emails for top referrers
  const topReferrerIds = topReferrers.map((t) => t.referrerId)
  const topReferrerUsers =
    topReferrerIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: topReferrerIds } },
          select: { id: true, email: true },
        })
      : []

  const userMap = new Map(topReferrerUsers.map((u) => [u.id, u.email]))

  const top5 = topReferrers.map((t) => ({
    email: userMap.get(t.referrerId) ?? 'Unknown',
    referrals: t._count.referrerId,
    creditsEarned: t._sum.referrerCredits ?? 0,
  }))

  return NextResponse.json({
    config,
    metrics: {
      totalReferrals: totalRewards,
      totalCredited,
      totalCreditsDistributed,
      conversionRate,
      top5,
    },
  })
}

// PUT /api/admin/referral — update config
const UpdateSchema = z.object({
  REFERRAL_ENABLED: z.number().int().min(0).max(1),
  REFERRAL_REFERRER_CREDITS: z.number().int().positive(),
  REFERRAL_REFERRED_CREDITS: z.number().int().positive(),
  REFERRAL_MAX_PER_USER: z.number().int().positive(),
})

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: z.infer<typeof UpdateSchema>
  try {
    body = UpdateSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const updates = [
    { key: 'REFERRAL_ENABLED', value: body.REFERRAL_ENABLED },
    { key: 'REFERRAL_REFERRER_CREDITS', value: body.REFERRAL_REFERRER_CREDITS },
    { key: 'REFERRAL_REFERRED_CREDITS', value: body.REFERRAL_REFERRED_CREDITS },
    { key: 'REFERRAL_MAX_PER_USER', value: body.REFERRAL_MAX_PER_USER },
  ]

  await prisma.$transaction(
    updates.map((u) =>
      prisma.pricingConfig.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      }),
    ),
  )

  console.log(
    `[Admin] Referral config updated by ${session.user.email}:`,
    body,
  )

  return NextResponse.json({ success: true, config: body })
}
