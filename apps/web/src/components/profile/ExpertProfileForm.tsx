'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExpertProfileData {
  // Secao 1: Dados Basicos
  fullName: string
  age: number | null
  gender: string
  location: string
  maritalStatus: string
  hasChildren: string
  occupation: string
  education: string
  // Secao 2: Personalidade
  communicationStyle: string[]
  appearsOnCamera: string
  preferredTone: string
  usesHumor: string
  commonExpressions: string
  avoidExpressions: string
  // Secao 3: Valores
  coreValues: string
  religion: string
  politicalPosition: string
  causes: string[]
  marketFrustration: string
  controversialOpinion: string
  avoidTopics: string
  // Secao 4: Historia
  bio: string
  careerOrigin: string
  hardestMoment: string
  proudestMoment: string
  personalStory: string
  dailyRoutine: string
  // Secao 5: Comunidade
  audienceIdentity: string
  communityName: string
  bestCompliment: string
  commonCriticism: string
  // Secao 6: Referencias
  inspirations: string
  preferredFormats: string[]
  bestPerformingVideo: string
  worstPerformingVideo: string
}

const EMPTY_PROFILE: ExpertProfileData = {
  fullName: '',
  age: null,
  gender: '',
  location: '',
  maritalStatus: '',
  hasChildren: '',
  occupation: '',
  education: '',
  communicationStyle: [],
  appearsOnCamera: '',
  preferredTone: '',
  usesHumor: '',
  commonExpressions: '',
  avoidExpressions: '',
  coreValues: '',
  religion: '',
  politicalPosition: '',
  causes: [],
  marketFrustration: '',
  controversialOpinion: '',
  avoidTopics: '',
  bio: '',
  careerOrigin: '',
  hardestMoment: '',
  proudestMoment: '',
  personalStory: '',
  dailyRoutine: '',
  audienceIdentity: '',
  communityName: '',
  bestCompliment: '',
  commonCriticism: '',
  inspirations: '',
  preferredFormats: [],
  bestPerformingVideo: '',
  worstPerformingVideo: '',
}

// ─── Required fields for completion calculation ──────────────────────────────

const REQUIRED_FIELDS: (keyof ExpertProfileData)[] = [
  'fullName', 'occupation', 'communicationStyle', 'appearsOnCamera',
  'preferredTone', 'coreValues', 'marketFrustration', 'bio',
  'careerOrigin', 'audienceIdentity', 'communityName', 'inspirations',
  'age', 'location',
]

function calcCompletion(data: ExpertProfileData): number {
  const filled = REQUIRED_FIELDS.filter(field => {
    const val = data[field]
    if (Array.isArray(val)) return val.length > 0
    return val !== null && val !== undefined && val !== ''
  }).length
  return Math.round((filled / REQUIRED_FIELDS.length) * 100)
}

function isRequired(field: string): boolean {
  return REQUIRED_FIELDS.includes(field as keyof ExpertProfileData)
}

// ─── Communication style & format options ────────────────────────────────────

const COMMUNICATION_STYLES = [
  'Direto e objetivo',
  'Contahistorias (storyteller)',
  'Tecnico e didatico',
  'Emocional e inspirador',
  'Bem-humorado e descontraido',
  'Provocativo e polemico',
]

const PREFERRED_FORMATS = [
  'Video curto (Reels/Shorts)',
  'Video longo (YouTube)',
  'Podcast',
  'Carrossel/Post',
  'Live/Webinar',
  'Stories',
]

// ─── Section definitions ─────────────────────────────────────────────────────

interface SectionDef {
  key: string
  title: string
  description: string
  fields: FieldDef[]
}

interface FieldDef {
  key: keyof ExpertProfileData
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'multi-check'
  placeholder?: string
  options?: string[]
}

const SECTIONS: SectionDef[] = [
  {
    key: 'basicos',
    title: 'Dados Basicos',
    description: 'Informacoes pessoais fundamentais para contexto.',
    fields: [
      { key: 'fullName', label: 'Nome completo', type: 'text', placeholder: 'Seu nome completo' },
      { key: 'age', label: 'Idade', type: 'number', placeholder: 'Ex: 35' },
      { key: 'gender', label: 'Genero', type: 'select', options: ['Masculino', 'Feminino', 'Outro', 'Prefiro nao dizer'] },
      { key: 'location', label: 'Localizacao', type: 'text', placeholder: 'Cidade, Estado' },
      { key: 'maritalStatus', label: 'Estado civil', type: 'select', options: ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viuvo(a)', 'Uniao estavel'] },
      { key: 'hasChildren', label: 'Tem filhos?', type: 'select', options: ['Sim', 'Nao'] },
      { key: 'occupation', label: 'Ocupacao principal', type: 'text', placeholder: 'Ex: Copywriter, Coach, Infoprodutor' },
      { key: 'education', label: 'Formacao', type: 'text', placeholder: 'Ex: Administracao - USP' },
    ],
  },
  {
    key: 'personalidade',
    title: 'Personalidade',
    description: 'Como voce se comunica e se apresenta.',
    fields: [
      { key: 'communicationStyle', label: 'Estilo de comunicacao', type: 'multi-check', options: COMMUNICATION_STYLES },
      { key: 'appearsOnCamera', label: 'Aparece na camera?', type: 'select', options: ['Sim, sempre', 'As vezes', 'Nao, uso voz off', 'Nao, uso avatares/animacoes'] },
      { key: 'preferredTone', label: 'Tom preferido', type: 'select', options: ['Formal', 'Semi-formal', 'Informal', 'Coloquial'] },
      { key: 'usesHumor', label: 'Usa humor?', type: 'select', options: ['Sim, frequentemente', 'Sim, moderadamente', 'Raramente', 'Nao'] },
      { key: 'commonExpressions', label: 'Expressoes que usa bastante', type: 'textarea', placeholder: 'Bordoes, frases de efeito, jargoes...' },
      { key: 'avoidExpressions', label: 'Expressoes que evita', type: 'textarea', placeholder: 'Palavras ou frases que nunca usaria...' },
    ],
  },
  {
    key: 'valores',
    title: 'Valores e Posicionamento',
    description: 'O que voce defende e onde tracara limites.',
    fields: [
      { key: 'coreValues', label: 'Valores centrais', type: 'textarea', placeholder: 'Ex: Transparencia, resultados reais, anti-guru...' },
      { key: 'religion', label: 'Religiao/Espiritualidade', type: 'text', placeholder: 'Opcional' },
      { key: 'politicalPosition', label: 'Posicionamento politico', type: 'text', placeholder: 'Opcional' },
      { key: 'causes', label: 'Causas que apoia', type: 'multi-check', options: ['Empreendedorismo', 'Educacao', 'Sustentabilidade', 'Inclusao', 'Saude mental', 'Liberdade financeira'] },
      { key: 'marketFrustration', label: 'Maior frustracao com o mercado', type: 'textarea', placeholder: 'O que te irrita no seu mercado?' },
      { key: 'controversialOpinion', label: 'Opiniao controversa', type: 'textarea', placeholder: 'Algo que voce defende e a maioria discorda...' },
      { key: 'avoidTopics', label: 'Topicos que evita', type: 'textarea', placeholder: 'Assuntos que nao quer abordar...' },
    ],
  },
  {
    key: 'historia',
    title: 'Historia e Trajetoria',
    description: 'Sua narrativa pessoal para roteiros autenticos.',
    fields: [
      { key: 'bio', label: 'Biografia resumida', type: 'textarea', placeholder: 'Quem e voce em 3-5 frases...' },
      { key: 'careerOrigin', label: 'Como comecou na carreira', type: 'textarea', placeholder: 'Conte a historia de como voce chegou onde esta...' },
      { key: 'hardestMoment', label: 'Momento mais dificil', type: 'textarea', placeholder: 'Um desafio que te moldou...' },
      { key: 'proudestMoment', label: 'Maior conquista', type: 'textarea', placeholder: 'O que voce mais se orgulha?' },
      { key: 'personalStory', label: 'Historia pessoal marcante', type: 'textarea', placeholder: 'Uma historia que sempre conta...' },
      { key: 'dailyRoutine', label: 'Rotina diaria', type: 'textarea', placeholder: 'Como e o seu dia-a-dia?' },
    ],
  },
  {
    key: 'comunidade',
    title: 'Comunidade e Audiencia',
    description: 'Como voce se relaciona com seu publico.',
    fields: [
      { key: 'audienceIdentity', label: 'Identidade da audiencia', type: 'textarea', placeholder: 'Quem e seu publico ideal? O que ele quer?' },
      { key: 'communityName', label: 'Nome da comunidade', type: 'text', placeholder: 'Como chama seus seguidores? Ex: Tribo, Familia, Alcateia...' },
      { key: 'bestCompliment', label: 'Melhor elogio que recebe', type: 'text', placeholder: 'O que seus seguidores mais falam de voce?' },
      { key: 'commonCriticism', label: 'Critica mais comum', type: 'text', placeholder: 'O que criticam em voce?' },
    ],
  },
  {
    key: 'referencias',
    title: 'Referencias e Conteudo',
    description: 'Suas inspiracoes e o que funciona para voce.',
    fields: [
      { key: 'inspirations', label: 'Criativos que admira', type: 'textarea', placeholder: 'Quem voce se inspira? (nomes, canais, perfis...)' },
      { key: 'preferredFormats', label: 'Formatos preferidos', type: 'multi-check', options: PREFERRED_FORMATS },
      { key: 'bestPerformingVideo', label: 'Melhor video (link)', type: 'text', placeholder: 'URL do seu video de melhor performance' },
      { key: 'worstPerformingVideo', label: 'Pior video (link)', type: 'text', placeholder: 'URL do video que nao funcionou' },
    ],
  },
]

// ─── Main Component ──────────────────────────────────────────────────────────

export function ExpertProfileForm() {
  const [profile, setProfile] = useState<ExpertProfileData>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ basicos: true })
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestProfileRef = useRef<ExpertProfileData>(EMPTY_PROFILE)

  // Keep ref in sync with state
  useEffect(() => {
    latestProfileRef.current = profile
  }, [profile])

  // ─── Load profile on mount ──────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile')
      if (!res.ok) throw new Error('Failed to load profile')
      const data = await res.json()
      if (data) {
        setProfile({ ...EMPTY_PROFILE, ...data })
      }
    } catch {
      // Profile may not exist yet, use empty defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // ─── Debounced auto-save ────────────────────────────────────────────────

  const saveProfile = useCallback(async (data: ExpertProfileData) => {
    setSaving(true)
    setSaveStatus('idle')
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }, [])

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveProfile(latestProfileRef.current)
    }, 1500)
  }, [saveProfile])

  // ─── Field update helpers ───────────────────────────────────────────────

  function updateField(key: keyof ExpertProfileData, value: unknown) {
    setProfile(prev => ({ ...prev, [key]: value }))
    scheduleSave()
  }

  function toggleArrayItem(key: keyof ExpertProfileData, item: string) {
    setProfile(prev => {
      const arr = (prev[key] as string[]) || []
      const next = arr.includes(item)
        ? arr.filter(v => v !== item)
        : [...arr, item]
      return { ...prev, [key]: next }
    })
    scheduleSave()
  }

  function toggleSection(sectionKey: string) {
    setOpenSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }))
  }

  // ─── Computed values ────────────────────────────────────────────────────

  const completion = calcCompletion(profile)

  // ─── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-500">
        Carregando perfil...
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-300">Progresso do perfil</span>
            {completion === 100 && (
              <span className="inline-flex items-center rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-400 border border-green-500/30">
                Completo
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-gray-500">Salvando...</span>}
            {saveStatus === 'saved' && <span className="text-xs text-green-400">Salvo</span>}
            {saveStatus === 'error' && <span className="text-xs text-red-400">Erro ao salvar</span>}
            <span className="text-sm font-bold text-white">{completion}%</span>
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${completion}%`,
              backgroundColor: completion === 100 ? '#22c55e' : '#f59e0b',
            }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {REQUIRED_FIELDS.filter(f => {
            const val = profile[f]
            if (Array.isArray(val)) return val.length > 0
            return val !== null && val !== undefined && val !== ''
          }).length} de {REQUIRED_FIELDS.length} campos obrigatorios preenchidos
        </p>
      </div>

      {/* Sections */}
      {SECTIONS.map(section => {
        const isOpen = openSections[section.key] ?? false
        return (
          <div
            key={section.key}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden"
          >
            {/* Section header (toggle) */}
            <button
              type="button"
              onClick={() => toggleSection(section.key)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
            >
              <div>
                <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                <p className="text-sm text-gray-400 mt-0.5">{section.description}</p>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Section body */}
            {isOpen && (
              <div className="px-6 pb-6 space-y-5 border-t border-white/5 pt-5">
                {section.fields.map(field => (
                  <FieldRenderer
                    key={field.key}
                    field={field}
                    value={profile[field.key]}
                    onChange={(val) => updateField(field.key, val)}
                    onToggle={(item) => toggleArrayItem(field.key, item)}
                    required={isRequired(field.key)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Manual save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => saveProfile(profile)}
          disabled={saving}
          className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black transition-all hover:bg-amber-400 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Perfil'}
        </button>
      </div>
    </div>
  )
}

// ─── Field Renderer ──────────────────────────────────────────────────────────

function FieldRenderer({
  field,
  value,
  onChange,
  onToggle,
  required,
}: {
  field: FieldDef
  value: unknown
  onChange: (val: unknown) => void
  onToggle: (item: string) => void
  required: boolean
}) {
  const labelEl = (
    <label className="mb-1.5 block text-sm font-medium text-gray-300">
      {field.label}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  )

  const inputClasses =
    'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors'

  switch (field.type) {
    case 'text':
      return (
        <div>
          {labelEl}
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={inputClasses}
          />
        </div>
      )

    case 'number':
      return (
        <div>
          {labelEl}
          <input
            type="number"
            value={value != null ? String(value) : ''}
            onChange={(e) => {
              const v = e.target.value
              onChange(v === '' ? null : parseInt(v, 10))
            }}
            placeholder={field.placeholder}
            className={inputClasses}
          />
        </div>
      )

    case 'textarea':
      return (
        <div>
          {labelEl}
          <textarea
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className={`${inputClasses} resize-y`}
          />
        </div>
      )

    case 'select':
      return (
        <div>
          {labelEl}
          <select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputClasses} appearance-none`}
          >
            <option value="">Selecione...</option>
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )

    case 'multi-check':
      return (
        <div>
          {labelEl}
          <div className="flex flex-wrap gap-2 mt-1">
            {field.options?.map(opt => {
              const arr = (value as string[]) || []
              const checked = arr.includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onToggle(opt)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    checked
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                      : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      )

    default:
      return null
  }
}
