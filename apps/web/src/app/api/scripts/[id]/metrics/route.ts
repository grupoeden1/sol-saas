// POST /api/scripts/[id]/metrics — Add performance metrics snapshot

import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'
import { classifyPerformance } from '@/lib/performance/classifier'
import { z } from 'zod'

export const runtime = 'nodejs'

const metricsSchema = z.object({
  snapshotDay: z.number().refine(v => [1, 3, 7, 14, 30].includes(v), {
    message: 'snapshotDay deve ser 1, 3, 7, 14 ou 30',
  }),
  // Paid metrics
  impressions: z.number().int().min(0).nullish(),
  ctr: z.number().min(0).max(100).nullish(),
  cpc: z.number().min(0).nullish(),
  cpm: z.number().min(0).nullish(),
  cpa: z.number().min(0).nullish(),
  roas: z.number().min(0).nullish(),
  hookRate: z.number().min(0).max(100).nullish(),
  retention: z.number().min(0).max(100).nullish(),
  // Organic metrics
  views: z.number().int().min(0).nullish(),
  likes: z.number().int().min(0).nullish(),
  comments: z.number().int().min(0).nullish(),
  shares: z.number().int().min(0).nullish(),
  saves: z.number().int().min(0).nullish(),
})

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!user) return new Response('User not found', { status: 404 })

  // Find performance record
  const performance = await prisma.scriptPerformance.findFirst({
    where: {
      conversationId: params.id,
      userId: user.id,
    },
  })

  if (!performance) {
    return Response.json({ error: 'Performance não encontrada. Registre a produção primeiro.' }, { status: 404 })
  }

  if (performance.status === 'PRODUCED') {
    return Response.json(
      { error: 'Marque como publicado antes de adicionar métricas' },
      { status: 400 }
    )
  }

  const body = await req.json()
  const parsed = metricsSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  // Create metrics snapshot (unique constraint prevents duplicates)
  try {
    const metrics = await prisma.performanceMetrics.create({
      data: {
        scriptPerformanceId: performance.id,
        snapshotDay: parsed.data.snapshotDay,
        impressions: parsed.data.impressions ?? null,
        ctr: parsed.data.ctr ?? null,
        cpc: parsed.data.cpc ?? null,
        cpm: parsed.data.cpm ?? null,
        cpa: parsed.data.cpa ?? null,
        roas: parsed.data.roas ?? null,
        hookRate: parsed.data.hookRate ?? null,
        retention: parsed.data.retention ?? null,
        views: parsed.data.views ?? null,
        likes: parsed.data.likes ?? null,
        comments: parsed.data.comments ?? null,
        shares: parsed.data.shares ?? null,
        saves: parsed.data.saves ?? null,
      },
    })

    // Auto-classify after new snapshot
    const classification = await classifyPerformance(performance.id)

    // Update status to METRICS and classification
    await prisma.scriptPerformance.update({
      where: { id: performance.id },
      data: {
        status: performance.status === 'PUBLISHED' ? 'METRICS' : performance.status,
        classification,
      },
    })

    return Response.json(metrics, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Object && 'code' in error && error.code === 'P2002') {
      return Response.json(
        { error: `Snapshot do dia ${parsed.data.snapshotDay} já registrado` },
        { status: 409 }
      )
    }
    throw error
  }
}
