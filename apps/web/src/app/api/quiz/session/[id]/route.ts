import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'

/**
 * GET /api/quiz/session/[id] — Returns full quiz state with all answers
 */
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

  if (!user) {
    return new Response('User not found', { status: 404 })
  }

  const quizSession = await prisma.quizSession.findFirst({
    where: {
      id: params.id,
      userId: user.id,
    },
    select: {
      id: true,
      onboardingProfileId: true,
      path1: true,
      path2: true,
      status: true,
      createdAt: true,
      completedAt: true,
      onboardingProfile: {
        select: {
          id: true,
          name: true,
          answers: true,
        },
      },
      answers: {
        select: {
          id: true,
          questionKey: true,
          section: true,
          answerType: true,
          answerValue: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!quizSession) {
    return Response.json(
      { error: 'Sessão de quiz não encontrada' },
      { status: 404 }
    )
  }

  // Build answer map for easy client consumption
  const answerMap: Record<string, string> = {}
  for (const answer of quizSession.answers) {
    answerMap[answer.questionKey] = answer.answerValue
  }

  return Response.json({
    ...quizSession,
    answerMap,
  })
}

/**
 * PATCH /api/quiz/session/[id] — Update session status (complete/abandon)
 */
export async function PATCH(
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

  if (!user) {
    return new Response('User not found', { status: 404 })
  }

  const quizSession = await prisma.quizSession.findFirst({
    where: {
      id: params.id,
      userId: user.id,
    },
  })

  if (!quizSession) {
    return Response.json(
      { error: 'Sessão de quiz não encontrada' },
      { status: 404 }
    )
  }

  const body = await req.json()
  const { status } = body as { status: string }

  if (status !== 'COMPLETED' && status !== 'ABANDONED') {
    return Response.json(
      { error: 'Status inválido. Use COMPLETED ou ABANDONED' },
      { status: 400 }
    )
  }

  const updated = await prisma.quizSession.update({
    where: { id: params.id },
    data: {
      status,
      ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}),
    },
    select: {
      id: true,
      status: true,
      completedAt: true,
    },
  })

  return Response.json(updated)
}
