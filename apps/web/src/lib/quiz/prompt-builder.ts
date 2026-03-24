// Quiz Prompt Builder — SOL SaaS
// Builds structured prompts for script generation from quiz answers

import { getQuestionByKey } from './questions'

export interface ReferenceContext {
  format: string | null
  adCopy: string | null
  engagement: Record<string, number> | null
  platform: string
  advertiserName: string | null
  searchQuery: string
}

export interface PromptContext {
  onboarding: Record<string, string> // O1-O9
  answers: Record<string, string>    // Q1-Q7, 1A.x/1B.x, 2A.x/2B.x
  path1: 'AD' | 'ORGANIC'
  path2: 'MODELED' | 'FROM_SCRATCH'
  videoAnalysis?: {
    transcription: string
    fullDescription: string
  }
  expertProfile?: Record<string, unknown> | null
  personalContext?: string | null
  reference?: ReferenceContext | null
}

interface BuiltPrompt {
  systemPrompt: string
  userPrompt: string
}

// ---------------------------------------------------------------------------
// System prompts per path combination
// ---------------------------------------------------------------------------

const SYSTEM_PROMPTS: Record<string, string> = {
  AD_MODELED: `Você é o SOL, o maior especialista em roteiros de anúncios criativos do Brasil.
Você vai receber o contexto completo do aluno (produto, público, nicho) e uma análise detalhada de um vídeo referência que funcionou.
Sua missão: criar um roteiro de ANÚNCIO CRIATIVO MODELADO — adaptando a estrutura, gancho, ritmo e CTA do vídeo referência para o produto do aluno.
O roteiro deve ser prático, com marcações de cena, tempo estimado, e instruções de gravação.
Mantenha o estilo e tom do vídeo original, mas adapte 100% para o contexto do aluno.
Formato de saída: Roteiro estruturado com seções claras (Gancho, Desenvolvimento, CTA), tempo por cena, e instruções de câmera/edição.`,

  AD_FROM_SCRATCH: `Você é o SOL, o maior especialista em roteiros de anúncios criativos do Brasil.
Você vai receber o contexto completo do aluno (produto, público, nicho) e as preferências criativas dele.
Sua missão: criar um roteiro de ANÚNCIO CRIATIVO DO ZERO — original, persuasivo e otimizado para conversão.
O roteiro deve ter gancho forte nos primeiros 3 segundos, desenvolvimento que mantém atenção, e CTA claro.
Considere a plataforma de publicação, o tipo de público (frio/morno/quente), e o destino do tráfego.
Formato de saída: Roteiro estruturado com seções claras (Gancho, Desenvolvimento, CTA), tempo por cena, e instruções de câmera/edição.`,

  ORGANIC_MODELED: `Você é o SOL, o maior especialista em roteiros de vídeos orgânicos do Brasil.
Você vai receber o contexto completo do aluno (produto, público, nicho) e uma análise detalhada de um vídeo referência que viralizou.
Sua missão: criar um roteiro de VÍDEO ORGÂNICO MODELADO — adaptando a estrutura, gancho e ritmo do vídeo referência para o conteúdo do aluno.
O roteiro deve ser otimizado para o objetivo de engajamento escolhido (seguidores, comentários, compartilhamentos, etc).
Mantenha a energia e o formato do original, mas adapte para o nicho do aluno.
Formato de saída: Roteiro estruturado com seções claras (Gancho, Desenvolvimento, CTA), tempo por cena, e instruções de câmera/edição.`,

  ORGANIC_FROM_SCRATCH: `Você é o SOL, o maior especialista em roteiros de vídeos orgânicos do Brasil.
Você vai receber o contexto completo do aluno (produto, público, nicho) e as preferências criativas dele.
Sua missão: criar um roteiro de VÍDEO ORGÂNICO DO ZERO — envolvente, autêntico e otimizado para o algoritmo.
O roteiro deve ter gancho irresistível, desenvolvimento que mantém retenção, e CTA natural.
Considere a plataforma, o tamanho da audiência, e o objetivo de engajamento do aluno.
Formato de saída: Roteiro estruturado com seções claras (Gancho, Desenvolvimento, CTA), tempo por cena, e instruções de câmera/edição.`,
}

// ---------------------------------------------------------------------------
// Build prompt from quiz context
// ---------------------------------------------------------------------------

export function buildQuizPrompt(context: PromptContext): BuiltPrompt {
  const { onboarding, answers, path1, path2, videoAnalysis } = context

  const systemKey = `${path1}_${path2}`
  const systemPrompt = SYSTEM_PROMPTS[systemKey] ?? SYSTEM_PROMPTS.AD_FROM_SCRATCH

  const sections: string[] = []

  // Section 1: Onboarding profile
  sections.push('## PERFIL DO PRODUTO')
  sections.push(formatAnswer('O1', 'Produto/Serviço', onboarding))
  sections.push(formatAnswer('O2', 'Promessa/Resultado', onboarding))
  sections.push(formatAnswer('O3', 'Público-alvo', onboarding))
  sections.push(formatAnswer('O4', 'Principal dor do público', onboarding))
  sections.push(formatAnswer('O5', 'Diferencial competitivo', onboarding))
  sections.push(formatAnswerWithLabel('O6', 'Nível de consciência do público', onboarding))
  sections.push(formatAnswerWithLabel('O7', 'Faixa de preço', onboarding))
  sections.push(formatAnswerWithLabel('O8', 'Rede social principal', onboarding))
  sections.push(formatAnswerWithLabel('O9', 'Experiência com anúncios', onboarding))

  // Section 2: Quiz initial
  sections.push('')
  sections.push('## DEFINIÇÕES DO QUIZ')
  sections.push(formatAnswerWithLabel('Q3', 'Aparecendo ou sem aparecer', answers))
  if (answers['Q3.1']) {
    sections.push(formatAnswerWithLabel('Q3.1', 'Formato de produção (sem aparecer)', answers))
  }
  sections.push(formatAnswer('Q4', 'Objetivo detalhado', answers))
  sections.push(formatAnswerWithLabel('Q5', 'Gênero do público', answers))
  sections.push(formatAnswerWithLabel('Q6', 'Faixa etária', answers))
  sections.push(formatAnswerWithLabel('Q7', 'Plataforma principal', answers))

  // Section 3: Path 1 (AD or ORGANIC)
  if (path1 === 'AD') {
    sections.push('')
    sections.push('## DETALHES DO ANÚNCIO CRIATIVO')
    sections.push(formatAnswerWithLabel('1A.1', 'Tipo de público', answers))
    sections.push(formatAnswerWithLabel('1A.2', 'Destino do tráfego', answers))
    if (answers['1A.3']) {
      sections.push(formatAnswer('1A.3', 'Criativos que funcionaram', answers))
    }
    sections.push(formatAnswerWithLabel('1A.4', 'Budget para anúncios', answers))
    sections.push(formatAnswerWithLabel('1A.5', 'Abordagem principal', answers))
  } else {
    sections.push('')
    sections.push('## DETALHES DO VÍDEO ORGÂNICO')
    sections.push(formatAnswerWithLabel('1B.1', 'Tipo de público/funil', answers))
    sections.push(formatAnswerWithLabel('1B.2', 'Objetivo de engajamento', answers))
    sections.push(formatAnswerWithLabel('1B.3', 'Tamanho da audiência', answers))
  }

  // Section 4: Path 2 (MODELED or FROM_SCRATCH)
  if (path2 === 'MODELED') {
    sections.push('')
    sections.push('## DETALHES DO VÍDEO REFERÊNCIA (MODELAR)')
    sections.push(formatAnswerWithLabel('2A.1', 'Mesmo nicho?', answers))
    sections.push(formatAnswerWithLabel('2A.3', 'Contexto do áudio', answers))
    sections.push(formatAnswerWithLabel('2A.4', 'Formato desejado', answers))
    sections.push(formatAnswerWithLabel('2A.5', 'Emoção gerada', answers))
    if (answers['2A.6']) {
      sections.push(formatAnswer('2A.6', 'Comentários mais curtidos', answers))
    }
    if (answers['2A.7']) {
      sections.push(formatAnswer('2A.7', 'O que funcionou bem', answers))
    }
    sections.push(formatAnswerWithLabel('2A.8', 'Tom de comunicação', answers))
    sections.push(formatAnswer('2A.9', 'Local do vídeo', answers))
    sections.push(formatAnswer('2A.10', 'O que mais chamou atenção', answers))
    sections.push(formatAnswer('2A.11', 'CTA desejado', answers))
    sections.push(formatAnswerWithLabel('2A.12', 'Prova social', answers))
    if (answers['2A.13']) {
      sections.push(formatAnswer('2A.13', 'O que NÃO gostou', answers))
    }

    // Video analysis (if available)
    if (videoAnalysis) {
      sections.push('')
      sections.push('## ANÁLISE DO VÍDEO REFERÊNCIA (IA)')
      sections.push(videoAnalysis.fullDescription)
    }
  } else {
    sections.push('')
    sections.push('## DETALHES DO VÍDEO DO ZERO')
    sections.push(formatAnswer('2B.1', 'Tema principal', answers))
    sections.push(formatAnswerWithLabel('2B.2', 'Emoção desejada', answers))
    if (answers['2B.3']) {
      sections.push(formatAnswer('2B.3', 'Gancho em mente', answers))
    }
    sections.push(formatAnswerWithLabel('2B.4', 'Tipo de gancho', answers))
    sections.push(formatAnswer('2B.5', 'Local de gravação', answers))
    sections.push(formatAnswerWithLabel('2B.6', 'Formato', answers))
    sections.push(formatAnswerWithLabel('2B.7', 'Duração desejada', answers))
    sections.push(formatAnswer('2B.8', 'CTA desejado', answers))
    sections.push(formatAnswerWithLabel('2B.9', 'Tom de comunicação', answers))
    sections.push(formatAnswerWithLabel('2B.10', 'Prova social', answers))
    if (answers['2B.11']) {
      sections.push(formatAnswer('2B.11', 'O que NÃO quer no vídeo', answers))
    }
  }

  // Reference context (Epic 12 — Ad Intelligence)
  if (context.reference) {
    sections.push('')
    sections.push('## REFERÊNCIA CRIATIVA SELECIONADA')
    if (context.reference.format) {
      sections.push(`**Formato classificado:** ${context.reference.format}`)
    }
    if (context.reference.adCopy) {
      sections.push(`**Texto do anúncio/post:** ${context.reference.adCopy}`)
    }
    sections.push(`**Plataforma:** ${context.reference.platform}`)
    if (context.reference.advertiserName) {
      sections.push(`**Anunciante/Criador:** ${context.reference.advertiserName}`)
    }
    if (context.reference.engagement) {
      const metrics = Object.entries(context.reference.engagement)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}: ${v.toLocaleString('pt-BR')}`)
        .join(', ')
      if (metrics) {
        sections.push(`**Métricas de engajamento:** ${metrics}`)
      }
    }
    sections.push(`**Termo de busca:** ${context.reference.searchQuery}`)
    sections.push('')
    sections.push('Use esta referência como inspiração para o roteiro: adapte o formato, gancho e estrutura para o contexto do aluno.')
  }

  sections.push('')
  sections.push('---')
  sections.push('Com base em TODAS as informações acima, gere o roteiro completo.')

  return {
    systemPrompt,
    userPrompt: sections.join('\n'),
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAnswer(key: string, label: string, map: Record<string, string>): string {
  const value = map[key]
  if (!value) return `**${label}:** (não informado)`
  return `**${label}:** ${value}`
}

function formatAnswerWithLabel(key: string, label: string, map: Record<string, string>): string {
  const value = map[key]
  if (!value) return `**${label}:** (não informado)`

  const question = getQuestionByKey(key)
  if (question?.options) {
    const option = question.options.find((o) => o.key === value)
    if (option) {
      return `**${label}:** ${option.label}`
    }
  }
  return `**${label}:** ${value}`
}
