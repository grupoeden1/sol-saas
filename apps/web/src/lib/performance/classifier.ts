// Performance Classifier — SOL SaaS
// Classifies script performance as TERRIBLE/BAD/AVERAGE/GOOD/EXCELLENT
// based on configurable thresholds from the performance_thresholds table.

import { prisma, type Classification } from '@sol/db'

/**
 * Classifies a script's performance based on the latest metrics snapshot
 * and configurable thresholds per content type.
 *
 * Primary metric:
 * - PAID: ROAS
 * - ORGANIC: retention
 */
export async function classifyPerformance(
  scriptPerformanceId: string,
): Promise<Classification | null> {
  const perf = await prisma.scriptPerformance.findUnique({
    where: { id: scriptPerformanceId },
    include: {
      metrics: { orderBy: { snapshotDay: 'desc' }, take: 1 },
    },
  })

  if (!perf || perf.metrics.length === 0) return null

  const latestMetric = perf.metrics[0]
  const metricKey = perf.contentType === 'PAID' ? 'roas' : 'retention'
  const primaryMetric = perf.contentType === 'PAID'
    ? latestMetric.roas
    : latestMetric.retention

  if (primaryMetric == null) return null

  const threshold = await prisma.performanceThreshold.findUnique({
    where: {
      contentType_metricKey: {
        contentType: perf.contentType,
        metricKey,
      },
    },
  })

  if (!threshold) return null

  if (primaryMetric <= threshold.terribleMax) return 'TERRIBLE'
  if (primaryMetric <= threshold.badMax) return 'BAD'
  if (primaryMetric <= threshold.averageMax) return 'AVERAGE'
  if (primaryMetric <= threshold.goodMax) return 'GOOD'
  return 'EXCELLENT'
}
