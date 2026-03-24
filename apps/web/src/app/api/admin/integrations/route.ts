import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch all API configurations
  const providers = await prisma.apiConfiguration.findMany({
    orderBy: { provider: 'asc' },
  })

  // Aggregate usage metrics from search_cache
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Total count by source
  const totalBySource = await prisma.searchCache.groupBy({
    by: ['source'],
    _count: { id: true },
  })

  // Last 24h count by source
  const last24hBySource = await prisma.searchCache.groupBy({
    by: ['source'],
    _count: { id: true },
    where: {
      createdAt: { gte: twentyFourHoursAgo },
    },
  })

  // Total cache entries
  const totalCacheEntries = await prisma.searchCache.count()

  // Expired cache entries
  const expiredCacheEntries = await prisma.searchCache.count({
    where: { expiresAt: { lt: now } },
  })

  const metrics = {
    totalCacheEntries,
    expiredCacheEntries,
    activeCacheEntries: totalCacheEntries - expiredCacheEntries,
    bySource: Object.fromEntries(
      totalBySource.map((g) => [g.source, g._count.id]),
    ),
    last24h: Object.fromEntries(
      last24hBySource.map((g) => [g.source, g._count.id]),
    ),
  }

  return NextResponse.json({ providers, metrics })
}
