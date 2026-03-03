import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'
import * as fs from 'fs/promises'
import * as path from 'path'
import { getVideoDuration } from '@/lib/video/ffmpeg'
import { processVideo } from '@/lib/video/processor'

export const runtime = 'nodejs'

const VIDEO_TEMP_DIR = process.env.VIDEO_TEMP_DIR || '/tmp/sol-uploads/'
const VIDEO_MAX_SIZE_MB = parseInt(process.env.VIDEO_MAX_SIZE_MB || '500', 10)
const VIDEO_MAX_DURATION_SECONDS = parseInt(process.env.VIDEO_MAX_DURATION_SECONDS || '300', 10)
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']

/**
 * POST /api/video/upload — Upload video for analysis (question 2A.2)
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

  const formData = await req.formData()
  const video = formData.get('video') as File | null
  const quizSessionId = formData.get('quizSessionId') as string | null

  if (!video || !quizSessionId) {
    return Response.json(
      { error: 'Vídeo e quizSessionId são obrigatórios' },
      { status: 400 }
    )
  }

  // Validate type
  if (!ALLOWED_TYPES.includes(video.type)) {
    return Response.json(
      { error: `Tipo de arquivo não suportado: ${video.type}. Use MP4, MOV, AVI ou WebM.` },
      { status: 400 }
    )
  }

  // Validate size
  const sizeMB = video.size / (1024 * 1024)
  if (sizeMB > VIDEO_MAX_SIZE_MB) {
    return Response.json(
      { error: `Arquivo excede o limite de ${VIDEO_MAX_SIZE_MB}MB (${sizeMB.toFixed(1)}MB).` },
      { status: 400 }
    )
  }

  // Verify quiz session ownership
  const quizSession = await prisma.quizSession.findFirst({
    where: { id: quizSessionId, userId: user.id },
  })

  if (!quizSession) {
    return Response.json(
      { error: 'Sessão de quiz não encontrada' },
      { status: 404 }
    )
  }

  // Save video to temp dir
  await fs.mkdir(VIDEO_TEMP_DIR, { recursive: true })

  const ext = video.name.split('.').pop() || 'mp4'
  const fileName = `${quizSessionId}-${Date.now()}.${ext}`
  const videoPath = path.join(VIDEO_TEMP_DIR, fileName)

  const buffer = Buffer.from(await video.arrayBuffer())
  await fs.writeFile(videoPath, buffer)

  // Validate duration via FFprobe
  try {
    const duration = await getVideoDuration(videoPath)
    if (duration > VIDEO_MAX_DURATION_SECONDS) {
      await fs.rm(videoPath, { force: true })
      return Response.json(
        { error: `Vídeo excede o limite de ${VIDEO_MAX_DURATION_SECONDS / 60} minutos (${(duration / 60).toFixed(1)} min).` },
        { status: 400 }
      )
    }
  } catch {
    // If FFprobe is not available, skip duration check
    console.warn('[Video Upload] FFprobe not available, skipping duration check')
  }

  // Find or create the quiz answer for 2A.2
  const quizAnswer = await prisma.quizAnswer.upsert({
    where: {
      quizSessionId_questionKey: {
        quizSessionId,
        questionKey: '2A.2',
      },
    },
    create: {
      quizSessionId,
      questionKey: '2A.2',
      section: 'MODELED_VIDEO',
      answerType: 'UPLOAD',
      answerValue: video.name,
    },
    update: {
      answerValue: video.name,
    },
  })

  // Create VideoAnalysis with QUEUED status
  const videoAnalysis = await prisma.videoAnalysis.create({
    data: {
      quizSessionId,
      quizAnswerId: quizAnswer.id,
      processingStatus: 'QUEUED',
    },
  })

  // Start processing in background (don't await)
  processVideo(videoPath, videoAnalysis.id).catch((err) => {
    console.error('[Video Upload] Background processing error:', err)
  })

  return Response.json(
    {
      videoAnalysisId: videoAnalysis.id,
      status: 'QUEUED',
    },
    { status: 201 }
  )
}
