'use client'

import { useState, useEffect, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiProvider {
  id: string
  provider: string
  enabled: boolean
  apiKeyEnv: string
  rateLimitPerHour: number
  config: Record<string, unknown> | null
  updatedAt: string
  updatedBy: string
}

interface Metrics {
  totalCacheEntries: number
  expiredCacheEntries: number
  activeCacheEntries: number
  bySource: Record<string, number>
  last24h: Record<string, number>
}

interface HealthResult {
  status: 'ok' | 'error'
  latencyMs: number
  message: string
}

// Provider display metadata
const PROVIDER_META: Record<string, { label: string; description: string }> = {
  meta: { label: 'Meta Ad Library', description: 'Busca de anuncios no Facebook/Instagram Ad Library' },
  youtube: { label: 'YouTube Data API', description: 'Busca de videos e canais no YouTube' },
  tiktok: { label: 'TikTok API', description: 'Busca de conteudo e perfis no TikTok' },
  instagram: { label: 'Instagram API', description: 'Busca de conteudo no Instagram' },
  enrichment: { label: 'Enrichment API', description: 'Enriquecimento de dados de criativos' },
}

// Source enum to provider mapping
const SOURCE_TO_PROVIDER: Record<string, string> = {
  META_AD_LIBRARY: 'meta',
  YOUTUBE: 'youtube',
  TIKTOK: 'tiktok',
  INSTAGRAM: 'instagram',
  ENRICHMENT: 'enrichment',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IntegrationsDashboard() {
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState<ApiProvider[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [healthResults, setHealthResults] = useState<Record<string, HealthResult>>({})
  const [healthLoading, setHealthLoading] = useState<Record<string, boolean>>({})
  const [toggling, setToggling] = useState<Record<string, boolean>>({})

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/integrations')
      if (!res.ok) throw new Error('Falha ao carregar integracoes')
      const data = await res.json()
      setProviders(data.providers)
      setMetrics(data.metrics)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleToggle(provider: string, currentEnabled: boolean) {
    setToggling((prev) => ({ ...prev, [provider]: true }))
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/admin/integrations/${provider}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Erro ao atualizar')
      }
      const updated = await res.json()
      setProviders((prev) =>
        prev.map((p) => (p.provider === provider ? updated : p)),
      )
      setSuccess(`${PROVIDER_META[provider]?.label ?? provider} ${!currentEnabled ? 'ativado' : 'desativado'}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setToggling((prev) => ({ ...prev, [provider]: false }))
    }
  }

  async function handleHealthCheck(provider: string) {
    setHealthLoading((prev) => ({ ...prev, [provider]: true }))
    setHealthResults((prev) => {
      const next = { ...prev }
      delete next[provider]
      return next
    })

    try {
      const res = await fetch(`/api/admin/integrations/${provider}/health`, {
        method: 'POST',
      })
      const result: HealthResult = await res.json()
      setHealthResults((prev) => ({ ...prev, [provider]: result }))
    } catch {
      setHealthResults((prev) => ({
        ...prev,
        [provider]: { status: 'error', latencyMs: 0, message: 'Falha na conexao' },
      }))
    } finally {
      setHealthLoading((prev) => ({ ...prev, [provider]: false }))
    }
  }

  function getSourceCount(source: string, type: 'total' | 'last24h'): number {
    if (!metrics) return 0
    const map = type === 'total' ? metrics.bySource : metrics.last24h
    return map[source] ?? 0
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-foreground-muted">
        Carregando integracoes...
      </div>
    )
  }

  // Build a combined list: known providers + any from DB that we don't know
  const knownProviders = Object.keys(PROVIDER_META)
  const allProviderKeys = [
    ...knownProviders,
    ...providers
      .map((p) => p.provider)
      .filter((p) => !knownProviders.includes(p)),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          API Configurations & Integrations
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Gerencie os provedores de API externos, verifique o status de saude e monitore o uso do cache.
        </p>
      </div>

      {/* Alerts */}
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

      {/* Providers */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Provedores</h2>

        {allProviderKeys.map((providerKey) => {
          const providerData = providers.find((p) => p.provider === providerKey)
          const meta = PROVIDER_META[providerKey]
          const label = meta?.label ?? providerKey
          const description = meta?.description ?? ''
          const enabled = providerData?.enabled ?? false
          const health = healthResults[providerKey]
          const isHealthLoading = healthLoading[providerKey]
          const isToggling = toggling[providerKey]

          // Map provider to source enum for metrics
          const sourceKey = Object.entries(SOURCE_TO_PROVIDER).find(
            ([, v]) => v === providerKey,
          )?.[0]

          const totalCount = sourceKey ? getSourceCount(sourceKey, 'total') : 0
          const last24hCount = sourceKey ? getSourceCount(sourceKey, 'last24h') : 0

          return (
            <div
              key={providerKey}
              className="rounded-2xl border border-solar-800/20 bg-zinc-900/60 p-6 backdrop-blur-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Left: Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-foreground">{label}</h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        enabled
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                          : 'bg-zinc-700/50 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {enabled ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {description && (
                    <p className="mt-1 text-sm text-foreground-muted">{description}</p>
                  )}

                  {/* Config details */}
                  {providerData && (
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-foreground-muted">
                      <span>
                        Env: <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-solar-400">{providerData.apiKeyEnv}</code>
                      </span>
                      <span>Rate limit: {providerData.rateLimitPerHour}/h</span>
                      <span>Atualizado por: {providerData.updatedBy}</span>
                    </div>
                  )}

                  {/* Usage metrics */}
                  <div className="mt-3 flex gap-6 text-xs text-foreground-muted">
                    <span>Cache total: <strong className="text-foreground">{totalCount}</strong></span>
                    <span>Ultimas 24h: <strong className="text-foreground">{last24hCount}</strong></span>
                  </div>

                  {/* Health result */}
                  {health && (
                    <div
                      className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                        health.status === 'ok'
                          ? 'border-green-500/30 bg-green-500/10 text-green-400'
                          : 'border-red-500/30 bg-red-500/10 text-red-400'
                      }`}
                    >
                      <span className="font-medium">
                        {health.status === 'ok' ? 'OK' : 'ERRO'}
                      </span>
                      {' - '}
                      {health.message}
                      <span className="ml-2 text-foreground-muted">({health.latencyMs}ms)</span>
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => handleHealthCheck(providerKey)}
                    disabled={isHealthLoading}
                    className="rounded-lg border border-solar-800/30 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-foreground-muted transition-all hover:border-solar-500/30 hover:text-solar-300 disabled:opacity-50"
                  >
                    {isHealthLoading ? 'Verificando...' : 'Health Check'}
                  </button>

                  <button
                    onClick={() => handleToggle(providerKey, enabled)}
                    disabled={isToggling}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${
                      enabled
                        ? 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : 'border border-solar-500/30 bg-solar-500/10 text-solar-300 hover:bg-solar-500/20'
                    }`}
                  >
                    {isToggling
                      ? '...'
                      : enabled
                        ? 'Desativar'
                        : 'Ativar'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {allProviderKeys.length === 0 && (
          <div className="rounded-2xl border border-solar-800/20 bg-zinc-900/60 p-8 text-center text-sm text-foreground-muted">
            Nenhum provedor configurado. Use a API PUT para criar configuracoes.
          </div>
        )}
      </section>

      {/* Metrics Overview */}
      {metrics && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Metricas de Cache</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              label="Entradas Ativas"
              value={metrics.activeCacheEntries}
              color="solar"
            />
            <MetricCard
              label="Entradas Expiradas"
              value={metrics.expiredCacheEntries}
              color="amber"
            />
            <MetricCard
              label="Total de Entradas"
              value={metrics.totalCacheEntries}
              color="zinc"
            />
          </div>

          {/* Per-source breakdown */}
          {Object.keys(metrics.bySource).length > 0 && (
            <div className="rounded-2xl border border-solar-800/20 bg-zinc-900/60 p-6 backdrop-blur-md">
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                Cache por Fonte
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700 text-left text-xs text-foreground-muted">
                      <th className="pb-2 pr-4">Fonte</th>
                      <th className="pb-2 pr-4 text-right">Total</th>
                      <th className="pb-2 text-right">Ultimas 24h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(metrics.bySource).map(([source, count]) => (
                      <tr key={source} className="border-b border-zinc-800">
                        <td className="py-2 pr-4 text-foreground">{source}</td>
                        <td className="py-2 pr-4 text-right text-foreground-muted">{count}</td>
                        <td className="py-2 text-right text-foreground-muted">
                          {metrics.last24h[source] ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Metric Card Sub-component
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'solar' | 'amber' | 'zinc'
}) {
  const colorMap = {
    solar: 'border-solar-500/20 bg-solar-500/5 text-solar-400',
    amber: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
    zinc: 'border-zinc-700 bg-zinc-800/50 text-zinc-300',
  }

  return (
    <div className={`rounded-2xl border p-5 ${colorMap[color]}`}>
      <p className="text-xs font-medium text-foreground-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value.toLocaleString('pt-BR')}</p>
    </div>
  )
}
