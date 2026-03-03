// Quiz Question Definitions — SOL SaaS
// All 48 questions across 6 sections (O1-O9, Q1-Q7+Q3.1, 1A.1-1A.5, 1B.1-1B.3, 2A.1-2A.13, 2B.1-2B.11)

export type QuizSectionType =
  | 'ONBOARDING'
  | 'INITIAL'
  | 'AD_CREATIVE'
  | 'ORGANIC_VIDEO'
  | 'MODELED_VIDEO'
  | 'FROM_SCRATCH_VIDEO'

export type QuestionType = 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'UPLOAD'

export interface QuestionOption {
  key: string
  label: string
}

export interface ShowWhenCondition {
  questionKey: string
  value: string | string[]
}

export interface QuestionDefinition {
  questionKey: string
  section: QuizSectionType
  type: QuestionType
  title: string
  example?: string
  options?: QuestionOption[]
  required: boolean
  showWhen?: ShowWhenCondition
}

// ---------------------------------------------------------------------------
// Section 1: ONBOARDING (O1–O9) — Filled once per profile, not per quiz
// ---------------------------------------------------------------------------

export const ONBOARDING_QUESTIONS: QuestionDefinition[] = [
  {
    questionKey: 'O1',
    section: 'ONBOARDING',
    type: 'TEXT',
    title: 'Descreva seu produto/serviço de forma detalhada',
    example: 'Ex: curso online de emagrecimento, R$197, entrego em videoaulas gravadas',
    required: true,
  },
  {
    questionKey: 'O2',
    section: 'ONBOARDING',
    type: 'TEXT',
    title: 'Promessa ou resultado que o produto entrega',
    example: 'Ex: perder 3kg em 5 dias com a dieta da selva',
    required: true,
  },
  {
    questionKey: 'O3',
    section: 'ONBOARDING',
    type: 'TEXT',
    title: 'Qual o público-alvo do seu produto?',
    example: 'Ex: mulheres 30-50 anos que querem emagrecer',
    required: true,
  },
  {
    questionKey: 'O4',
    section: 'ONBOARDING',
    type: 'TEXT',
    title: 'Qual a principal dor/problema do seu público?',
    example: 'Ex: não conseguem perder peso com dietas restritivas',
    required: true,
  },
  {
    questionKey: 'O5',
    section: 'ONBOARDING',
    type: 'TEXT',
    title: 'Qual seu diferencial competitivo?',
    example: 'Ex: método sem restrição alimentar com suporte individual',
    required: true,
  },
  {
    questionKey: 'O6',
    section: 'ONBOARDING',
    type: 'SINGLE_SELECT',
    title: 'O público já sabe que tem o problema que você resolve?',
    options: [
      { key: 'A', label: 'Não sabem que têm o problema' },
      { key: 'B', label: 'Sabem que têm, mas não conhecem soluções' },
      { key: 'C', label: 'Conhecem soluções, mas não a sua' },
      { key: 'D', label: 'SOL define' },
    ],
    required: true,
  },
  {
    questionKey: 'O7',
    section: 'ONBOARDING',
    type: 'SINGLE_SELECT',
    title: 'Faixa de preço do produto',
    options: [
      { key: 'A', label: 'Até R$97' },
      { key: 'B', label: 'R$97–R$297' },
      { key: 'C', label: 'R$297–R$997' },
      { key: 'D', label: 'R$997–R$2.997' },
      { key: 'E', label: '+R$2.997' },
    ],
    required: true,
  },
  {
    questionKey: 'O8',
    section: 'ONBOARDING',
    type: 'SINGLE_SELECT',
    title: 'Em qual(is) rede(s) social(is) você publica?',
    options: [
      { key: 'A', label: 'Instagram' },
      { key: 'B', label: 'TikTok' },
      { key: 'C', label: 'Ambos' },
      { key: 'D', label: 'Outra' },
    ],
    required: true,
  },
  {
    questionKey: 'O9',
    section: 'ONBOARDING',
    type: 'SINGLE_SELECT',
    title: 'Já rodou anúncios pagos?',
    options: [
      { key: 'A', label: 'Sim, ativamente' },
      { key: 'B', label: 'Sim, mas parei' },
      { key: 'C', label: 'Nunca' },
      { key: 'D', label: 'Pretendo começar' },
    ],
    required: true,
  },
]

// ---------------------------------------------------------------------------
// Section 2: INITIAL — Quiz Inicial (Q1–Q7 + Q3.1 condicional)
// ---------------------------------------------------------------------------

export const INITIAL_QUESTIONS: QuestionDefinition[] = [
  {
    questionKey: 'Q1',
    section: 'INITIAL',
    type: 'SINGLE_SELECT',
    title: 'O que você deseja criar?',
    options: [
      { key: 'A', label: 'Anúncio Criativo' },
      { key: 'B', label: 'Vídeo Orgânico' },
    ],
    required: true,
  },
  {
    questionKey: 'Q2',
    section: 'INITIAL',
    type: 'SINGLE_SELECT',
    title: 'Modelar ou criar do zero?',
    options: [
      { key: 'A', label: 'Modelar (adaptar de vídeo existente)' },
      { key: 'B', label: 'Criar um roteiro do zero' },
    ],
    required: true,
  },
  {
    questionKey: 'Q3',
    section: 'INITIAL',
    type: 'SINGLE_SELECT',
    title: 'Aparecendo ou sem aparecer?',
    options: [
      { key: 'A', label: 'Aparecendo' },
      { key: 'B', label: 'Sem aparecer' },
    ],
    required: true,
  },
  {
    questionKey: 'Q3.1',
    section: 'INITIAL',
    type: 'SINGLE_SELECT',
    title: 'Como pretende produzir?',
    options: [
      { key: 'A', label: 'Fotos + narração' },
      { key: 'B', label: 'Banco de imagem' },
      { key: 'C', label: 'Gerado por IA' },
      { key: 'D', label: 'Texto animado' },
    ],
    required: true,
    showWhen: { questionKey: 'Q3', value: 'B' },
  },
  {
    questionKey: 'Q4',
    section: 'INITIAL',
    type: 'TEXT',
    title: 'Descreva detalhadamente o nicho e o objetivo da produção',
    example: 'Ex: nicho da saúde, objetivo de atrair clientes para programa de perda de peso',
    required: true,
  },
  {
    questionKey: 'Q5',
    section: 'INITIAL',
    type: 'SINGLE_SELECT',
    title: 'Gênero predominante do público-alvo',
    options: [
      { key: 'A', label: 'Homens (+60%)' },
      { key: 'B', label: 'Mulheres (+60%)' },
      { key: 'C', label: 'Ambos' },
      { key: 'D', label: 'SOL define' },
    ],
    required: true,
  },
  {
    questionKey: 'Q6',
    section: 'INITIAL',
    type: 'SINGLE_SELECT',
    title: 'Faixa etária do público-alvo',
    options: [
      { key: 'A', label: '18–24' },
      { key: 'B', label: '25–34' },
      { key: 'C', label: '35–44' },
      { key: 'D', label: '45–54' },
      { key: 'E', label: '55+' },
      { key: 'F', label: 'SOL define' },
    ],
    required: true,
  },
  {
    questionKey: 'Q7',
    section: 'INITIAL',
    type: 'SINGLE_SELECT',
    title: 'Plataforma principal de publicação',
    options: [
      { key: 'A', label: 'Instagram Reels' },
      { key: 'B', label: 'TikTok' },
      { key: 'C', label: 'YouTube Shorts' },
      { key: 'D', label: 'Stories' },
      { key: 'E', label: 'Feed' },
    ],
    required: true,
  },
]

// ---------------------------------------------------------------------------
// Section 3: AD_CREATIVE — Caminho 1A (1A.1–1A.5, se Q1 = A)
// ---------------------------------------------------------------------------

export const AD_CREATIVE_QUESTIONS: QuestionDefinition[] = [
  {
    questionKey: '1A.1',
    section: 'AD_CREATIVE',
    type: 'SINGLE_SELECT',
    title: 'Para qual tipo de público?',
    options: [
      { key: 'A', label: 'Público frio — nunca viram seu conteúdo' },
      { key: 'B', label: 'Público morno — já interagiu' },
      { key: 'C', label: 'Público quente — já comprou' },
      { key: 'D', label: 'SOL define' },
    ],
    required: true,
  },
  {
    questionKey: '1A.2',
    section: 'AD_CREATIVE',
    type: 'SINGLE_SELECT',
    title: 'Para onde deseja enviar o público do criativo?',
    options: [
      { key: 'A', label: 'WhatsApp' },
      { key: 'B', label: 'Página de vendas' },
      { key: 'C', label: 'Checkout direto' },
      { key: 'D', label: 'Formulário' },
      { key: 'E', label: 'VSL' },
      { key: 'F', label: 'Site' },
      { key: 'G', label: 'Perfil' },
      { key: 'H', label: 'Outro' },
    ],
    required: true,
  },
  {
    questionKey: '1A.3',
    section: 'AD_CREATIVE',
    type: 'TEXT',
    title: 'Já tem algum criativo que funcionou? Se sim, o que funcionou nele?',
    example: 'Ex: um vídeo com depoimento da aluna Maria converteu bem',
    required: false,
  },
  {
    questionKey: '1A.4',
    section: 'AD_CREATIVE',
    type: 'SINGLE_SELECT',
    title: 'Qual seu caixa para rodar anúncios atualmente?',
    options: [
      { key: 'A', label: '+R$20.000' },
      { key: 'B', label: 'R$10k–R$19k' },
      { key: 'C', label: 'R$5k–R$9k' },
      { key: 'D', label: 'R$2k–R$4k' },
      { key: 'E', label: 'R$500–R$1,9k' },
      { key: 'F', label: 'Menos de R$499' },
    ],
    required: true,
  },
  {
    questionKey: '1A.5',
    section: 'AD_CREATIVE',
    type: 'SINGLE_SELECT',
    title: 'Qual abordagem principal?',
    options: [
      { key: 'A', label: 'Apresentar problema → solução' },
      { key: 'B', label: 'Resultado / prova social direto' },
      { key: 'C', label: 'Gerar curiosidade para o clique' },
      { key: 'D', label: 'Educar e depois direcionar' },
      { key: 'E', label: 'SOL define' },
    ],
    required: true,
  },
]

// ---------------------------------------------------------------------------
// Section 4: ORGANIC_VIDEO — Caminho 1B (1B.1–1B.3, se Q1 = B)
// ---------------------------------------------------------------------------

export const ORGANIC_VIDEO_QUESTIONS: QuestionDefinition[] = [
  {
    questionKey: '1B.1',
    section: 'ORGANIC_VIDEO',
    type: 'SINGLE_SELECT',
    title: 'Para qual tipo de público?',
    options: [
      { key: 'A', label: 'Topo de funil — viralizar e atrair novos seguidores' },
      { key: 'B', label: 'Meio de funil — educar e construir autoridade' },
      { key: 'C', label: 'Fundo de funil — converter público em venda' },
      { key: 'D', label: 'SOL define' },
    ],
    required: true,
  },
  {
    questionKey: '1B.2',
    section: 'ORGANIC_VIDEO',
    type: 'SINGLE_SELECT',
    title: 'Qual objetivo de ganho principal com o vídeo?',
    options: [
      { key: 'A', label: 'Ganhar seguidores' },
      { key: 'B', label: 'Gerar comentários' },
      { key: 'C', label: 'Ativar gatilho ("eu quero")' },
      { key: 'D', label: 'Compartilhamentos' },
      { key: 'E', label: 'Salvamentos' },
      { key: 'F', label: 'Clicar no link da bio' },
      { key: 'G', label: 'Outro' },
    ],
    required: true,
  },
  {
    questionKey: '1B.3',
    section: 'ORGANIC_VIDEO',
    type: 'SINGLE_SELECT',
    title: 'Qual o tamanho aproximado da sua audiência atual?',
    options: [
      { key: 'A', label: 'Menos de 1.000' },
      { key: 'B', label: '1.000 a 10.000' },
      { key: 'C', label: '10.000 a 50.000' },
      { key: 'D', label: '50.000 a 200.000' },
      { key: 'E', label: 'Mais de 200.000' },
    ],
    required: true,
  },
]

// ---------------------------------------------------------------------------
// Section 5: MODELED_VIDEO — Caminho 2A (2A.1–2A.13, se Q2 = A)
// ---------------------------------------------------------------------------

export const MODELED_VIDEO_QUESTIONS: QuestionDefinition[] = [
  {
    questionKey: '2A.1',
    section: 'MODELED_VIDEO',
    type: 'SINGLE_SELECT',
    title: 'O vídeo referência é do mesmo nicho?',
    options: [
      { key: 'A', label: 'É do mesmo nicho' },
      { key: 'B', label: 'Quero modelar de outro nicho' },
    ],
    required: true,
  },
  {
    questionKey: '2A.2',
    section: 'MODELED_VIDEO',
    type: 'UPLOAD',
    title: 'Faça o upload do vídeo a ser modelado',
    example: 'Formatos aceitos: MP4, MOV, AVI (máx. 500MB)',
    required: true,
  },
  {
    questionKey: '2A.3',
    section: 'MODELED_VIDEO',
    type: 'SINGLE_SELECT',
    title: 'Contexto do áudio do vídeo referência',
    options: [
      { key: 'A', label: 'Pessoa(s) falando' },
      { key: 'B', label: 'Falando + música de fundo' },
      { key: 'C', label: 'Narrado (voz off)' },
      { key: 'D', label: 'Texto na tela' },
      { key: 'E', label: 'Apenas música' },
      { key: 'F', label: 'Outro' },
    ],
    required: true,
  },
  {
    questionKey: '2A.4',
    section: 'MODELED_VIDEO',
    type: 'SINGLE_SELECT',
    title: 'Em qual formato deseja produzir?',
    options: [
      { key: 'A', label: 'Formato idêntico ao do vídeo referência' },
      { key: 'B', label: 'Perguntas e respostas' },
      { key: 'C', label: 'Classificação' },
      { key: 'D', label: 'Isso ou aquilo' },
      { key: 'E', label: 'Desafio' },
      { key: 'F', label: 'POV' },
      { key: 'G', label: 'Storytelling' },
      { key: 'H', label: 'Low-fi' },
      { key: 'I', label: 'Trend / viral' },
      { key: 'J', label: 'Bastidores' },
      { key: 'K', label: 'Antes e depois' },
      { key: 'L', label: 'Depoimento' },
      { key: 'M', label: 'Dicas e tutoriais' },
      { key: 'N', label: 'Curiosidades' },
      { key: 'O', label: 'SOL define' },
    ],
    required: true,
  },
  {
    questionKey: '2A.5',
    section: 'MODELED_VIDEO',
    type: 'SINGLE_SELECT',
    title: 'Emoção que o vídeo referência te gerou',
    options: [
      { key: 'A', label: 'Raiva' },
      { key: 'B', label: 'Indignação' },
      { key: 'C', label: 'Medo' },
      { key: 'D', label: 'Curiosidade' },
      { key: 'E', label: 'Surpresa' },
      { key: 'F', label: 'Vergonha' },
      { key: 'G', label: 'Desejo' },
      { key: 'H', label: 'Identidade' },
      { key: 'I', label: 'Urgência' },
      { key: 'J', label: 'Medo de perder' },
      { key: 'K', label: 'Esperança' },
    ],
    required: true,
  },
  {
    questionKey: '2A.6',
    section: 'MODELED_VIDEO',
    type: 'TEXT',
    title: '3 comentários mais curtidos do vídeo referência',
    example: 'Cole os 3 comentários mais curtidos separados por linha',
    required: false,
  },
  {
    questionKey: '2A.7',
    section: 'MODELED_VIDEO',
    type: 'TEXT',
    title: 'O que do vídeo referência funcionou especialmente bem?',
    example: 'Ex: o gancho dos primeiros 3 segundos',
    required: false,
  },
  {
    questionKey: '2A.8',
    section: 'MODELED_VIDEO',
    type: 'SINGLE_SELECT',
    title: 'Qual tom de comunicação?',
    options: [
      { key: 'A', label: 'Mesmo do vídeo referência' },
      { key: 'B', label: 'Direto e agressivo' },
      { key: 'C', label: 'Leve e didático' },
      { key: 'D', label: 'Empático' },
      { key: 'E', label: 'Provocador' },
      { key: 'F', label: 'Inspirador' },
      { key: 'G', label: 'Técnico' },
      { key: 'H', label: 'Outro' },
    ],
    required: true,
  },
  {
    questionKey: '2A.9',
    section: 'MODELED_VIDEO',
    type: 'TEXT',
    title: 'Como você descreveria o LOCAL do vídeo?',
    example: 'Ex: começa na cozinha, depois a câmera muda para o corredor',
    required: true,
  },
  {
    questionKey: '2A.10',
    section: 'MODELED_VIDEO',
    type: 'TEXT',
    title: 'O que mais prendeu sua atenção no vídeo?',
    example: 'Ex: pessoa falando com a barriga de alguém',
    required: true,
  },
  {
    questionKey: '2A.11',
    section: 'MODELED_VIDEO',
    type: 'TEXT',
    title: 'CTA desejado no roteiro',
    example: 'Ex: link na bio, comenta EU QUERO',
    required: true,
  },
  {
    questionKey: '2A.12',
    section: 'MODELED_VIDEO',
    type: 'SINGLE_SELECT',
    title: 'Deseja utilizar prova social?',
    options: [
      { key: 'A', label: 'Sim, em foto' },
      { key: 'B', label: 'Sim, falando' },
      { key: 'C', label: 'Sim, vídeo curto' },
      { key: 'D', label: 'Não utilizar' },
    ],
    required: true,
  },
  {
    questionKey: '2A.13',
    section: 'MODELED_VIDEO',
    type: 'TEXT',
    title: 'Algo que NÃO gostou ou mudaria no vídeo referência?',
    example: 'Ex: achei que demorou pra chegar no ponto, CTA fraco',
    required: false,
  },
]

// ---------------------------------------------------------------------------
// Section 6: FROM_SCRATCH_VIDEO — Caminho 2B (2B.1–2B.11, se Q2 = B)
// ---------------------------------------------------------------------------

export const FROM_SCRATCH_VIDEO_QUESTIONS: QuestionDefinition[] = [
  {
    questionKey: '2B.1',
    section: 'FROM_SCRATCH_VIDEO',
    type: 'TEXT',
    title: 'Descreva detalhadamente o tema principal do vídeo',
    example: 'Ex: Sou nutricionista e quero ensinar uma receita para perder peso',
    required: true,
  },
  {
    questionKey: '2B.2',
    section: 'FROM_SCRATCH_VIDEO',
    type: 'SINGLE_SELECT',
    title: 'Qual emoção deseja provocar?',
    options: [
      { key: 'A', label: 'Raiva' },
      { key: 'B', label: 'Indignação' },
      { key: 'C', label: 'Medo' },
      { key: 'D', label: 'Curiosidade' },
      { key: 'E', label: 'Surpresa / Quebra de padrão' },
      { key: 'F', label: 'Vergonha' },
      { key: 'G', label: 'Desejo' },
      { key: 'H', label: 'Identidade' },
      { key: 'I', label: 'Urgência' },
      { key: 'J', label: 'Medo de perder' },
      { key: 'K', label: 'Esperança' },
    ],
    required: true,
  },
  {
    questionKey: '2B.3',
    section: 'FROM_SCRATCH_VIDEO',
    type: 'TEXT',
    title: 'Tem um gancho em mente?',
    example: 'Ex: como eu perdi 3kg com uma única mudança na alimentação',
    required: false,
  },
  {
    questionKey: '2B.4',
    section: 'FROM_SCRATCH_VIDEO',
    type: 'SINGLE_SELECT',
    title: 'Qual tipo de gancho quer?',
    options: [
      { key: 'A', label: 'Pergunta provocativa' },
      { key: 'B', label: 'Afirmação chocante' },
      { key: 'C', label: 'Resultado surpreendente' },
      { key: 'D', label: 'Mito quebrado' },
      { key: 'E', label: 'SOL define' },
    ],
    required: true,
  },
  {
    questionKey: '2B.5',
    section: 'FROM_SCRATCH_VIDEO',
    type: 'TEXT',
    title: 'Local onde será gravado',
    example: 'Ex: em casa, no escritório',
    required: true,
  },
  {
    questionKey: '2B.6',
    section: 'FROM_SCRATCH_VIDEO',
    type: 'SINGLE_SELECT',
    title: 'Em qual formato será feito?',
    options: [
      { key: 'A', label: 'SOL define' },
      { key: 'B', label: 'Perguntas e respostas' },
      { key: 'C', label: 'Classificação' },
      { key: 'D', label: 'Isso ou aquilo' },
      { key: 'E', label: 'Desafio' },
      { key: 'F', label: 'POV' },
      { key: 'G', label: 'Storytelling' },
      { key: 'H', label: 'Low-fi' },
      { key: 'I', label: 'Trend / viral' },
      { key: 'J', label: 'Bastidores' },
      { key: 'K', label: 'Antes e depois' },
      { key: 'L', label: 'Depoimento' },
      { key: 'M', label: 'Dicas e tutoriais' },
      { key: 'N', label: 'Curiosidades' },
    ],
    required: true,
  },
  {
    questionKey: '2B.7',
    section: 'FROM_SCRATCH_VIDEO',
    type: 'SINGLE_SELECT',
    title: 'Duração desejada aproximadamente',
    options: [
      { key: 'A', label: 'Até 15s' },
      { key: 'B', label: '16–30s' },
      { key: 'C', label: '31–60s' },
      { key: 'D', label: '61–90s' },
      { key: 'E', label: '91–120s' },
      { key: 'F', label: '121–150s' },
    ],
    required: true,
  },
  {
    questionKey: '2B.8',
    section: 'FROM_SCRATCH_VIDEO',
    type: 'TEXT',
    title: 'CTA desejado',
    example: 'Ex: link na bio, comenta EU QUERO',
    required: true,
  },
  {
    questionKey: '2B.9',
    section: 'FROM_SCRATCH_VIDEO',
    type: 'SINGLE_SELECT',
    title: 'Tom de comunicação',
    options: [
      { key: 'A', label: 'Direto e agressivo' },
      { key: 'B', label: 'Leve e didático' },
      { key: 'C', label: 'Empático' },
      { key: 'D', label: 'Provocador' },
      { key: 'E', label: 'Inspirador' },
      { key: 'F', label: 'Técnico' },
      { key: 'G', label: 'Outro' },
    ],
    required: true,
  },
  {
    questionKey: '2B.10',
    section: 'FROM_SCRATCH_VIDEO',
    type: 'SINGLE_SELECT',
    title: 'Deseja utilizar prova social?',
    options: [
      { key: 'A', label: 'Sim, em foto' },
      { key: 'B', label: 'Sim, falando' },
      { key: 'C', label: 'Sim, vídeo curto' },
      { key: 'D', label: 'Não utilizar' },
    ],
    required: true,
  },
  {
    questionKey: '2B.11',
    section: 'FROM_SCRATCH_VIDEO',
    type: 'TEXT',
    title: 'Algo que NÃO quer no vídeo?',
    example: 'Ex: não quero parecer vendedor, não quero dancinhas',
    required: false,
  },
]

// ---------------------------------------------------------------------------
// All questions combined (flat list)
// ---------------------------------------------------------------------------

export const ALL_QUESTIONS: QuestionDefinition[] = [
  ...ONBOARDING_QUESTIONS,
  ...INITIAL_QUESTIONS,
  ...AD_CREATIVE_QUESTIONS,
  ...ORGANIC_VIDEO_QUESTIONS,
  ...MODELED_VIDEO_QUESTIONS,
  ...FROM_SCRATCH_VIDEO_QUESTIONS,
]

// ---------------------------------------------------------------------------
// Section metadata for navigation and progress
// ---------------------------------------------------------------------------

export interface SectionMeta {
  key: QuizSectionType
  label: string
  description: string
  questions: QuestionDefinition[]
}

export const QUIZ_SECTIONS: SectionMeta[] = [
  {
    key: 'INITIAL',
    label: 'Definição',
    description: 'Defina o tipo de produção',
    questions: INITIAL_QUESTIONS,
  },
  {
    key: 'AD_CREATIVE',
    label: 'Anúncio Criativo',
    description: 'Detalhes do anúncio',
    questions: AD_CREATIVE_QUESTIONS,
  },
  {
    key: 'ORGANIC_VIDEO',
    label: 'Vídeo Orgânico',
    description: 'Detalhes do vídeo orgânico',
    questions: ORGANIC_VIDEO_QUESTIONS,
  },
  {
    key: 'MODELED_VIDEO',
    label: 'Vídeo Modelado',
    description: 'Modelar a partir de referência',
    questions: MODELED_VIDEO_QUESTIONS,
  },
  {
    key: 'FROM_SCRATCH_VIDEO',
    label: 'Vídeo do Zero',
    description: 'Criar roteiro original',
    questions: FROM_SCRATCH_VIDEO_QUESTIONS,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getQuestionByKey(key: string): QuestionDefinition | undefined {
  return ALL_QUESTIONS.find((q) => q.questionKey === key)
}

export function getQuestionsBySection(section: QuizSectionType): QuestionDefinition[] {
  return ALL_QUESTIONS.filter((q) => q.section === section)
}

/**
 * Returns which sections are active for a given quiz based on Q1 and Q2 answers.
 * INITIAL is always active. The path sections depend on Q1 (path1) and Q2 (path2).
 */
export function getActiveSections(
  path1: 'AD' | 'ORGANIC' | null,
  path2: 'MODELED' | 'FROM_SCRATCH' | null
): QuizSectionType[] {
  const sections: QuizSectionType[] = ['INITIAL']

  if (path1 === 'AD') sections.push('AD_CREATIVE')
  else if (path1 === 'ORGANIC') sections.push('ORGANIC_VIDEO')

  if (path2 === 'MODELED') sections.push('MODELED_VIDEO')
  else if (path2 === 'FROM_SCRATCH') sections.push('FROM_SCRATCH_VIDEO')

  return sections
}
