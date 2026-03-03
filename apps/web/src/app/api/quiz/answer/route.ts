import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'
import { z } from 'zod'
import { derivePath1, derivePath2 } from '@/lib/quiz/conditions'

const answerSchema = z.object({
  quizSessionId: z.string().min(1),
  questionKey: z.string().min(1),
  section: z.enum([
    'INITIAL',
    'AD_CREATIVE',
    'ORGANIC_VIDEO',
    'MODELED_VIDEO',
    'FROM_SCRATCH_VIDEO',
  ]),
  answerType: z.enum(['TEXT', 'SINGLE_SELECT', 'MULTI_SELECT', 'UPLOAD']),
  answerValue: z.string(),
})

/**
 * POST /api/quiz/answer — Save or update a quiz answer (upsert)
 * Also auto-updates path1/path2 on the session when Q1/Q2 are answered.
 */
export async function POST(req: Request) {
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

  const body = await req.json()
  const parsed = answerSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { quizSessionId, questionKey, section, answerType, answerValue } = parsed.data

  // Verify the quiz session belongs to this user and is in progress
  const quizSession = await prisma.quizSession.findFirst({
    where: {
      id: quizSessionId,
      userId: user.id,
    },
  })

  if (!quizSession) {
    return Response.json(
      { error: 'Sessão de quiz não encontrada' },
      { status: 404 }
    )
  }

  if (quizSession.status !== 'IN_PROGRESS') {
    return Response.json(
      { error: 'Sessão de quiz não está em andamento' },
      { status: 409 }
    )
  }

  // Upsert the answer (unique on quizSessionId + questionKey)
  const answer = await prisma.quizAnswer.upsert({
    where: {
      quizSessionId_questionKey: {
        quizSessionId,
        questionKey,
      },
    },
    create: {
      quizSessionId,
      questionKey,
      section: section as 'INITIAL' | 'AD_CREATIVE' | 'ORGANIC_VIDEO' | 'MODELED_VIDEO' | 'FROM_SCRATCH_VIDEO',
      answerType: answerType as 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'UPLOAD',
      answerValue,
    },
    update: {
      answerValue,
      answerType: answerType as 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'UPLOAD',
    },
  })

  // Auto-update path1/path2 when Q1 or Q2 are answered
  if (questionKey === 'Q1' || questionKey === 'Q2') {
    // Get all current answers to derive paths
    const allAnswers = await prisma.quizAnswer.findMany({
      where: { quizSessionId },
      select: { questionKey: true, answerValue: true },
    })

    const answerMap: Record<string, string> = {}
    for (const a of allAnswers) {
      answerMap[a.questionKey] = a.answerValue
    }

    const path1 = derivePath1(answerMap)
    const path2 = derivePath2(answerMap)

    await prisma.quizSession.update({
      where: { id: quizSessionId },
      data: {
        ...(path1 !== null ? { path1 } : {}),
        ...(path2 !== null ? { path2 } : {}),
      },
    })
  }

  return Response.json(answer, { status: 200 })
}
