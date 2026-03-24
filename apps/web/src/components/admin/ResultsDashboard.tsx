'use client'

import { useEffect, useState } from 'react'

interface ClassificationDist {
  classification: string
  count: number
}

interface NichePerf {
  niche: string
  count: number
  avgAwareness: number | null
  avgSophistication: number | null
  avgExecutionScore: number | null
}

interface ModulePerf {
  module: string
  count: number
  classifications: string[]
}

interface ResultsData {
  period: string
  total: number
  classificationDistribution: ClassificationDist[]
  nichePerformance: NichePerf[]
  modulePerformance: ModulePerf[]
  executionGap: {
    avgScore: number | null
    totalAnalyzed: number
  }
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  EXCELLENT: 'bg-green-500/20 text-green-400',
  GOOD: 'bg-emerald-500/20 text-emerald-400',
  AVERAGE: 'bg-yellow-500/20 text-yellow-400',
  BAD: 'bg-orange-500/20 text-orange-400',
  TERRIBLE: 'bg-red-500/20 text-red-400',
  UNCLASSIFIED: 'bg-gray-500/20 text-gray-400',
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  EXCELLENT: 'Excelente',
  GOOD: 'Bom',
  AVERAGE: 'Mediano',
  BAD: 'Ruim',
  TERRIBLE: 'Pessimo',
  UNCLASSIFIED: 'Sem classificacao',
}

export function ResultsDashboard() {
  const [data, setData] = useState<ResultsData | null>(null)
  const [period, setPeriod] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/results?period=${period}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [period])

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Carregando...</div>
  }

  if (!data || data.total === 0) {
    return (
      <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
        <p className="text-gray-400">Nenhum dado de performance disponivel.</p>
        <p className="text-gray-500 text-sm mt-2">
          Os dados aparecerao quando usuarios registrarem performance dos roteiros.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Period selector */}
      <div className="flex gap-2">
        {['all', '30d', '90d', '7d'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? 'bg-solar-500/20 text-solar-300'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {p === 'all' ? 'Total' : p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
          </button>
        ))}
      </div>

      {/* Classification distribution */}
      <section className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold mb-4">Distribuicao de Classificacao</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {data.classificationDistribution.map(d => {
            const pct = data.total > 0 ? Math.round((d.count / data.total) * 100) : 0
            return (
              <div
                key={d.classification}
                className={`rounded-lg p-3 text-center ${CLASSIFICATION_COLORS[d.classification] ?? CLASSIFICATION_COLORS.UNCLASSIFIED}`}
              >
                <div className="text-2xl font-bold">{d.count}</div>
                <div className="text-xs mt-1">{CLASSIFICATION_LABELS[d.classification] ?? d.classification}</div>
                <div className="text-xs opacity-70">{pct}%</div>
              </div>
            )
          })}
        </div>
        <div className="text-right text-sm text-gray-500 mt-3">Total: {data.total} roteiros</div>
      </section>

      {/* Performance by niche */}
      <section className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold mb-4">Performance por Nicho</h2>
        {data.nichePerformance.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum dado de nicho disponivel.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="text-left py-2 pr-4">Nicho</th>
                  <th className="text-center py-2 px-2">Roteiros</th>
                  <th className="text-center py-2 px-2">Consciencia Media</th>
                  <th className="text-center py-2 px-2">Sofisticacao Media</th>
                  <th className="text-center py-2 px-2">Exec. Media</th>
                </tr>
              </thead>
              <tbody>
                {data.nichePerformance.map(n => (
                  <tr key={n.niche} className="border-b border-white/5">
                    <td className="py-2 pr-4 font-medium">{n.niche}</td>
                    <td className="py-2 px-2 text-center">{n.count}</td>
                    <td className="py-2 px-2 text-center">{n.avgAwareness?.toFixed(1) ?? '-'}</td>
                    <td className="py-2 px-2 text-center">{n.avgSophistication?.toFixed(1) ?? '-'}</td>
                    <td className="py-2 px-2 text-center">{n.avgExecutionScore?.toFixed(1) ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Execution gap */}
      <section className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold mb-4">Gap de Execucao</h2>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold">
              {data.executionGap.avgScore?.toFixed(1) ?? '-'}
              <span className="text-lg text-gray-400">/5</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">Nota media de execucao</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{data.executionGap.totalAnalyzed}</div>
            <div className="text-xs text-gray-400 mt-1">Videos analisados</div>
          </div>
          {data.executionGap.avgScore !== null && data.executionGap.avgScore < 3 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-4 py-2 text-sm text-orange-400">
              Nota media abaixo de 3 — indica problema de execucao, nao de roteiro.
            </div>
          )}
        </div>
      </section>

      {/* Performance by module */}
      <section className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold mb-4">Performance por Modulo</h2>
        {data.modulePerformance.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum dado de modulo disponivel.</p>
        ) : (
          <div className="space-y-2">
            {data.modulePerformance
              .sort((a, b) => b.count - a.count)
              .slice(0, 15)
              .map(m => {
                const good = m.classifications.filter(c => c === 'GOOD' || c === 'EXCELLENT').length
                const goodPct = m.count > 0 ? Math.round((good / m.count) * 100) : 0
                return (
                  <div key={m.module} className="flex items-center gap-3">
                    <div className="w-48 text-sm font-mono truncate">{m.module}</div>
                    <div className="flex-1 bg-white/5 rounded-full h-4 overflow-hidden">
                      <div
                        className="h-full bg-green-500/40 rounded-full"
                        style={{ width: `${goodPct}%` }}
                      />
                    </div>
                    <div className="w-20 text-right text-sm text-gray-400">
                      {goodPct}% bom ({m.count})
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </section>
    </div>
  )
}
