import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'

/**
 * GET /api/video/status/[id] — Returns video analysis processing status
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

  const videoAnalysis = await prisma.videoAnalysis.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      processingStatus: true,
      processingTimeMs: true,
      errorMessage: true,
      quizSession: {
        select: { userId: true },
      },
    },
  })

  if (!videoAnalysis || videoAnalysis.quizSession.userId !== user.id) {
    return Response.json(
      { error: 'Análise de vídeo não encontrada' },
      { status: 404 }
    )
  }

  return Response.json({
    id: videoAnalysis.id,
    status: videoAnalysis.processingStatus,
    processingTimeMs: videoAnalysis.processingTimeMs,
    errorMessage: videoAnalysis.errorMessage,
  })
}
