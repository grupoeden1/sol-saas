// Prompt Engine — SOL SaaS
// 3-layer prompt assembly: Base Fixa + Módulos Contextuais + Biblioteca de Padrões
//
// Layer 1: Fixed base prompt per path combination (AD/ORGANIC × MODELED/FROM_SCRATCH)
// Layer 2: Contextual modules selected by MarketClassification (awareness + sophistication)
// Layer 3: Pattern library loaded from DB by niche (populated by Epic 8.6)

import { getBasePrompt } from './base'
import { selectModules } from './modules'
import { loadPatterns } from './patterns'
import { buildQuizPrompt, type PromptContext } from '../quiz/prompt-builder'
import type { MarketClassification, AssembledPrompt } from './types'

/**
 * Assembles the full prompt using the 3-layer architecture.
 *
 * @param context - Quiz context (onboarding, answers, paths, videoAnalysis)
 * @param classification - Market classification from classifyMarket()
 * @returns Assembled prompt with systemPrompt, userPrompt, and modulesUsed
 */
export async function assemblePrompt(
  context: PromptContext,
  classification: MarketClassification,
): Promise<AssembledPrompt> {
  // Layer 1: Base prompt (fixed per path combination)
  const base = await getBasePrompt(context.path1, context.path2)

  // Layer 2: Contextual modules (selected by classification)
  const modules = await selectModules(classification, context.path1, context.path2)
  const moduleContent = modules.map(m => m.content).join('\n\n')

  // Layer 3: Pattern library (from DB or static, by niche)
  const niche = context.onboarding['O1'] ?? ''
  const patterns = loadPatterns(niche)

  // Assemble system prompt: base + modules + patterns
  const systemParts = [base, moduleContent]
  if (patterns) {
    systemParts.push(`## PADRÕES DE SUCESSO DO NICHO\n${patterns}`)
  }

  // Expert profile injection (when user opted in)
  const modulesUsed = modules.map(m => m.id)
  if (context.expertProfile) {
    const profileSection = formatExpertProfile(context.expertProfile)
    if (profileSection) {
      systemParts.push(profileSection)
      modulesUsed.push('expert-profile')
    }
  }

  // Personal context injection (free text from options B/D)
  if (context.personalContext) {
    systemParts.push(`## CONTEXTO PESSOAL DO ALUNO\n${context.personalContext}`)
    modulesUsed.push('personal-context')
  }

  // Creative reference injection (Epic 12 — Ad Intelligence)
  if (context.reference) {
    modulesUsed.push('creative-reference')
  }

  const systemPrompt = systemParts.join('\n\n---\n\n')

  // User prompt: reuse existing buildQuizPrompt for structured context
  const { userPrompt } = buildQuizPrompt(context)

  return {
    systemPrompt,
    userPrompt,
    modulesUsed,
  }
}

export type { MarketClassification, AssembledPrompt, PromptModule } from './types'

// ─── Expert Profile Formatting ───────────────────────────────────────────

function formatExpertProfile(profile: Record<string, unknown>): string {
  const sections: string[] = []

  const addIfPresent = (label: string, value: unknown) => {
    if (value && value !== '' && !(Array.isArray(value) && value.length === 0)) {
      sections.push(`- ${label}: ${Array.isArray(value) ? value.join(', ') : value}`)
    }
  }

  sections.push('## PERFIL PESSOAL DO EXPERT')
  addIfPresent('Nome', profile.fullName)
  addIfPresent('Idade', profile.age)
  addIfPresent('Localização', profile.location)
  addIfPresent('Ocupação', profile.occupation)
  addIfPresent('Estilo de comunicação', profile.communicationStyle)
  addIfPresent('Tom preferido', profile.preferredTone)
  addIfPresent('Usa humor', profile.usesHumor)
  addIfPresent('Expressões comuns', profile.commonExpressions)
  addIfPresent('Evitar expressões', profile.avoidExpressions)
  addIfPresent('Valores centrais', profile.coreValues)
  addIfPresent('Frustração com mercado', profile.marketFrustration)
  addIfPresent('Evitar tópicos', profile.avoidTopics)
  addIfPresent('Bio', profile.bio)
  addIfPresent('Origem na carreira', profile.careerOrigin)
  addIfPresent('Momento mais difícil', profile.hardestMoment)
  addIfPresent('Maior orgulho', profile.proudestMoment)
  addIfPresent('História pessoal', profile.personalStory)
  addIfPresent('Identidade da audiência', profile.audienceIdentity)
  addIfPresent('Nome da comunidade', profile.communityName)
  addIfPresent('Inspirações', profile.inspirations)

  // Only return if we have actual content beyond the header
  return sections.length > 1 ? sections.join('\n') : ''
}
