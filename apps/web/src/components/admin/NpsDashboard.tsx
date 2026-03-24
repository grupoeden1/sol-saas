'use client'

import { useEffect, useState, useCallback } from 'react'

interface NpsCampaign {
  id: string
  name: string
  question: string
  minDays: number
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED'
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  _count: { responses: number }
}

interface NpsMetrics {
  totalResponses: number
  totalViewed: number
  totalDismissed: number
  averageScore: number | null
  distribution: Record<number, number>
  responseRate: number
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-400',
  ACTIVE: 'bg-green-500/20 text-green-400',
  PAUSED: 'bg-yellow-500/20 text-yellow-400',
  ENDED: 'bg-red-500/20 text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativa',
  PAUSED: 'Pausada',
  ENDED: 'Encerrada',
}

export default function NpsDashboard() {
  const [campaigns, setCampaigns] = useState<NpsCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formQuestion, setFormQuestion] = useState('')
  const [formMinDays, setFormMinDays] = useState(7)
  const [saving, setSaving] = useState(false)

  // Preview
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Expanded metrics
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<Record<string, NpsMetrics>>({})

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/nps')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setCampaigns(data.campaigns)
    } catch {
      setError('Erro ao carregar campanhas NPS')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  async function fetchMetrics(campaignId: string) {
    if (metrics[campaignId]) return
    try {
      const res = await fetch(`/api/admin/nps/metrics?campaignId=${campaignId}`)
      if (!res.ok) return
      const data = await res.json()
      setMetrics(prev => ({ ...prev, [campaignId]: data.metrics }))
    } catch {
      // ignore
    }
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      fetchMetrics(id)
    }
  }

  function openCreateModal() {
    setModalMode('create')
    setEditingId(null)
    setFormName('')
    setFormQuestion('Como esta sua experiencia com o SOL ate agora?')
    setFormMinDays(7)
    setPreviewCount(null)
    setShowModal(true)
  }

  function openEditModal(c: NpsCampaign) {
    setModalMode('edit')
    setEditingId(c.id)
    setFormName(c.name)
    setFormQuestion(c.question)
    setFormMinDays(c.minDays)
    setPreviewCount(null)
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const body = modalMode === 'create'
        ? { name: formName, question: formQuestion, minDays: formMinDays }
        : { id: editingId, name: formName, question: formQuestion, minDays: formMinDays }

      const res = await fetch('/api/admin/nps', {
        method: modalMode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Falha ao salvar')
      }

      setShowModal(false)
      setSuccess(modalMode === 'create' ? 'Campanha criada!' : 'Campanha atualizada!')
      setTimeout(() => setSuccess(null), 3000)
      await fetchCampaigns()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    setError(null)
    try {
      const res = await fetch('/api/admin/nps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Falha ao alterar status')
      }
      setSuccess(`Status alterado para ${STATUS_LABELS[newStatus]}`)
      setTimeout(() => setSuccess(null), 3000)
      await fetchCampaigns()
      // Invalidate metrics cache for this campaign
      setMetrics(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar status')
    }
  }

  async function handlePreview() {
    setPreviewLoading(true)
    try {
      const res = await fetch('/api/admin/nps/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minDays: formMinDays }),
      })
      if (!res.ok) return
      const data = await res.json()
      setPreviewCount(data.count)
    } catch {
      // ignore
    } finally {
      setPreviewLoading(false)
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-foreground-muted">Carregando...</div>
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">NPS — Pesquisa de Satisfacao</h1>
          <p className="mt-1 text-sm text-foreground-muted">Crie e gerencie pesquisas de satisfacao dos usuarios</p>
        </div>
        <button
          onClick={openCreateModal}
          className="rounded-xl bg-solar-500 px-4 py-2 text-sm font-semibold text-background transition-all hover:bg-solar-600"
        >
          Nova Pesquisa
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">x</button>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {success}
        </div>
      )}

      {/* Campaigns table */}
      {campaigns.length === 0 ? (
        <div className="rounded-2xl border border-solar-800/20 bg-background-secondary px-6 py-12 text-center">
          <p className="text-foreground-muted">Nenhuma pesquisa NPS criada ainda</p>
          <button onClick={openCreateModal} className="mt-3 text-sm text-solar-400 hover:underline">
            Criar primeira pesquisa
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-solar-800/20 bg-background-secondary">
          <table className="w-full">
            <thead>
              <tr className="border-b border-solar-800/10 text-left text-xs text-foreground-muted">
                <th className="px-6 py-3 font-medium">Nome</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Min Dias</th>
                <th className="px-6 py-3 text-right font-medium">Respostas</th>
                <th className="px-6 py-3 text-right font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <>
                  <tr key={c.id} className="border-b border-solar-800/10 last:border-0">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleExpand(c.id)}
                        className="text-left text-sm font-medium text-foreground hover:text-solar-400"
                      >
                        {c.name}
                      </button>
                      <p className="mt-0.5 max-w-xs truncate text-xs text-foreground-muted">{c.question}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground-muted">{c.minDays}d</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-foreground">
                      {c._count.responses}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === 'DRAFT' && (
                          <>
                            <button onClick={() => openEditModal(c)} className="rounded-md px-2 py-1 text-xs text-foreground-muted hover:bg-solar-500/10 hover:text-foreground">
                              Editar
                            </button>
                            <button onClick={() => handleStatusChange(c.id, 'ACTIVE')} className="rounded-md px-2 py-1 text-xs text-green-400 hover:bg-green-500/10">
                              Ativar
                            </button>
                          </>
                        )}
                        {c.status === 'ACTIVE' && (
                          <>
                            <button onClick={() => handleStatusChange(c.id, 'PAUSED')} className="rounded-md px-2 py-1 text-xs text-yellow-400 hover:bg-yellow-500/10">
                              Pausar
                            </button>
                            <button onClick={() => handleStatusChange(c.id, 'ENDED')} className="rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">
                              Encerrar
                            </button>
                          </>
                        )}
                        {c.status === 'PAUSED' && (
                          <>
                            <button onClick={() => handleStatusChange(c.id, 'ACTIVE')} className="rounded-md px-2 py-1 text-xs text-green-400 hover:bg-green-500/10">
                              Reativar
                            </button>
                            <button onClick={() => handleStatusChange(c.id, 'ENDED')} className="rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">
                              Encerrar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded metrics row */}
                  {expandedId === c.id && (
                    <tr key={`${c.id}-metrics`} className="border-b border-solar-800/10 bg-background-tertiary/30">
                      <td colSpan={5} className="px-6 py-4">
                        {metrics[c.id] ? (
                          <MetricsPanel metrics={metrics[c.id]} />
                        ) : (
                          <p className="text-center text-sm text-foreground-muted">Carregando metricas...</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative mx-4 w-full max-w-lg rounded-2xl border border-solar-800/30 bg-background-secondary p-6 shadow-2xl">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-foreground-muted hover:bg-background-tertiary hover:text-foreground"
              aria-label="Fechar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <h3 className="mb-4 text-lg font-bold text-foreground">
              {modalMode === 'create' ? 'Nova Pesquisa NPS' : 'Editar Pesquisa'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">Nome (interno)</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: NPS Marco 2026"
                  className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/40 focus:border-solar-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">Pergunta para o usuario</label>
                <textarea
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/40 focus:border-solar-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">Minimo de dias de conta</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={formMinDays}
                    onChange={(e) => setFormMinDays(Math.max(0, parseInt(e.target.value) || 0))}
                    min={0}
                    max={365}
                    className="w-24 rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-foreground focus:border-solar-500 focus:outline-none"
                  />
                  <span className="text-xs text-foreground-muted">dias</span>
                  <button
                    onClick={handlePreview}
                    disabled={previewLoading}
                    className="rounded-lg border border-solar-500/30 px-3 py-1.5 text-xs text-solar-400 transition-colors hover:bg-solar-500/10 disabled:opacity-50"
                  >
                    {previewLoading ? '...' : 'Ver audiencia'}
                  </button>
                  {previewCount !== null && (
                    <span className="text-xs font-medium text-solar-400">{previewCount} usuarios</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-background-tertiary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim() || !formQuestion.trim()}
                className="rounded-xl bg-solar-500 px-4 py-2 text-sm font-semibold text-background transition-all hover:bg-solar-600 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : modalMode === 'create' ? 'Criar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Metrics Panel ───────────────────────────────────────────────────────

function MetricsPanel({ metrics }: { metrics: NpsMetrics }) {
  const maxCount = Math.max(...Object.values(metrics.distribution), 1)

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Average score */}
      <div className="rounded-xl border border-solar-800/20 bg-background-secondary p-4">
        <p className="mb-1 text-xs font-medium text-foreground-muted">Media</p>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold text-foreground">
            {metrics.averageScore !== null ? metrics.averageScore.toFixed(1) : '—'}
          </span>
          <span className="text-sm text-foreground-muted">/ 5</span>
        </div>
        <div className="mt-2 flex gap-0.5">
          {[1, 2, 3, 4, 5].map(s => (
            <svg
              key={s}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={metrics.averageScore !== null && s <= Math.round(metrics.averageScore) ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.5"
              className={metrics.averageScore !== null && s <= Math.round(metrics.averageScore) ? 'text-solar-400' : 'text-foreground-muted/30'}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ))}
        </div>
      </div>

      {/* Response stats */}
      <div className="rounded-xl border border-solar-800/20 bg-background-secondary p-4">
        <p className="mb-1 text-xs font-medium text-foreground-muted">Engajamento</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-foreground-muted">Visualizaram</span>
            <span className="font-medium text-foreground">{metrics.totalViewed}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground-muted">Responderam</span>
            <span className="font-medium text-green-400">{metrics.totalResponses}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground-muted">Dispensaram</span>
            <span className="font-medium text-foreground-muted">{metrics.totalDismissed}</span>
          </div>
          <div className="flex justify-between border-t border-solar-800/10 pt-2">
            <span className="text-foreground-muted">Taxa de resposta</span>
            <span className="font-medium text-solar-400">{metrics.responseRate}%</span>
          </div>
        </div>
      </div>

      {/* Distribution */}
      <div className="rounded-xl border border-solar-800/20 bg-background-secondary p-4">
        <p className="mb-3 text-xs font-medium text-foreground-muted">Distribuicao</p>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map(score => {
            const count = metrics.distribution[score] || 0
            const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
            return (
              <div key={score} className="flex items-center gap-2">
                <span className="w-3 text-right text-xs text-foreground-muted">{score}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-solar-400">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <div className="flex-1">
                  <div className="h-4 w-full overflow-hidden rounded-full bg-background-tertiary">
                    <div
                      className="h-full rounded-full bg-solar-500/60 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="w-8 text-right text-xs font-medium text-foreground-muted">{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
