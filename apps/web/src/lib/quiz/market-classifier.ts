// Market Classifier — SOL SaaS
// Classifies awareness (Schwartz 1-5) and sophistication (1-5) levels
// using Claude Haiku before script generation.

import { getAiAdapter } from '@/lib/ai'
import { getAiConfig, getPromptOverride } from '@sol/db'
import type { MarketClassification } from '../prompt-engine/types'

const DEFAULT_CLASSIFICATION_PROMPT = `Você é um especialista em marketing direto e copywriting. Analise o contexto do aluno e classifique o mercado dele em duas dimensões.

## 1. Nível de Consciência (Schwartz, 1-5)

1 = **Inconsciente** — O público não sabe que tem o problema. Precisa ser educado.
2 = **Consciente do problema** — Sabe que tem o problema, mas não conhece soluções.
3 = **Consciente da solução** — Sabe que existem soluções, mas não conhece esta específica.
4 = **Consciente do produto** — Conhece este produto/serviço, mas ainda não comprou.
5 = **Mais consciente** — Já conhece, confia e está pronto para comprar.

## 2. Sofisticação de Mercado (1-5)

1 = **Mercado virgem** — Nenhum concorrente relevante. Público nunca viu ofertas assim.
2 = **Poucos concorrentes** — Mercado emergente, poucas opções.
3 = **Competitivo** — Múltiplas opções, público compara antes de decidir.
4 = **Saturado** — Muitas opções, público cansado de ver a mesma coisa.
5 = **Cético** — Público desconfia de qualquer oferta, muita promessa quebrada.

## Instruções

Analise os dados fornecidos e responda EXCLUSIVAMENTE com um JSON válido, sem texto adicional:
{
  "awarenessLevel": <1-5>,
  "sophisticationLevel": <1-5>,
  "awarenessJustification": "<justificativa em 1-2 frases>",
  "sophisticationJustification": "<justificativa em 1-2 frases>"
}`

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function buildClassificationContext(
  quizAnswers: Record<string, string>,
  onboardingProfile: Record<string, string>,
): string {
  const parts: string[] = []

  if (onboardingProfile['O1']) parts.push(`Produto/Serviço: ${onboardingProfile['O1']}`)
  if (onboardingProfile['O2']) parts.push(`Promessa/Resultado: ${onboardingProfile['O2']}`)
  if (onboardingProfile['O3']) parts.push(`Público-alvo: ${onboardingProfile['O3']}`)
  if (onboardingProfile['O4']) parts.push(`Principal dor: ${onboardingProfile['O4']}`)
  if (onboardingProfile['O5']) parts.push(`Diferencial: ${onboardingProfile['O5']}`)
  if (onboardingProfile['O6']) parts.push(`Nível de consciência (auto-declarado): ${onboardingProfile['O6']}`)
  if (onboardingProfile['O7']) parts.push(`Faixa de preço: ${onboardingProfile['O7']}`)
  if (onboardingProfile['O9']) parts.push(`Experiência com anúncios: ${onboardingProfile['O9']}`)
  if (quizAnswers['Q4']) parts.push(`Objetivo: ${quizAnswers['Q4']}`)

  return parts.join('\n')
}

/**
 * Classifies the market awareness and sophistication levels.
 * Uses Claude Haiku with temperature=0 for deterministic results.
 * Falls back to defaults (3, 3) on error or timeout (10s).
 */
export async function classifyMarket(
  quizAnswers: Record<string, string>,
  onboardingProfile: Record<string, string>,
): Promise<MarketClassification> {
  const context = buildClassificationContext(quizAnswers, onboardingProfile)

  if (!context.trim()) {
    console.warn('[Market Classifier] No context available, using defaults')
    return defaultClassification()
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000) // 10s timeout

  try {
    const aiConfig = await getAiConfig()
    const adapter = getAiAdapter(aiConfig.provider)

    const classificationPrompt = (await getPromptOverride('PROMPT_MARKET_CLASSIFIER')) ?? DEFAULT_CLASSIFICATION_PROMPT

    const result = await adapter.complete({
      model: aiConfig.defaultModel,
      systemPrompt: classificationPrompt,
      messages: [{ role: 'user', content: context }],
      maxTokens: 500,
      temperature: 0,
      signal: controller.signal,
    })

    const text = result.text

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('[Market Classifier] No JSON found in response:', text)
      return defaultClassification()
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      awarenessLevel: clamp(parsed.awarenessLevel ?? 3, 1, 5),
      sophisticationLevel: clamp(parsed.sophisticationLevel ?? 3, 1, 5),
      awarenessJustification: parsed.awarenessJustification ?? '',
      sophisticationJustification: parsed.sophisticationJustification ?? '',
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.warn('[Market Classifier] Timeout (10s), using defaults')
    } else {
      console.warn('[Market Classifier] Error, using defaults:', error instanceof Error ? error.message : error)
    }
    return defaultClassification()
  } finally {
    clearTimeout(timeout)
  }
}

function defaultClassification(): MarketClassification {
  return {
    awarenessLevel: 3,
    sophisticationLevel: 3,
    awarenessJustification: 'Classificação automática indisponível — usando padrão (consciente da solução).',
    sophisticationJustification: 'Classificação automática indisponível — usando padrão (mercado competitivo).',
  }
}
