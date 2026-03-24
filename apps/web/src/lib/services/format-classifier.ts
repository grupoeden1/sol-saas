/**
 * Automatic Creative Format Classifier (Epic 12)
 *
 * Uses Claude Vision (claude-haiku-4-5) to classify creative references into
 * one of 18 predefined ad formats commonly found in the Brazilian infoproduct
 * market. Results are cached in the creative_references table so we only call
 * the API once per reference.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@sol/db'

// ---------------------------------------------------------------------------
// Constants & Types
// ---------------------------------------------------------------------------

export const CREATIVE_FORMATS = [
  'TOP_5',
  'BEFORE_AFTER',
  'THIS_OR_THAT',
  'TESTIMONIAL',
  'TUTORIAL',
  'INFORMATIVE',
  'LOW_FI',
  'PROVOCATION',
  'QUESTION',
  'RANKING',
  'CURIOSITY',
  'TRANSFORMATION',
  'BEHIND_SCENES',
  'UNBOXING',
  'POV',
  'STORYTELLING',
  'CHALLENGE',
  'OTHER',
] as const

export type CreativeFormat = (typeof CREATIVE_FORMATS)[number]

export interface ClassificationResult {
  format: CreativeFormat
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  reasoning: string
}

// ---------------------------------------------------------------------------
// Anthropic client (lazy singleton — same pattern as anthropic-adapter)
// ---------------------------------------------------------------------------

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert creative analyst specialising in Brazilian digital infoproducts and paid traffic ads.

Your task is to classify a creative (image and/or ad copy) into exactly ONE of the formats listed below.

FORMATS:
- TOP_5: Listas com contagem. Ex: "5 alimentos que queimam gordura", "Top 3 exercícios para glúteos".
- BEFORE_AFTER: Transformação visual lado a lado. Ex: "Antes e depois da dieta", comparação clara de estado anterior vs posterior.
- THIS_OR_THAT: Comparação direta entre duas opções. Ex: "Pilates vs Academia: qual emagrece mais?", "Café ou chá verde?".
- TESTIMONIAL: Depoimento de aluno ou cliente. Relato pessoal de resultado, print de conversa, vídeo selfie contando experiência.
- TUTORIAL: Passo a passo, demonstração prática. Ex: "Como fazer X em Y minutos", instruções visuais numeradas.
- INFORMATIVE: Dado, estatística ou informação chocante/educativa. Ex: "92% das dietas falham por este motivo", fato surpreendente.
- LOW_FI: Filmado no celular, sem produção profissional, estética autêntica/caseira. Parece conteúdo orgânico, não anúncio.
- PROVOCATION: Declaração polêmica ou provocativa. Ex: "Pare de fazer cardio em jejum", "Você está fazendo tudo errado".
- QUESTION: Pergunta direta ao espectador. Ex: "Você sabia que..?", "Qual desses você prefere?", "Já tentou isso?".
- RANKING: Classificação ou ranking de itens ordenados. Ex: "Ranking dos melhores suplementos", escala de melhor a pior.
- CURIOSITY: Gatilho de curiosidade forte. Ex: "Você não vai acreditar no que aconteceu", "O segredo que ninguém conta", cliffhanger.
- TRANSFORMATION: Jornada de mudança visível (mais narrativa que BEFORE_AFTER). Mostra o processo, não só o antes/depois.
- BEHIND_SCENES: Bastidores, dia a dia, rotina. Ex: "Um dia na minha vida", "Como é trabalhar com X".
- UNBOXING: Abertura, revelação ou demonstração de produto/material recebido.
- POV: Ponto de vista em primeira pessoa. Câmera simula perspectiva do espectador, texto em overlay "POV:...".
- STORYTELLING: Narrativa com arco dramático (conflito → desenvolvimento → resolução). Mini-história envolvente.
- CHALLENGE: Desafio viral. Ex: "Desafio de 7 dias", "Tente fazer isso", convite a participar.
- OTHER: Não se encaixa em nenhum formato acima.

RULES:
1. Choose exactly ONE format.
2. Return ONLY valid JSON (no markdown, no extra text).
3. Use the schema: { "format": "<FORMAT>", "confidence": "HIGH" | "MEDIUM" | "LOW", "reasoning": "<one sentence in Portuguese>" }
4. HIGH = very clear match; MEDIUM = likely match but ambiguous; LOW = weak signal / best guess.
5. If both image and ad copy are provided, consider both together.`

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

interface ClassifyInput {
  imageUrl?: string
  imageBase64?: string
  adCopy?: string
}

export async function classifyFormat(input: ClassifyInput): Promise<ClassificationResult> {
  const content: Anthropic.MessageCreateParams['messages'][0]['content'] = []

  if (input.imageUrl) {
    content.push({
      type: 'image',
      source: { type: 'url', url: input.imageUrl },
    })
  } else if (input.imageBase64) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: input.imageBase64,
      },
    })
  }

  const textParts: string[] = []
  if (input.adCopy) {
    textParts.push(`Ad copy:\n"""${input.adCopy}"""`)
  }
  textParts.push('Classify this creative into one of the formats. Return JSON only.')

  content.push({ type: 'text', text: textParts.join('\n\n') })

  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
    temperature: 0,
  })

  const rawText =
    response.content[0]?.type === 'text' ? response.content[0].text : ''

  let parsed: ClassificationResult
  try {
    parsed = JSON.parse(rawText)
  } catch {
    return { format: 'OTHER', confidence: 'LOW', reasoning: 'Falha ao parsear resposta da IA.' }
  }

  // Validate format value
  if (!CREATIVE_FORMATS.includes(parsed.format)) {
    return { format: 'OTHER', confidence: 'LOW', reasoning: parsed.reasoning ?? 'Formato retornado inválido.' }
  }

  return parsed
}

// ---------------------------------------------------------------------------
// Batch classification
// ---------------------------------------------------------------------------

export async function classifyBatch(
  refs: Array<{ imageUrl?: string; adCopy?: string }>,
  limit: number = 5,
): Promise<Array<ClassificationResult | null>> {
  const slice = refs.slice(0, limit)

  const results = await Promise.all(
    slice.map(async (ref): Promise<ClassificationResult | null> => {
      try {
        return await classifyFormat(ref)
      } catch {
        return null
      }
    }),
  )

  return results
}

// ---------------------------------------------------------------------------
// Cache check
// ---------------------------------------------------------------------------

export async function getCachedClassification(
  sourceUrl: string,
): Promise<ClassificationResult | null> {
  const ref = await prisma.creativeReference.findFirst({
    where: { sourceUrl },
    select: { formatClassification: true },
  })

  if (!ref?.formatClassification) return null

  try {
    const cached: ClassificationResult = JSON.parse(ref.formatClassification)
    return cached
  } catch {
    // formatClassification may be a plain string (legacy); wrap it
    const format = ref.formatClassification as string
    if (CREATIVE_FORMATS.includes(format as CreativeFormat)) {
      return {
        format: format as CreativeFormat,
        confidence: 'HIGH',
        reasoning: 'Classificação recuperada do cache.',
      }
    }
    return null
  }
}
