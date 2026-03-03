import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'
import { z } from 'zod'

const createSessionSchema = z.object({
  onboardingProfileId: z.string().min(1, 'Perfil de onboarding é obrigatório'),
})

/**
 * POST /api/quiz — Create a new quiz session
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
  const parsed = createSessionSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  // Verify the onboarding profile belongs to this user
  const profile = await prisma.onboardingProfile.findFirst({
    where: {
      id: parsed.data.onboardingProfileId,
      userId: user.id,
    },
  })

  if (!profile) {
    return Response.json(
      { error: 'Perfil de onboarding não encontrado' },
      { status: 404 }
    )
  }

  const quizSession = await prisma.quizSession.create({
    data: {
      userId: user.id,
      onboardingProfileId: parsed.data.onboardingProfileId,
      status: 'IN_PROGRESS',
    },
    select: {
      id: true,
      onboardingProfileId: true,
      path1: true,
      path2: true,
      status: true,
      createdAt: true,
    },
  })

  return Response.json(quizSession, { status: 201 })
}

/**
 * GET /api/quiz — List all quiz sessions for the authenticated user
 */
export async function GET() {
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

  const sessions = await prisma.quizSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      onboardingProfileId: true,
      path1: true,
      path2: true,
      status: true,
      createdAt: true,
      completedAt: true,
      onboardingProfile: {
        select: { name: true },
      },
    },
  })

  return Response.json(sessions)
}
