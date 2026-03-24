import { auth } from '@/lib/auth'
import {
  prisma,
  deductCredits,
  getPricingConfig,
  calculateCredits,
  calculateMaxCredits,
  InsufficientBalanceError,
  getAiConfig,
} from '@sol/db'
import { countRawTokens } from '@sol/db/token-counter'
import { type PromptContext, type ReferenceContext } from '@/lib/quiz/prompt-builder'
import { assemblePrompt } from '@/lib/prompt-engine'
import { classifyMarket } from '@/lib/quiz/market-classifier'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { getAiAdapter } from '@/lib/ai'
import { z } from 'zod'

export const runtime = 'nodejs'

const generateSchema = z.object({
  quizSessionId: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    // Rate limiting: 10 generations per minute per IP
    const rl = rateLimit(`generate:${getClientIp(req)}`, { limit: 10, windowSeconds: 60 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const session = await auth()
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, credits: true },
    })

    if (!user) {
      return new Response('User not found', { status: 404 })
    }

    const body = await req.json()
    const parsed = generateSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      )
    }

    const { quizSessionId } = parsed.data

    // Load quiz session with all context
    const quizSession = await prisma.quizSession.findFirst({
      where: {
        id: quizSessionId,
        userId: user.id,
      },
      include: {
        onboardingProfile: true,
        answers: true,
        videoAnalysis: true,
      },
    })

    if (!quizSession) {
      return Response.json(
        { error: 'Sessão de quiz não encontrada' },
        { status: 404 }
      )
    }

    if (!quizSession.path1 || !quizSession.path2) {
      return Response.json(
        { error: 'Quiz incompleto — responda Q1 e Q2 primeiro' },
        { status: 400 }
      )
    }

    // Build answer maps
    const answerMap: Record<string, string> = {}
    for (const answer of quizSession.answers) {
      answerMap[answer.questionKey] = answer.answerValue
    }

    const onboardingAnswers = (quizSession.onboardingProfile.answers ?? {}) as Record<string, string>

    // Build prompt (include video analysis if available and completed)
    const va = quizSession.videoAnalysis
    if (va) {
      console.log(`[Quiz Generate] VideoAnalysis found: status=${va.processingStatus}, hasFullDesc=${!!va.fullDescription}, descLength=${va.fullDescription?.length ?? 0}`)
    } else {
      console.log(`[Quiz Generate] No VideoAnalysis record for session ${quizSessionId}`)
    }
    const videoAnalysis =
      va && va.processingStatus === 'COMPLETED' && va.fullDescription
        ? { transcription: va.transcription ?? '', fullDescription: va.fullDescription }
        : undefined
    console.log(`[Quiz Generate] videoAnalysis injected into prompt: ${!!videoAnalysis}`)

    // Classify market — reuse cached classification if available (Story 6.8)
    let classification
    if (quizSession.classification && quizSession.awarenessLevel && quizSession.sophisticationLevel) {
      classification = quizSession.classification as {
        awarenessLevel: number
        sophisticationLevel: number
        awarenessJustification: string
        sophisticationJustification: string
      }
      console.log(`[Quiz Generate] Using cached classification: awareness=${classification.awarenessLevel} sophistication=${classification.sophisticationLevel}`)
    } else {
      classification = await classifyMarket(answerMap, onboardingAnswers)
      console.log(`[Quiz Generate] New classification: awareness=${classification.awarenessLevel} sophistication=${classification.sophisticationLevel}`)

      // Persist classification on quiz session
      await prisma.quizSession.update({
        where: { id: quizSession.id },
        data: {
          awarenessLevel: classification.awarenessLevel,
          sophisticationLevel: classification.sophisticationLevel,
          classification: JSON.parse(JSON.stringify(classification)),
        },
      })
    }

    // Fetch expert profile if the user opted in
    let expertProfile: Record<string, unknown> | null = null
    if (quizSession.useExpertProfile) {
      const profile = await prisma.expertProfile.findUnique({
        where: { userId: user.id },
      })
      if (profile) {
        // Convert Prisma model to plain object for prompt injection
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, ...profileData } = profile
        expertProfile = profileData as Record<string, unknown>
        console.log(`[Quiz Generate] Expert profile loaded (completion=${profile.completionPercentage}%)`)
      } else {
        console.log(`[Quiz Generate] useExpertProfile=true but no ExpertProfile found for user`)
      }
    }

    // Load creative reference if user selected one (Epic 12)
    let reference: ReferenceContext | null = null
    const creativeRef = await prisma.creativeReference.findFirst({
      where: { quizSessionId: quizSession.id },
      orderBy: { createdAt: 'desc' },
    })
    if (creativeRef) {
      let parsedFormat: string | null = null
      if (creativeRef.formatClassification) {
        try {
          const fc = typeof creativeRef.formatClassification === 'string'
            ? JSON.parse(creativeRef.formatClassification)
            : creativeRef.formatClassification
          parsedFormat = (fc as Record<string, unknown>).format as string ?? null
        } catch {
          // ignore parse error
        }
      }
      reference = {
        format: parsedFormat,
        adCopy: creativeRef.adCopy,
        engagement: creativeRef.engagementMetrics
          ? (typeof creativeRef.engagementMetrics === 'string'
              ? JSON.parse(creativeRef.engagementMetrics)
              : creativeRef.engagementMetrics) as Record<string, number>
          : null,
        platform: creativeRef.platform,
        advertiserName: creativeRef.advertiserName,
        searchQuery: creativeRef.searchQuery,
      }
      console.log(`[Quiz Generate] Creative reference loaded: format=${parsedFormat} platform=${creativeRef.platform}`)
    }

    const promptContext: PromptContext = {
      onboarding: onboardingAnswers,
      answers: answerMap,
      path1: quizSession.path1,
      path2: quizSession.path2,
      videoAnalysis,
      expertProfile,
      personalContext: quizSession.personalContext,
      reference,
    }

    // Assemble prompt using 3-layer Prompt Engine
    const { systemPrompt, userPrompt, modulesUsed } = await assemblePrompt(promptContext, classification)
    console.log(`[Quiz Generate] Modules used: ${modulesUsed.join(', ')}`)

    // Token estimation & credit gate
    const aiConfig = await getAiConfig()
    const adapter = getAiAdapter(aiConfig.provider)
    const model = aiConfig.finalModel
    const estimatedInputTokens = countRawTokens(systemPrompt + '\n' + userPrompt, model)
    const config = await getPricingConfig()
    const maxCredits = calculateMaxCredits(estimatedInputTokens, config)

    console.log(`[Quiz Generate] model=${model} estimatedInputTokens=${estimatedInputTokens} maxCredits=${maxCredits}`)

    if (user.credits < maxCredits) {
      return Response.json(
        {
          error: 'insufficient_credits',
          required: maxCredits,
          available: user.credits,
        },
        { status: 402 }
      )
    }

    // Create conversation linked to quiz session
    const conversationTitle = `Roteiro: ${quizSession.onboardingProfile.name}`
    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title: conversationTitle.substring(0, 60),
        quizSessionId: quizSession.id,
      },
    })

    // Stream from AI provider
    const streamResult = await adapter.stream({
      model,
      systemPrompt,
      messages: [],
      userContent: userPrompt,
      maxTokens: config.maxOutputTokens,
      temperature: 0.7,
    })

    const encoder = new TextEncoder()
    let fullResponse = ''

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const token of streamResult.textStream) {
            fullResponse += token
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
            )
          }

          // Save the generated script as assistant message
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: 'assistant',
              content: fullResponse,
            },
          })

          // Mark quiz session as completed
          await prisma.quizSession.update({
            where: { id: quizSession.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          })

          // Get actual token usage from API response
          const { inputTokens: actualInputTokens, outputTokens: actualOutputTokens } = await streamResult.usage()

          // Calculate and deduct credits
          const creditsUsed = calculateCredits(actualInputTokens, actualOutputTokens, config)

          console.log(`[Quiz Generate] inputTokens=${actualInputTokens} outputTokens=${actualOutputTokens} creditsUsed=${creditsUsed}`)

          let creditsAfterDeduction = user.credits
          try {
            const result = await deductCredits(user.id, creditsUsed, {
              inputTokens: actualInputTokens,
              outputTokens: actualOutputTokens,
              modelUsed: model,
              creditsPerMInput: config.creditsPerMInput,
              creditsPerMOutput: config.creditsPerMOutput,
              conversationTitle,
              modulesUsed,
            })
            creditsAfterDeduction = result.credits
          } catch (deductError) {
            if (deductError instanceof InsufficientBalanceError) {
              console.warn('[Quiz Generate] Credits insufficient post-stream:', deductError.message)
            } else {
              console.error('[Quiz Generate] Credit deduction failed:', deductError)
            }
            creditsAfterDeduction = 0
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                conversationId: conversation.id,
                creditsRemaining: creditsAfterDeduction,
                creditsUsed,
              })}\n\n`
            )
          )
          controller.close()
        } catch (error) {
          console.error('[Quiz Generate] Streaming error:', error instanceof Error ? error.message : 'Unknown')

          // On error: don't mark completed, don't deduct credits
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: 'Ocorreu um erro ao gerar o roteiro. Tente novamente.',
              })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Credits-Remaining': String(user.credits),
        'X-Conversation-Id': conversation.id,
      },
    })
  } catch (error) {
    console.error('[Quiz Generate] Request error:', error instanceof Error ? error.message : 'Unknown')
    return new Response('Internal server error', { status: 500 })
  }
}
