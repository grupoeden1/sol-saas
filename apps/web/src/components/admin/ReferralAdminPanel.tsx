'use client'

import { useState, useEffect, useCallback } from 'react'

interface TopReferrer {
  email: string
  referrals: number
  creditsEarned: number
}

interface ReferralMetrics {
  totalReferrals: number
  totalCredited: number
  totalCreditsDistributed: number
  conversionRate: number
  top5: TopReferrer[]
}

interface ReferralListItem {
  id: string
  referrerEmail: string
  referredEmail: string
  status: string
  referrerCredits: number
  referredCredits: number
  createdAt: string
}

interface ListResponse {
  items: ReferralListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    CREDITED: 'bg-green-500/10 text-green-400 border-green-500/30',
    EXPIRED: 'bg-red-500/10 text-red-400 border-red-500/30',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        styles[status] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/30'
      }`}
    >
      {status}
    </span>
  )
}

export default function ReferralAdminPanel() {
  const [metrics, setMetrics] = useState<ReferralMetrics | null>(null)
  const [list, setList] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [listPage, setListPage] = useState(1)

  // Form state
  const [formEnabled, setFormEnabled] = useState(0)
  const [formReferrerCredits, setFormReferrerCredits] = useState(100)
  const [formReferredCredits, setFormReferredCredits] = useState(50)
  const [formMaxPerUser, setFormMaxPerUser] = useState(20)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/referral')
      if (res.ok) {
        const data = await res.json()
        setMetrics(data.metrics)
        setFormEnabled(data.config.REFERRAL_ENABLED)
        setFormReferrerCredits(data.config.REFERRAL_REFERRER_CREDITS)
        setFormReferredCredits(data.config.REFERRAL_REFERRED_CREDITS)
        setFormMaxPerUser(data.config.REFERRAL_MAX_PER_USER)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchList = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(listPage),
        pageSize: '20',
      })
      if (statusFilter) {
        params.set('status', statusFilter)
      }
      const res = await fetch(`/api/admin/referral/list?${params}`)
      if (res.ok) {
        const data = await res.json()
        setList(data)
      }
    } catch {
      // silently fail
    }
  }, [listPage, statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage('')
    try {
      const res = await fetch('/api/admin/referral', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          REFERRAL_ENABLED: formEnabled,
          REFERRAL_REFERRER_CREDITS: formReferrerCredits,
          REFERRAL_REFERRED_CREDITS: formReferredCredits,
          REFERRAL_MAX_PER_USER: formMaxPerUser,
        }),
      })

      if (res.ok) {
        setSaveMessage('Configuracoes salvas com sucesso!')
        await fetchData()
      } else {
        setSaveMessage('Erro ao salvar configuracoes')
      }
    } catch {
      setSaveMessage('Erro ao salvar configuracoes')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }

  const handleToggle = async () => {
    const newValue = formEnabled === 1 ? 0 : 1
    setFormEnabled(newValue)

    // Auto-save toggle immediately
    setSaving(true)
    try {
      const res = await fetch('/api/admin/referral', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          REFERRAL_ENABLED: newValue,
          REFERRAL_REFERRER_CREDITS: formReferrerCredits,
          REFERRAL_REFERRED_CREDITS: formReferredCredits,
          REFERRAL_MAX_PER_USER: formMaxPerUser,
        }),
      })

      if (res.ok) {
        setSaveMessage(newValue === 1 ? 'Programa ativado!' : 'Programa desativado!')
        await fetchData()
      }
    } catch {
      // revert on error
      setFormEnabled(formEnabled)
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-solar-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Toggle + Config Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Toggle */}
        <div className="rounded-2xl border border-solar-800/20 bg-background-secondary p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Status do Programa
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground-muted">
                {formEnabled === 1 ? 'Programa ativo' : 'Programa desativado'}
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={saving}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                formEnabled === 1
                  ? 'bg-solar-500'
                  : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  formEnabled === 1 ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Config Form */}
        <div className="rounded-2xl border border-solar-800/20 bg-background-secondary p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Configuracao
          </h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-foreground-muted">
                Creditos p/ Indicador
              </label>
              <input
                type="number"
                min={1}
                value={formReferrerCredits}
                onChange={(e) =>
                  setFormReferrerCredits(
                    Math.max(1, Number(e.target.value) || 1),
                  )
                }
                className="w-full rounded-lg border border-solar-800/30 bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground-muted">
                Creditos p/ Indicado
              </label>
              <input
                type="number"
                min={1}
                value={formReferredCredits}
                onChange={(e) =>
                  setFormReferredCredits(
                    Math.max(1, Number(e.target.value) || 1),
                  )
                }
                className="w-full rounded-lg border border-solar-800/30 bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground-muted">
                Maximo de indicacoes por usuario
              </label>
              <input
                type="number"
                min={1}
                value={formMaxPerUser}
                onChange={(e) =>
                  setFormMaxPerUser(
                    Math.max(1, Number(e.target.value) || 1),
                  )
                }
                className="w-full rounded-lg border border-solar-800/30 bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-lg bg-solar-500 py-2 text-sm font-semibold text-background transition-all hover:bg-solar-600 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Configuracoes'}
            </button>
            {saveMessage && (
              <p className="text-center text-xs text-solar-400">
                {saveMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      {metrics && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-foreground-muted">
            Metricas
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-solar-800/20 bg-background-secondary p-4">
              <p className="text-xs text-foreground-muted">
                Total de Indicacoes
              </p>
              <p className="text-2xl font-bold text-foreground">
                {metrics.totalReferrals}
              </p>
            </div>
            <div className="rounded-2xl border border-solar-800/20 bg-background-secondary p-4">
              <p className="text-xs text-foreground-muted">Creditadas</p>
              <p className="text-2xl font-bold text-green-400">
                {metrics.totalCredited}
              </p>
            </div>
            <div className="rounded-2xl border border-solar-800/20 bg-background-secondary p-4">
              <p className="text-xs text-foreground-muted">
                Creditos Distribuidos
              </p>
              <p className="text-2xl font-bold text-solar-400">
                {metrics.totalCreditsDistributed}
              </p>
            </div>
            <div className="rounded-2xl border border-solar-800/20 bg-background-secondary p-4">
              <p className="text-xs text-foreground-muted">
                Taxa de Conversao
              </p>
              <p className="text-2xl font-bold text-foreground">
                {metrics.conversionRate}%
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Top 5 Referrers */}
      {metrics && metrics.top5.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-foreground-muted">
            Top 5 Indicadores
          </h2>
          <div className="overflow-hidden rounded-2xl border border-solar-800/20">
            <table className="w-full">
              <thead>
                <tr className="border-b border-solar-800/10 bg-background-secondary">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted">
                    Email
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-foreground-muted">
                    Indicacoes
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-foreground-muted">
                    Creditos Ganhos
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.top5.map((r, i) => (
                  <tr
                    key={i}
                    className="border-b border-solar-800/5 bg-background-secondary/50"
                  >
                    <td className="px-4 py-2.5 text-sm text-foreground">
                      {r.email}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm text-foreground">
                      {r.referrals}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm text-solar-400">
                      {r.creditsEarned}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Referral List */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground-muted">
            Lista de Indicacoes
          </h2>
          <div className="flex gap-2">
            {['', 'PENDING', 'CREDITED', 'EXPIRED'].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s)
                  setListPage(1)
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-solar-500 text-background'
                    : 'bg-solar-500/10 text-solar-300 hover:bg-solar-500/20'
                }`}
              >
                {s || 'Todos'}
              </button>
            ))}
          </div>
        </div>

        {list && list.items.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-2xl border border-solar-800/20">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-solar-800/10 bg-background-secondary">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted">
                      Indicador
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted">
                      Indicado
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-foreground-muted">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-foreground-muted">
                      Creditos
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-foreground-muted">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-solar-800/5 bg-background-secondary/50"
                    >
                      <td className="px-4 py-2.5 text-sm text-foreground">
                        {item.referrerEmail}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-foreground-muted">
                        {item.referredEmail}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm text-foreground-muted">
                        {item.status === 'CREDITED'
                          ? `${item.referrerCredits} / ${item.referredCredits}`
                          : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-foreground-muted">
                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {list.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setListPage((p) => Math.max(1, p - 1))}
                  disabled={listPage <= 1}
                  className="rounded-lg bg-solar-500/10 px-3 py-1.5 text-xs text-solar-300 transition-all hover:bg-solar-500/20 disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-xs text-foreground-muted">
                  Pagina {list.page} de {list.totalPages}
                </span>
                <button
                  onClick={() =>
                    setListPage((p) =>
                      Math.min(list.totalPages, p + 1),
                    )
                  }
                  disabled={listPage >= list.totalPages}
                  className="rounded-lg bg-solar-500/10 px-3 py-1.5 text-xs text-solar-300 transition-all hover:bg-solar-500/20 disabled:opacity-50"
                >
                  Proxima
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-solar-800/20 bg-background-secondary p-8 text-center">
            <p className="text-sm text-foreground-muted">
              Nenhuma indicacao encontrada
              {statusFilter ? ` com status ${statusFilter}` : ''}.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
