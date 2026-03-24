import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getNpsCampaignMetrics } from '@sol/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const campaignId = req.nextUrl.searchParams.get('campaignId')
  if (!campaignId) {
    return Response.json({ error: 'Missing campaignId' }, { status: 400 })
  }

  const metrics = await getNpsCampaignMetrics(campaignId)
  return Response.json({ metrics })
}
