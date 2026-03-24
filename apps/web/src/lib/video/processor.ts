// Video Processing Pipeline — SOL SaaS
// Orchestrates: AssemblyAI transcription + FFmpeg frame extraction + AI Vision analysis

import { prisma, getPricingConfig, calculateCredits, calculateAssemblyAiCredits, deductCredits } from '@sol/db'
import { transcribe } from './assemblyai'
import { extractFrames, cleanup } from './ffmpeg'
import * as fs from 'fs/promises'
import * as path from 'path'
import { getAiAdapter, type AiAdapter } from '@/lib/ai'
import { getAiConfig, getPromptOverride, type AiConfig } from '@sol/db'

const PROCESSING_TIMEOUT_MS = 180_000 // 3 minutes

interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

/**
 * Processes a video file through the full pipeline:
 * 1. Transcription (AssemblyAI)
 * 2. Frame extraction (FFmpeg)
 * 3. Frame description (AI Vision)
 * 4. Structure analysis (AI)
 * 5. Full description consolidation
 *
 * Token usage from all AI calls is tracked and saved to VideoAnalysis
 * for future billing calibration.
 */
export async function processVideo(
  videoPath: string,
  videoAnalysisId: string,
  userId: string,
): Promise<void> {
  const startTime = Date.now()
  let framePaths: string[] = []

  try {
    // Mark as processing
    await prisma.videoAnalysis.update({
      where: { id: videoAnalysisId },
      data: { processingStatus: 'PROCESSING' },
    })

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), PROCESSING_TIMEOUT_MS)

    try {
      // Step 1 & 2: Transcription + Frame extraction in parallel
      const [transcriptionResult, frames] = await Promise.all([
        transcribe(videoPath).catch((err) => {
          throw new Error(`Erro na transcrição do vídeo: ${err.message}`)
        }),
        extractFrames(videoPath, 5).catch((err) => {
          throw new Error(`Erro na extração de frames: ${err.message}`)
        }),
      ])

      framePaths = frames

      // Save transcription
      await prisma.videoAnalysis.update({
        where: { id: videoAnalysisId },
        data: { transcription: transcriptionResult.text },
      })

      // Resolve AI adapter once for all Vision calls
      const aiConfig = await getAiConfig()
      const adapter = getAiAdapter(aiConfig.provider)

      // Accumulate token usage across all AI calls
      let totalInput = 0
      let totalOutput = 0

      // Step 3: Describe frames with Vision
      const { text: frameDescriptions, usage: framesUsage, framesAnalyzed } =
        await describeFrames(frames, adapter, aiConfig)

      totalInput += framesUsage.inputTokens
      totalOutput += framesUsage.outputTokens

      await prisma.videoAnalysis.update({
        where: { id: videoAnalysisId },
        data: { frameDescriptions },
      })

      // Step 4: Structure analysis
      const { text: structureAnalysis, usage: structureUsage } =
        await analyzeStructure(
          transcriptionResult.text,
          frameDescriptions,
          adapter,
          aiConfig,
        )

      totalInput += structureUsage.inputTokens
      totalOutput += structureUsage.outputTokens

      await prisma.videoAnalysis.update({
        where: { id: videoAnalysisId },
        data: { structureAnalysis },
      })

      // Step 5: Consolidate full description
      const fullDescription = buildFullDescription(
        transcriptionResult.text,
        frameDescriptions,
        structureAnalysis
      )

      const processingTimeMs = Date.now() - startTime

      await prisma.videoAnalysis.update({
        where: { id: videoAnalysisId },
        data: {
          fullDescription,
          processingStatus: 'COMPLETED',
          processingTimeMs,
          // Token tracking
          totalInputTokens: totalInput,
          totalOutputTokens: totalOutput,
          framesAnalyzed,
          modelUsed: aiConfig.finalModel,
          audioDurationSeconds: transcriptionResult.audioDurationSeconds,
        },
      })

      // Deduct credits for AI token usage + AssemblyAI transcription
      const pricingConfig = await getPricingConfig()
      const aiCredits = calculateCredits(totalInput, totalOutput, pricingConfig)
      const audioDuration = transcriptionResult.audioDurationSeconds ?? 0
      const assemblyAiCredits = calculateAssemblyAiCredits(audioDuration, pricingConfig)
      const creditsUsed = aiCredits + assemblyAiCredits

      try {
        await deductCredits(userId, creditsUsed, {
          inputTokens: totalInput,
          outputTokens: totalOutput,
          modelUsed: aiConfig.finalModel,
          creditsPerMInput: pricingConfig.creditsPerMInput,
          creditsPerMOutput: pricingConfig.creditsPerMOutput,
          conversationTitle: 'Análise de vídeo referência',
          assemblyAiSeconds: audioDuration > 0 ? audioDuration : undefined,
          assemblyAiCredits: assemblyAiCredits > 0 ? assemblyAiCredits : undefined,
        })
        console.log(`[Video Pipeline] Deducted ${creditsUsed} credits from user ${userId} (AI: ${aiCredits}, AssemblyAI: ${assemblyAiCredits})`)
      } catch (err) {
        // Log but don't fail pipeline — video is already processed
        console.error(`[Video Pipeline] Credit deduction failed:`, err)
      }

      // Detailed log for billing calibration
      console.log(`[Video Pipeline] COMPLETED in ${processingTimeMs}ms`)
      console.log(`[Video Pipeline] Token usage:`)
      console.log(`  Frames Vision (${framesAnalyzed} frames): input=${framesUsage.inputTokens} output=${framesUsage.outputTokens}`)
      console.log(`  Structure analysis: input=${structureUsage.inputTokens} output=${structureUsage.outputTokens}`)
      console.log(`  AI tokens: input=${totalInput} output=${totalOutput} => ${aiCredits} credits`)
      console.log(`  Model: ${aiConfig.finalModel} (${aiConfig.provider})`)
      if (audioDuration > 0) {
        console.log(`  AssemblyAI audio: ${audioDuration.toFixed(1)}s => ${assemblyAiCredits} credits (${pricingConfig.creditsPerAssemblyAiMin} credits/min)`)
      }
      console.log(`  TOTAL: ${creditsUsed} credits`)
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no processamento'

    if (error instanceof DOMException && error.name === 'AbortError') {
      await prisma.videoAnalysis.update({
        where: { id: videoAnalysisId },
        data: {
          processingStatus: 'FAILED',
          errorMessage: 'Processamento excedeu o tempo limite de 3 minutos',
          processingTimeMs: Date.now() - startTime,
        },
      })
    } else {
      await prisma.videoAnalysis.update({
        where: { id: videoAnalysisId },
        data: {
          processingStatus: 'FAILED',
          errorMessage,
          processingTimeMs: Date.now() - startTime,
        },
      })
    }

    console.error(`[Video Pipeline] Failed:`, errorMessage)
  } finally {
    // Always cleanup temporary files
    await cleanup(videoPath)
    if (framePaths.length > 0) {
      // Frames are in a directory — cleanup parent dir
      await cleanup(path.dirname(framePaths[0]))
    }
  }
}

/**
 * Describes each frame using AI Vision.
 * Returns combined descriptions + accumulated token usage.
 */
async function describeFrames(
  framePaths: string[],
  adapter: AiAdapter,
  aiConfig: AiConfig,
): Promise<{ text: string; usage: TokenUsage; framesAnalyzed: number }> {
  if (framePaths.length === 0) {
    return { text: 'Nenhum frame extraído', usage: { inputTokens: 0, outputTokens: 0 }, framesAnalyzed: 0 }
  }

  // Limit to 10 frames max to control costs
  const selectedFrames = framePaths.length <= 10
    ? framePaths
    : framePaths.filter((_, i) => i % Math.ceil(framePaths.length / 10) === 0).slice(0, 10)

  const descriptions: string[] = []
  let totalInput = 0
  let totalOutput = 0

  for (let i = 0; i < selectedFrames.length; i++) {
    const frameBuffer = await fs.readFile(selectedFrames[i])
    const base64 = frameBuffer.toString('base64')

    const result = await adapter.complete({
      model: aiConfig.finalModel,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: (await getPromptOverride('PROMPT_VIDEO_FRAME_DESC')) ?? `Descreva este frame de um vídeo em português. Inclua: o que aparece na cena, cenário, ações, texto na tela, expressões faciais, e qualquer elemento visual relevante. Seja conciso (2-3 frases).`,
            },
            {
              type: 'image',
              base64,
              mimeType: 'image/jpeg',
            },
          ],
        },
      ],
      maxTokens: 200,
    })

    totalInput += result.inputTokens
    totalOutput += result.outputTokens
    descriptions.push(`[Frame ${i + 1}/${selectedFrames.length}]: ${result.text || 'Sem descrição'}`)
  }

  return {
    text: descriptions.join('\n\n'),
    usage: { inputTokens: totalInput, outputTokens: totalOutput },
    framesAnalyzed: selectedFrames.length,
  }
}

/**
 * Analyzes the video structure using transcription + frame descriptions.
 * Returns analysis text + token usage.
 */
async function analyzeStructure(
  transcription: string,
  frameDescriptions: string,
  adapter: AiAdapter,
  aiConfig: AiConfig,
): Promise<{ text: string; usage: TokenUsage }> {
  const result = await adapter.complete({
    model: aiConfig.finalModel,
    maxTokens: 1500,
    temperature: 0.3,
    systemPrompt: (await getPromptOverride('PROMPT_VIDEO_STRUCTURE')) ?? `Você é um especialista em análise de vídeos de marketing e anúncios criativos. Analise o vídeo a partir da transcrição e descrição visual dos frames.`,
    messages: [
      {
        role: 'user',
        content: `Analise este vídeo e identifique:

## TRANSCRIÇÃO
${transcription}

## DESCRIÇÃO VISUAL DOS FRAMES
${frameDescriptions}

---

Retorne uma análise estruturada com:
1. **Ganchos usados** — quais técnicas de gancho foram usadas nos primeiros segundos
2. **CTA** — qual o call-to-action e como é apresentado
3. **Estrutura** — como o vídeo é organizado (intro, corpo, conclusão)
4. **Tom de comunicação** — direto, empático, provocador, etc
5. **Técnicas de retenção** — o que mantém o espectador assistindo
6. **Pontos fortes** — o que funciona bem no vídeo
7. **Pontos a melhorar** — o que poderia ser melhor

Responda em português.`,
      },
    ],
  })

  return {
    text: result.text || 'Análise não disponível',
    usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
  }
}

/**
 * Builds the consolidated full description from all analysis results.
 */
function buildFullDescription(
  transcription: string,
  frameDescriptions: string,
  structureAnalysis: string
): string {
  return `# Análise Completa do Vídeo Referência

## Transcrição
${transcription}

## Análise Visual
${frameDescriptions}

## Análise Estrutural
${structureAnalysis}`
}
