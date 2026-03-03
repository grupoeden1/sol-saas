// Video Processing Pipeline — SOL SaaS
// Orchestrates: AssemblyAI transcription + FFmpeg frame extraction + GPT-4o analysis

import { prisma } from '@sol/db'
import { transcribe } from './assemblyai'
import { extractFrames, cleanup } from './ffmpeg'
import * as fs from 'fs/promises'
import OpenAI from 'openai'

const PROCESSING_TIMEOUT_MS = 180_000 // 3 minutes

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

/**
 * Processes a video file through the full pipeline:
 * 1. Transcription (AssemblyAI)
 * 2. Frame extraction (FFmpeg)
 * 3. Frame description (GPT-4o Vision)
 * 4. Structure analysis (GPT-4o)
 * 5. Full description consolidation
 */
export async function processVideo(
  videoPath: string,
  videoAnalysisId: string
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

      // Step 3: Describe frames with GPT-4o Vision
      const frameDescriptions = await describeFrames(frames)

      await prisma.videoAnalysis.update({
        where: { id: videoAnalysisId },
        data: { frameDescriptions },
      })

      // Step 4: Structure analysis with GPT-4o
      const structureAnalysis = await analyzeStructure(
        transcriptionResult.text,
        frameDescriptions
      )

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
        },
      })

      console.log(`[Video Pipeline] Completed in ${processingTimeMs}ms`)
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
      const framesDir = framePaths[0].substring(0, framePaths[0].lastIndexOf('/'))
      if (framesDir) {
        await cleanup(framesDir)
      }
    }
  }
}

/**
 * Describes each frame using GPT-4o Vision.
 * Returns combined descriptions.
 */
async function describeFrames(framePaths: string[]): Promise<string> {
  if (framePaths.length === 0) return 'Nenhum frame extraído'

  // Limit to 10 frames max to control costs
  const selectedFrames = framePaths.length <= 10
    ? framePaths
    : framePaths.filter((_, i) => i % Math.ceil(framePaths.length / 10) === 0).slice(0, 10)

  const descriptions: string[] = []

  for (let i = 0; i < selectedFrames.length; i++) {
    const frameBuffer = await fs.readFile(selectedFrames[i])
    const base64 = frameBuffer.toString('base64')

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Descreva este frame de um vídeo em português. Inclua: o que aparece na cena, cenário, ações, texto na tela, expressões faciais, e qualquer elemento visual relevante. Seja conciso (2-3 frases).`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'low' },
            },
          ],
        },
      ],
      max_tokens: 200,
    })

    const description = response.choices[0]?.message?.content ?? 'Sem descrição'
    descriptions.push(`[Frame ${i + 1}/${selectedFrames.length}]: ${description}`)
  }

  return descriptions.join('\n\n')
}

/**
 * Analyzes the video structure using transcription + frame descriptions.
 */
async function analyzeStructure(
  transcription: string,
  frameDescriptions: string
): Promise<string> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Você é um especialista em análise de vídeos de marketing e anúncios criativos. Analise o vídeo a partir da transcrição e descrição visual dos frames.`,
      },
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
    temperature: 0.3,
    max_tokens: 1500,
  })

  return response.choices[0]?.message?.content ?? 'Análise não disponível'
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
