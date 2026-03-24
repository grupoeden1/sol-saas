// GET /api/admin/intelligence — Accumulated intelligence dashboard data

import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'

export const runtime = 'nodejs'

export async function GET() {
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

  // Get all classified performances
  const performances = await prisma.scriptPerformance.findMany({
    where: { classification: { not: null } },
    select: {
      niche: true,
      modulesUsed: true,
      classification: true,
      awarenessLevel: true,
      sophisticationLevel: true,
      contentType: true,
      executionScore: true,
    },
  })

  // Best angles by niche (min 5 scripts)
  const nicheMap: Record<string, typeof performances> = {}
  for (const p of performances) {
    if (!nicheMap[p.niche]) nicheMap[p.niche] = []
    nicheMap[p.niche].push(p)
  }

  const bestAnglesByNiche = Object.entries(nicheMap)
    .filter(([, scripts]) => scripts.length >= 5)
    .map(([niche, scripts]) => {
      const good = scripts.filter(s => s.classification === 'GOOD' || s.classification === 'EXCELLENT')
      return {
        niche,
        totalScripts: scripts.length,
        goodOrExcellent: good.length,
        bestAwareness: mode(good.map(s => s.awarenessLevel)),
        bestSophistication: mode(good.map(s => s.sophisticationLevel)),
        bestContentType: mode(good.map(s => s.contentType)),
        topModules: topN(good.flatMap(s => s.modulesUsed), 3),
      }
    })

  // Module × results correlation
  const moduleResults: Record<string, string[]> = {}
  for (const p of performances) {
    for (const mod of p.modulesUsed) {
      if (!moduleResults[mod]) moduleResults[mod] = []
      if (p.classification) moduleResults[mod].push(p.classification)
    }
  }

  const moduleCorrelation = Object.entries(moduleResults).map(([module, classifications]) => ({
    module,
    count: classifications.length,
    classifications: countOccurrences(classifications),
  }))

  // Top 10 best performing scripts
  const topScripts = await prisma.scriptPerformance.findMany({
    where: { classification: { in: ['EXCELLENT', 'GOOD'] } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      niche: true,
      modulesUsed: true,
      classification: true,
      awarenessLevel: true,
      sophisticationLevel: true,
      contentType: true,
    },
  })

  return Response.json({
    bestAnglesByNiche,
    moduleCorrelation,
    topScripts,
    totalClassified: performances.length,
  })
}

function mode<T>(arr: T[]): T | null {
  if (arr.length === 0) return null
  const counts = new Map<T, number>()
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1)
  let max = 0
  let result: T | null = null
  for (const [v, c] of counts) {
    if (c > max) { max = c; result = v }
  }
  return result
}

function topN(arr: string[], n: number): string[] {
  const counts = new Map<string, number>()
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([v]) => v)
}

function countOccurrences(arr: string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const v of arr) counts[v] = (counts[v] ?? 0) + 1
  return counts
}
