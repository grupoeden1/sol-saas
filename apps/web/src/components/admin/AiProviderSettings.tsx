'use client'

import { useState, useEffect, useCallback } from 'react'

interface AiConfig {
  provider: 'anthropic' | 'openai'
  anthropicModelDefault: string
  anthropicModelFinal: string
  openaiModelDefault: string
  openaiModelFinal: string
}

export default function AiProviderSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [config, setConfig] = useState<AiConfig>({
    provider: 'anthropic',
    anthropicModelDefault: 'claude-haiku-4-5-20251001',
    anthropicModelFinal: 'claude-sonnet-4-5-20250929',
    openaiModelDefault: 'gpt-4o-mini',
    openaiModelFinal: 'gpt-4o',
  })

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai')
      if (!res.ok) throw new Error('Failed to load')
      setConfig(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/admin/ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Erro ao salvar')
      }
      setSuccess(
        `Provedor ativo: ${config.provider === 'openai' ? 'OpenAI' : 'Anthropic'}. Mudanças aplicadas.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-foreground-muted">
        Carregando...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Provedor de IA</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Selecione o provedor ativo e configure os modelos. As chaves de API
          ficam no .env.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {success}
        </div>
      )}

      <section className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-6 backdrop-blur-md">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Provedor Ativo
        </h2>
        <div className="flex gap-4">
          {(['anthropic', 'openai'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setConfig((c) => ({ ...c, provider: p }))}
              className={`rounded-xl border px-6 py-3 text-sm font-semibold transition-all ${
                config.provider === p
                  ? 'border-solar-500/50 bg-solar-500/10 text-solar-300'
                  : 'border-solar-800/30 text-foreground-muted hover:border-solar-500/30'
              }`}
            >
              {p === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI (GPT)'}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-6 backdrop-blur-md">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Modelos Anthropic
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ModelInput
            label="Modelo Padrão (rápido/econômico)"
            value={config.anthropicModelDefault}
            onChange={(v) =>
              setConfig((c) => ({ ...c, anthropicModelDefault: v }))
            }
          />
          <ModelInput
            label="Modelo Final (poderoso)"
            value={config.anthropicModelFinal}
            onChange={(v) =>
              setConfig((c) => ({ ...c, anthropicModelFinal: v }))
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-6 backdrop-blur-md">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Modelos OpenAI
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ModelInput
            label="Modelo Padrão (rápido/econômico)"
            value={config.openaiModelDefault}
            onChange={(v) =>
              setConfig((c) => ({ ...c, openaiModelDefault: v }))
            }
          />
          <ModelInput
            label="Modelo Final (poderoso)"
            value={config.openaiModelFinal}
            onChange={(v) =>
              setConfig((c) => ({ ...c, openaiModelFinal: v }))
            }
          />
        </div>
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-solar-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-solar-400 disabled:opacity-50"
      >
        {saving ? 'Salvando...' : 'Salvar Configuração'}
      </button>
    </div>
  )
}

function ModelInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-solar-500/50"
      />
    </div>
  )
}
