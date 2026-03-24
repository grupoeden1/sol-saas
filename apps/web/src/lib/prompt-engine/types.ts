// Prompt Engine Types — SOL SaaS

export interface MarketClassification {
  awarenessLevel: number     // 1-5 Schwartz
  sophisticationLevel: number // 1-5
  awarenessJustification: string
  sophisticationJustification: string
}

export interface PromptModule {
  id: string
  name: string
  description: string
  content: string
}

export interface AssembledPrompt {
  systemPrompt: string
  userPrompt: string
  modulesUsed: string[]
}
