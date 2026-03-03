import { auth } from '@/lib/auth'
import {
  prisma,
  deductCredits,
  getPricingConfig,
  calculateCredits,
  calculateMaxCredits,
  InsufficientBalanceError,
} from '@sol/db'
import { countRawTokens } from '@sol/db/token-counter'
import { buildQuizPrompt, type PromptContext } from '@/lib/quiz/prompt-builder'
import OpenAI from 'openai'
import { z } from 'zod'

export const runtime = 'nodejs'

const generateSchema = z.object({
  quizSessionId: z.string().min(1),
})

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

export async function POST(req: Request) {
  try {
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
    const videoAnalysis =
      va && va.processingStatus === 'COMPLETED' && va.fullDescription
        ? { transcription: va.transcription ?? '', fullDescription: va.fullDescription }
        : undefined

    const promptContext: PromptContext = {
      onboarding: onboardingAnswers,
      answers: answerMap,
      path1: quizSession.path1,
      path2: quizSession.path2,
      videoAnalysis,
    }

    const { systemPrompt, userPrompt } = buildQuizPrompt(promptContext)

    // Token counting & credit gate
    const model = process.env.OPENAI_MODEL_FINAL || 'gpt-4o'
    const totalInputTokens = countRawTokens(systemPrompt + '\n' + userPrompt, model)
    const config = await getPricingConfig()
    const maxCredits = calculateMaxCredits(totalInputTokens, config)

    console.log(`[Quiz Generate] model=${model} inputTokens=${totalInputTokens} maxCredits=${maxCredits}`)

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

    // Stream from OpenAI
    const stream = await getOpenAI().chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      temperature: 0.7,
      max_completion_tokens: config.maxOutputTokens,
    })

    const encoder = new TextEncoder()
    let fullResponse = ''

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content || ''
            if (token) {
              fullResponse += token
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
              )
            }
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

          // Deduct credits
          const outputTokens = countRawTokens(fullResponse, model)
          const creditsUsed = calculateCredits(totalInputTokens, outputTokens, config)

          console.log(`[Quiz Generate] outputTokens=${outputTokens} creditsUsed=${creditsUsed}`)

          let creditsAfterDeduction = user.credits
          try {
            const result = await deductCredits(user.id, creditsUsed, {
              inputTokens: totalInputTokens,
              outputTokens,
              modelUsed: model,
              creditsPerMInput: config.creditsPerMInput,
              creditsPerMOutput: config.creditsPerMOutput,
              conversationTitle,
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
