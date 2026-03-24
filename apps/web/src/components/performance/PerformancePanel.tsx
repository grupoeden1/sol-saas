'use client'

import { useEffect, useState, useCallback } from 'react'
import type { PerformanceData, ContentType } from '@/lib/performance/types'
import { StatusTracker } from './StatusTracker'
import { MetricsForm } from './MetricsForm'
import { MetricsHistory } from './MetricsHistory'

interface PerformancePanelProps {
  conversationId: string
  isQuiz: boolean
}

export function PerformancePanel({ conversationId, isQuiz }: PerformancePanelProps) {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/scripts/${conversationId}/performance`)
      if (res.status === 404) {
        setData(null)
        setNotFound(true)
        return
      }
      if (!res.ok) throw new Error('Erro ao buscar dados')
      const perf = await res.json()
      setData(perf)
      setNotFound(false)
    } catch {
      setError('Erro ao carregar dados de performance.')
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleStartTracking = async (contentType: ContentType) => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/scripts/${conversationId}/performance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? 'Erro ao registrar produção')
        return
      }
      await fetchData()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAdvanceStatus = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/scripts/${conversationId}/performance`, {
        method: 'PATCH',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? 'Erro ao avançar status')
        return
      }
      await fetchData()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-solar-500 border-t-transparent" />
      </div>
    )
  }

  if (!isQuiz) {
    return (
      <div className="rounded-xl border border-solar-800/20 bg-background-secondary p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Acompanhamento de performance disponível apenas para roteiros gerados via quiz.
        </p>
      </div>
    )
  }

  // No tracking yet — show start form
  if (notFound || !data) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-solar-800/20 bg-background-secondary p-6 text-center">
          <div className="mb-3 text-3xl">📊</div>
          <h2 className="mb-1 text-base font-semibold text-foreground">
            Acompanhe a Performance
          </h2>
          <p className="mb-6 text-xs text-muted-foreground">
            Registre quando o roteiro for produzido e acompanhe os resultados reais.
          </p>

          <p className="mb-3 text-xs font-medium text-muted-foreground">
            Tipo de conteúdo:
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleStartTracking('PAID')}
              disabled={actionLoading}
              className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-solar-800/30 bg-white/5 p-4 transition-all hover:border-solar-500/40 hover:bg-solar-500/5 disabled:opacity-50"
            >
              <span className="text-2xl">💰</span>
              <span className="text-sm font-medium text-foreground">Pago</span>
              <span className="text-[10px] text-muted-foreground">Anúncios, tráfego pago</span>
            </button>
            <button
              onClick={() => handleStartTracking('ORGANIC')}
              disabled={actionLoading}
              className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-solar-800/30 bg-white/5 p-4 transition-all hover:border-solar-500/40 hover:bg-solar-500/5 disabled:opacity-50"
            >
              <span className="text-2xl">📱</span>
              <span className="text-sm font-medium text-foreground">Orgânico</span>
              <span className="text-[10px] text-muted-foreground">Reels, TikTok, YouTube</span>
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Has tracking data
  return (
    <div className="space-y-6">
      {/* Status tracker */}
      <div className="rounded-xl border border-solar-800/20 bg-background-secondary p-4">
        <StatusTracker status={data.status} />
      </div>

      {/* Action based on current status */}
      {data.status === 'PRODUCED' && (
        <div className="rounded-xl border border-solar-800/20 bg-background-secondary p-6 text-center">
          <p className="mb-1 text-sm text-foreground">
            Roteiro marcado como <span className="font-semibold text-solar-400">produzido</span>
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            Quando publicar o conteúdo, registre aqui para iniciar o acompanhamento.
          </p>
          <button
            onClick={handleAdvanceStatus}
            disabled={actionLoading}
            className="rounded-lg bg-solar-500 px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-solar-400 disabled:opacity-50"
          >
            {actionLoading ? 'Salvando...' : 'Marcar como Publicado'}
          </button>
        </div>
      )}

      {/* Metrics form (available from PUBLISHED onwards) */}
      {(data.status === 'PUBLISHED' || data.status === 'METRICS' || data.status === 'ANALYZED') && (
        <div className="rounded-xl border border-solar-800/20 bg-background-secondary p-5">
          <MetricsForm
            conversationId={conversationId}
            contentType={data.contentType}
            existingMetrics={data.metrics}
            onSubmitted={fetchData}
          />
        </div>
      )}

      {/* Metrics history + classification */}
      {data.metrics.length > 0 && (
        <div className="rounded-xl border border-solar-800/20 bg-background-secondary p-5">
          <MetricsHistory
            metrics={data.metrics}
            contentType={data.contentType}
            classification={data.classification}
          />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}
