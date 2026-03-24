// GET /api/admin/results — Aggregated results dashboard data

import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  })

  if (user?.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 })
  }

  const url = new URL(req.url)
  const period = url.searchParams.get('period') ?? 'all'

  // Calculate date filter
  let dateFilter: Date | undefined
  if (period === '7d') dateFilter = new Date(Date.now() - 7 * 86400000)
  else if (period === '30d') dateFilter = new Date(Date.now() - 30 * 86400000)
  else if (period === '90d') dateFilter = new Date(Date.now() - 90 * 86400000)

  const where = dateFilter ? { createdAt: { gte: dateFilter } } : {}

  // Classification distribution
  const classificationDistribution = await prisma.scriptPerformance.groupBy({
    by: ['classification'],
    where,
    _count: true,
  })

  // Performance by niche
  const nichePerformance = await prisma.scriptPerformance.groupBy({
    by: ['niche'],
    where: { ...where, classification: { not: null } },
    _count: true,
    _avg: { awarenessLevel: true, sophisticationLevel: true, executionScore: true },
  })

  // Performance by module (flatten modulesUsed across records)
  const allPerformances = await prisma.scriptPerformance.findMany({
    where: { ...where, classification: { not: null } },
    select: { modulesUsed: true, classification: true },
  })

  const moduleStats: Record<string, { count: number; classifications: string[] }> = {}
  for (const p of allPerformances) {
    for (const mod of p.modulesUsed) {
      if (!moduleStats[mod]) moduleStats[mod] = { count: 0, classifications: [] }
      moduleStats[mod].count++
      if (p.classification) moduleStats[mod].classifications.push(p.classification)
    }
  }

  // Execution gap
  const executionStats = await prisma.scriptPerformance.aggregate({
    where: { ...where, executionScore: { not: null } },
    _avg: { executionScore: true },
    _count: true,
  })

  // Total counts
  const totalCount = await prisma.scriptPerformance.count({ where })

  return Response.json({
    period,
    total: totalCount,
    classificationDistribution: classificationDistribution.map(d => ({
      classification: d.classification ?? 'UNCLASSIFIED',
      count: d._count,
    })),
    nichePerformance: nichePerformance.map(n => ({
      niche: n.niche,
      count: n._count,
      avgAwareness: n._avg.awarenessLevel,
      avgSophistication: n._avg.sophisticationLevel,
      avgExecutionScore: n._avg.executionScore,
    })),
    modulePerformance: Object.entries(moduleStats).map(([module, stats]) => ({
      module,
      count: stats.count,
      classifications: stats.classifications,
    })),
    executionGap: {
      avgScore: executionStats._avg.executionScore,
      totalAnalyzed: executionStats._count,
    },
  })
}
