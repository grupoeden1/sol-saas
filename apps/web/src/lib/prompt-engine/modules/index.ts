// Prompt Engine — Layer 2: Contextual Module Selection
// Modules are selected based on MarketClassification + path combination.
// Overrides can be configured via admin panel (AppConfig).

import { getPromptOverride } from '@sol/db'
import type { MarketClassification, PromptModule } from '../types'

// ─── Default Module Contents ────────────────────────────────────────────────

const DEFAULT_EDUCATION = `## MÓDULO: EDUCAÇÃO DO PROBLEMA
O público-alvo tem BAIXA CONSCIÊNCIA — muitos nem sabem que têm o problema.
Estratégias obrigatórias:
- Comece com uma PERGUNTA ou CENÁRIO que faça o espectador se identificar
- Descreva o problema de forma vívida antes de falar da solução
- Use analogias e exemplos do dia-a-dia
- Evite jargão técnico — fale a linguagem do público
- O gancho deve provocar curiosidade sobre o problema, não sobre o produto
- CTA deve ser suave — "saiba mais" em vez de "compre agora"`

const DEFAULT_TRUST = `## MÓDULO: CONSTRUÇÃO DE CONFIANÇA
O público-alvo já CONHECE soluções similares — precisa de confiança para escolher esta.
Estratégias obrigatórias:
- Inclua elementos de PROVA: resultados, números, depoimentos, cases
- Mostre DIFERENCIAL claro — por que esta solução, não as outras?
- Use linguagem de autoridade sem ser arrogante
- Antecipe e responda objeções comuns
- O gancho pode ser mais direto sobre o benefício principal
- CTA pode ser mais assertivo — o público já entende o que está comprando`

const DEFAULT_DIFFERENTIATION = `## MÓDULO: DIFERENCIAÇÃO AGRESSIVA
O mercado está SATURADO ou CÉTICO — o público já viu tudo.
Estratégias obrigatórias:
- Abordagem CONTRAINTUITIVA — quebre padrões esperados
- Critique a abordagem convencional (sem citar concorrentes)
- Apresente um MECANISMO ÚNICO — por que funciona de forma diferente
- Use linguagem ousada e provocadora
- O gancho deve ser DISRUPTIVO — algo que o público nunca ouviu
- Evite clichês do nicho — "método comprovado", "resultados garantidos"
- CTA com senso de exclusividade`

const DEFAULT_URGENCY = `## MÓDULO: URGÊNCIA E ESCASSEZ
O mercado é NOVO ou com poucos concorrentes — oportunidade de first-mover.
Estratégias obrigatórias:
- Enfatize a OPORTUNIDADE — "antes que todos descubram"
- Use dados de timing — tendência crescente, janela de oportunidade
- Crie urgência legítima — sem falsas escassez
- Mostre o custo da inação — o que acontece se não agir agora
- O gancho pode ser sobre uma tendência ou oportunidade emergente
- CTA com senso de temporalidade`

const DEFAULT_SOCIAL_PROOF = `## MÓDULO: PROVA SOCIAL
Integre elementos de prova social de forma natural no roteiro:
- Mencione quantidade de alunos/clientes/resultados quando disponível
- Sugira momentos para inserir depoimentos ou prints de resultados
- Use linguagem que implica comunidade — "milhares de pessoas", "nossos alunos"
- Se possível, inclua um breve case de sucesso contextualizado
- A prova social deve reforçar o argumento principal, não ser o foco`

// ─── Module Builder ─────────────────────────────────────────────────────────

async function buildModule(
  id: string,
  name: string,
  description: string,
  promptKey: 'PROMPT_MODULE_EDUCATION' | 'PROMPT_MODULE_TRUST' | 'PROMPT_MODULE_DIFFERENTIATION' | 'PROMPT_MODULE_URGENCY' | 'PROMPT_MODULE_SOCIAL_PROOF',
  defaultContent: string,
): Promise<PromptModule> {
  const override = await getPromptOverride(promptKey)
  return { id, name, description, content: override ?? defaultContent }
}

// ─── Module Selection Logic ────────────────────────────────────────────────

export async function selectModules(
  classification: MarketClassification,
  _path1: 'AD' | 'ORGANIC',
  _path2: 'MODELED' | 'FROM_SCRATCH',
): Promise<PromptModule[]> {
  const modules: PromptModule[] = []

  // Awareness-based selection
  if (classification.awarenessLevel <= 2) {
    modules.push(await buildModule('education', 'Educação do Problema', 'Para público com baixa consciência (awareness 1-2). Educa sobre o problema antes de apresentar a solução.', 'PROMPT_MODULE_EDUCATION', DEFAULT_EDUCATION))
  } else if (classification.awarenessLevel >= 3 && classification.awarenessLevel <= 4) {
    modules.push(await buildModule('trust', 'Construção de Confiança', 'Para público com consciência média (awareness 3-4). Constrói confiança e diferenciação.', 'PROMPT_MODULE_TRUST', DEFAULT_TRUST))
  }
  // awareness 5 = most aware, no extra module needed

  // Sophistication-based selection
  if (classification.sophisticationLevel >= 4) {
    modules.push(await buildModule('differentiation', 'Diferenciação Agressiva', 'Para mercados saturados (sophistication 4-5). Foco em se destacar da concorrência.', 'PROMPT_MODULE_DIFFERENTIATION', DEFAULT_DIFFERENTIATION))
  } else if (classification.sophisticationLevel <= 2) {
    modules.push(await buildModule('urgency', 'Urgência e Escassez', 'Para mercados novos (sophistication 1-2). Cria urgência natural e escassez legítima.', 'PROMPT_MODULE_URGENCY', DEFAULT_URGENCY))
  }

  // Always include social proof
  modules.push(await buildModule('social-proof', 'Prova Social', 'Módulo universal. Integra elementos de prova social no roteiro.', 'PROMPT_MODULE_SOCIAL_PROOF', DEFAULT_SOCIAL_PROOF))

  return modules
}
