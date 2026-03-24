import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

export const runtime = 'nodejs'

const TTS_AUDIO_DIR = path.resolve(
  process.env.TTS_AUDIO_DIR || path.join(os.tmpdir(), 'sol-tts-audio'),
)

export async function GET(
  _req: Request,
  { params }: { params: { cacheId: string } },
) {
  try {
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

    // Find cache record and verify ownership via conversation
    const cache = await prisma.ttsAudioCache.findUnique({
      where: { id: params.cacheId },
      include: { conversation: { select: { userId: true } } },
    })

    if (!cache || cache.conversation.userId !== user.id) {
      return new Response('Not found', { status: 404 })
    }

    // Validate audio path is within expected directory (prevent path traversal)
    const resolvedAudioPath = path.resolve(cache.audioPath)
    if (!resolvedAudioPath.startsWith(TTS_AUDIO_DIR)) {
      console.error(`[TTS Audio] Path traversal blocked: ${cache.audioPath}`)
      return new Response('Forbidden', { status: 403 })
    }

    // Read and serve the audio file
    let audioBuffer: Buffer
    try {
      audioBuffer = await fs.readFile(resolvedAudioPath)
    } catch {
      // File was cleaned up; remove stale cache record
      await prisma.ttsAudioCache.delete({ where: { id: cache.id } })
      return new Response('Audio file not found (expired)', { status: 410 })
    }

    return new Response(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'private, max-age=86400',
        'Content-Disposition': `inline; filename="sol-tts-${cache.id}.mp3"`,
      },
    })
  } catch (error) {
    console.error('[TTS Audio] Error:', error instanceof Error ? error.message : 'Unknown')
    return new Response('Internal server error', { status: 500 })
  }
}
