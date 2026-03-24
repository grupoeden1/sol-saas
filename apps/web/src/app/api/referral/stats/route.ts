import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getReferralStats } from '@sol/db'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await getReferralStats(session.user.id)

    return NextResponse.json({
      referralCode: stats.referralCode,
      totalReferrals: stats.totalReferrals,
      creditsEarned: stats.creditsEarned,
      referrals: stats.referrals.map((r) => ({
        maskedEmail: r.maskedEmail,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    console.error(
      '[Referral/Stats] Error:',
      err instanceof Error ? err.message : 'Unknown',
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
