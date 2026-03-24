import { auth } from '@/lib/auth'
import { z } from 'zod'
import {
  prisma,
  getPricingConfig,
  calculateElevenLabsCredits,
  deductCredits,
  InsufficientBalanceError,
} from '@sol/db'
import { generateAudio, stripMarkdown, deleteAudioFile } from '@/lib/tts/elevenlabs'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const generateSchema = z.object({
  messageId: z.string().min(1),
  voiceId: z.string().min(1),
  modelId: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    // Rate limit: 5 TTS generations per minute per IP
    const rl = rateLimit(`tts:${getClientIp(req)}`, { limit: 5, windowSeconds: 60 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    // Auth
    const session = await auth()
    if (!session?.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, credits: true },
    })
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse body
    const body = generateSchema.safeParse(await req.json())
    if (!body.success) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }
    const { messageId, voiceId, modelId } = body.data

    // Validate message belongs to user's conversation
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: { select: { id: true, userId: true, title: true } } },
    })
    if (!message || message.conversation.userId !== user.id) {
      return Response.json({ error: 'Message not found' }, { status: 404 })
    }
    if (message.role !== 'assistant') {
      return Response.json({ error: 'Can only generate audio for assistant messages' }, { status: 400 })
    }

    // Check cache: if audio already exists for this message+voice, return it
    const existingCache = await prisma.ttsAudioCache.findUnique({
      where: { messageId_voiceId: { messageId, voiceId } },
    })
    if (existingCache) {
      return Response.json({
        cacheId: existingCache.id,
        audioUrl: `/api/tts/audio/${existingCache.id}`,
        characters: existingCache.characters,
        creditsCharged: existingCache.creditsCharged,
        cached: true,
      })
    }

    // Calculate character count and credit cost BEFORE calling API
    const cleanText = stripMarkdown(message.content)
    const characters = cleanText.length
    if (characters === 0) {
      return Response.json({ error: 'Message has no speakable content' }, { status: 400 })
    }
    if (characters > 10_000) {
      return Response.json({ error: `Text too long: ${characters} chars (max 10,000)` }, { status: 400 })
    }

    const config = await getPricingConfig()
    const creditsRequired = calculateElevenLabsCredits(characters, config)

    // Credit gate
    if (user.credits < creditsRequired) {
      return Response.json({
        error: 'insufficient_credits',
        required: creditsRequired,
        available: user.credits,
        characters,
      }, { status: 402 })
    }

    // Generate audio via ElevenLabs (pass clean text to avoid double stripMarkdown)
    const result = await generateAudio({
      voiceId,
      modelId,
      text: cleanText,
    })

    // Save cache record (handle race condition: another request may have created it)
    let cacheRecord
    try {
      cacheRecord = await prisma.ttsAudioCache.create({
        data: {
          conversationId: message.conversation.id,
          messageId,
          voiceId,
          modelId: modelId || 'eleven_multilingual_v2',
          characters: result.characters,
          audioPath: result.audioPath,
          fileSizeBytes: result.fileSizeBytes,
          creditsCharged: creditsRequired,
        },
      })
    } catch (dbErr) {
      // Unique constraint violation — another request already cached this
      await deleteAudioFile(result.audioPath)
      const existing = await prisma.ttsAudioCache.findUnique({
        where: { messageId_voiceId: { messageId, voiceId } },
      })
      if (existing) {
        return Response.json({
          cacheId: existing.id,
          audioUrl: `/api/tts/audio/${existing.id}`,
          characters: existing.characters,
          creditsCharged: existing.creditsCharged,
          cached: true,
        })
      }
      throw dbErr
    }

    // Deduct credits
    let creditsAfter = user.credits
    try {
      const deductResult = await deductCredits(user.id, creditsRequired, {
        inputTokens: 0,
        outputTokens: 0,
        modelUsed: 'elevenlabs-tts',
        creditsPerMInput: config.creditsPerMInput,
        creditsPerMOutput: config.creditsPerMOutput,
        conversationTitle: `TTS: ${message.conversation.title}`,
        elevenLabsChars: result.characters,
        elevenLabsCredits: creditsRequired,
      })
      creditsAfter = deductResult.credits
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        await prisma.ttsAudioCache.delete({ where: { id: cacheRecord.id } })
        await deleteAudioFile(result.audioPath)
        return Response.json({
          error: 'insufficient_credits',
          required: creditsRequired,
          available: 0,
        }, { status: 402 })
      }
      throw err
    }

    console.log(`[TTS] Generated audio: ${result.characters} chars, ${creditsRequired} credits`)

    return Response.json({
      cacheId: cacheRecord.id,
      audioUrl: `/api/tts/audio/${cacheRecord.id}`,
      characters: result.characters,
      creditsCharged: creditsRequired,
      creditsRemaining: creditsAfter,
      cached: false,
    })
  } catch (error) {
    console.error('[TTS API] Error:', error instanceof Error ? error.message : 'Unknown')
    return Response.json({ error: 'Failed to generate audio' }, { status: 500 })
  }
}
