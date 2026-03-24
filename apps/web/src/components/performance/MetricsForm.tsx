'use client'

import { useState } from 'react'
import type { ContentType, PerformanceMetrics } from '@/lib/performance/types'
import { SNAPSHOT_DAYS } from '@/lib/performance/types'

interface FieldDef {
  key: string
  label: string
  unit: string
  type: 'int' | 'float'
  max?: number
}

const PAID_FIELDS: FieldDef[] = [
  { key: 'impressions', label: 'Impressões', unit: '', type: 'int' },
  { key: 'ctr', label: 'CTR', unit: '%', type: 'float', max: 100 },
  { key: 'cpc', label: 'CPC', unit: 'R$', type: 'float' },
  { key: 'cpm', label: 'CPM', unit: 'R$', type: 'float' },
  { key: 'cpa', label: 'CPA', unit: 'R$', type: 'float' },
  { key: 'roas', label: 'ROAS', unit: 'x', type: 'float' },
  { key: 'hookRate', label: 'Hook Rate', unit: '%', type: 'float', max: 100 },
  { key: 'retention', label: 'Retenção', unit: '%', type: 'float', max: 100 },
]

const ORGANIC_FIELDS: FieldDef[] = [
  { key: 'views', label: 'Visualizações', unit: '', type: 'int' },
  { key: 'likes', label: 'Curtidas', unit: '', type: 'int' },
  { key: 'comments', label: 'Comentários', unit: '', type: 'int' },
  { key: 'shares', label: 'Compartilhamentos', unit: '', type: 'int' },
  { key: 'saves', label: 'Salvos', unit: '', type: 'int' },
  { key: 'retention', label: 'Retenção', unit: '%', type: 'float', max: 100 },
]

interface MetricsFormProps {
  conversationId: string
  contentType: ContentType
  existingMetrics: PerformanceMetrics[]
  onSubmitted: () => void
}

export function MetricsForm({ conversationId, contentType, existingMetrics, onSubmitted }: MetricsFormProps) {
  const submittedDays = new Set(existingMetrics.map(m => m.snapshotDay))
  const firstAvailableDay = SNAPSHOT_DAYS.find(d => !submittedDays.has(d)) ?? SNAPSHOT_DAYS[0]

  const [selectedDay, setSelectedDay] = useState<number>(firstAvailableDay)
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fields = contentType === 'PAID' ? PAID_FIELDS : ORGANIC_FIELDS
  const isDaySubmitted = submittedDays.has(selectedDay)

  const handleChange = (key: string, raw: string) => {
    setValues(prev => ({ ...prev, [key]: raw }))
    setError(null)
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)

    const payload: Record<string, number | null> = { snapshotDay: selectedDay }
    for (const field of fields) {
      const raw = values[field.key]?.trim()
      if (!raw) {
        payload[field.key] = null
        continue
      }
      const num = field.type === 'int' ? parseInt(raw, 10) : parseFloat(raw)
      if (isNaN(num) || num < 0) {
        setError(`${field.label}: valor inválido`)
        setSaving(false)
        return
      }
      if (field.max != null && num > field.max) {
        setError(`${field.label}: máximo ${field.max}${field.unit}`)
        setSaving(false)
        return
      }
      payload[field.key] = num
    }

    // Ensure at least one metric is filled
    const hasValue = fields.some(f => payload[f.key] != null)
    if (!hasValue) {
      setError('Preencha pelo menos uma métrica')
      setSaving(false)
      return
    }

    try {
      const res = await fetch(`/api/scripts/${conversationId}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? 'Erro ao salvar métricas')
        setSaving(false)
        return
      }

      setValues({})
      onSubmitted()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Adicionar Métricas</h3>

      {/* Day selector */}
      <div className="flex gap-1.5">
        {SNAPSHOT_DAYS.map(day => {
          const isSubmitted = submittedDays.has(day)
          const isSelected = selectedDay === day

          return (
            <button
              key={day}
              onClick={() => { setSelectedDay(day); setValues({}); setError(null) }}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-solar-500/20 text-solar-400 border border-solar-500/40'
                  : isSubmitted
                    ? 'bg-green-500/10 text-green-400/70 border border-green-500/20'
                    : 'bg-background-secondary text-muted-foreground border border-solar-800/20 hover:border-solar-800/40'
              }`}
            >
              {isSubmitted && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              Dia {day}
            </button>
          )
        })}
      </div>

      {isDaySubmitted ? (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
          <p className="text-xs text-green-400">Métricas do dia {selectedDay} já foram enviadas.</p>
        </div>
      ) : (
        <>
          {/* Fields grid */}
          <div className="grid grid-cols-2 gap-3">
            {fields.map(field => (
              <div key={field.key}>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {field.label} {field.unit && <span className="text-muted-foreground/50">({field.unit})</span>}
                </label>
                <input
                  type="number"
                  step={field.type === 'float' ? '0.01' : '1'}
                  min="0"
                  max={field.max}
                  value={values[field.key] ?? ''}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder="—"
                  className="w-full rounded-lg border border-solar-800/30 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:border-solar-500/50 focus:outline-none focus:ring-1 focus:ring-solar-500/20"
                />
              </div>
            ))}
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full rounded-lg bg-solar-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-solar-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Salvando...' : `Salvar Métricas — Dia ${selectedDay}`}
          </button>
        </>
      )}
    </div>
  )
}
