// GET /api/scripts/[id]/performance — Fetch performance + metrics
// POST /api/scripts/[id]/performance — Register script production
// PATCH /api/scripts/[id]/performance — Update status (PUBLISHED)

import { auth } from '@/lib/auth'
import { prisma, PerformanceStatus } from '@sol/db'
import { z } from 'zod'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
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

  const performance = await prisma.scriptPerformance.findFirst({
    where: {
      conversationId: params.id,
      userId: user.id,
    },
    include: {
      metrics: { orderBy: { snapshotDay: 'asc' } },
    },
  })

  if (!performance) {
    return Response.json(null, { status: 404 })
  }

  return Response.json(performance)
}

const createSchema = z.object({
  contentType: z.enum(['PAID', 'ORGANIC']),
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

  // Verify conversation exists and belongs to user
  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      quizSession: {
        include: { onboardingProfile: true },
      },
      scriptPerformance: true,
    },
  })

  if (!conversation) {
    return Response.json({ error: 'Roteiro não encontrado' }, { status: 404 })
  }

  if (!conversation.quizSessionId) {
    return Response.json(
      { error: 'Apenas roteiros gerados via quiz podem registrar performance' },
      { status: 400 }
    )
  }

  if (conversation.scriptPerformance) {
    return Response.json(
      { error: 'Performance já registrada para este roteiro' },
      { status: 409 }
    )
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'contentType deve ser PAID ou ORGANIC' }, { status: 400 })
  }

  // Extract niche from onboarding profile
  const onboardingAnswers = (conversation.quizSession?.onboardingProfile?.answers ?? {}) as Record<string, string>
  const niche = onboardingAnswers['O1'] ?? 'Não informado'

  const performance = await prisma.scriptPerformance.create({
    data: {
      conversationId: conversation.id,
      userId: user.id,
      contentType: parsed.data.contentType,
      niche,
      awarenessLevel: conversation.quizSession?.awarenessLevel ?? 3,
      sophisticationLevel: conversation.quizSession?.sophisticationLevel ?? 3,
    },
  })

  return Response.json(performance, { status: 201 })
}

export async function PATCH(
  _req: Request,
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

  const performance = await prisma.scriptPerformance.findFirst({
    where: {
      conversationId: params.id,
      userId: user.id,
    },
  })

  if (!performance) {
    return Response.json({ error: 'Performance não encontrada' }, { status: 404 })
  }

  // Status transitions are unidirectional
  const validTransitions: Partial<Record<PerformanceStatus, PerformanceStatus>> = {
    PRODUCED: 'PUBLISHED',
    PUBLISHED: 'METRICS',
    METRICS: 'ANALYZED',
  }

  const nextStatus = validTransitions[performance.status]
  if (!nextStatus) {
    return Response.json(
      { error: `Status ${performance.status} não pode avançar` },
      { status: 400 }
    )
  }

  const updated = await prisma.scriptPerformance.update({
    where: { id: performance.id },
    data: { status: nextStatus },
  })

  return Response.json(updated)
}
