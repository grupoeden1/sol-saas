'use client'

import { useEffect, useState } from 'react'

interface NicheAngle {
  niche: string
  totalScripts: number
  goodOrExcellent: number
  bestAwareness: number | null
  bestSophistication: number | null
  bestContentType: string | null
  topModules: string[]
}

interface ModuleCorrelation {
  module: string
  count: number
  classifications: Record<string, number>
}

interface TopScript {
  niche: string
  modulesUsed: string[]
  classification: string
  awarenessLevel: number
  sophisticationLevel: number
  contentType: string
}

interface IntelligenceData {
  bestAnglesByNiche: NicheAngle[]
  moduleCorrelation: ModuleCorrelation[]
  topScripts: TopScript[]
  totalClassified: number
}

export function IntelligenceDashboard() {
  const [data, setData] = useState<IntelligenceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/intelligence')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Carregando...</div>
  }

  if (!data || data.totalClassified === 0) {
    return (
      <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
        <p className="text-gray-400">Nenhum dado de inteligencia disponivel.</p>
        <p className="text-gray-500 text-sm mt-2">
          Os dados aparecerao quando houver roteiros classificados como BOM ou EXCELENTE.
        </p>
      </div>
    )
  }

  // Sort modules: best performing first
  const sortedModules = [...data.moduleCorrelation]
    .map(m => {
      const good = (m.classifications['GOOD'] ?? 0) + (m.classifications['EXCELLENT'] ?? 0)
      const bad = (m.classifications['BAD'] ?? 0) + (m.classifications['TERRIBLE'] ?? 0)
      const successRate = m.count > 0 ? good / m.count : 0
      return { ...m, successRate, good, bad }
    })
    .sort((a, b) => b.successRate - a.successRate)

  const topModules = sortedModules.filter(m => m.count >= 3).slice(0, 5)
  const antiPatterns = sortedModules
    .filter(m => m.count >= 3 && m.bad > m.good)
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <div className="text-sm text-gray-500">
        {data.totalClassified} roteiros classificados
      </div>

      {/* Top modules correlated with GOOD/EXCELLENT */}
      <section className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold mb-1">Top Modulos — Correlacao com Sucesso</h2>
        <p className="text-xs text-gray-500 mb-4">Modulos mais presentes em roteiros BOM/EXCELENTE (min 3 usos)</p>
        {topModules.length === 0 ? (
          <p className="text-gray-500 text-sm">Dados insuficientes (min 3 usos por modulo).</p>
        ) : (
          <div className="space-y-3">
            {topModules.map((m, i) => (
              <div key={m.module} className="flex items-center gap-3">
                <div className="w-6 text-sm text-gray-500 font-bold">#{i + 1}</div>
                <div className="w-48 text-sm font-mono truncate">{m.module}</div>
                <div className="flex-1 flex gap-1 items-center">
                  <div className="bg-green-500/30 rounded px-2 py-0.5 text-xs text-green-400">
                    {Math.round(m.successRate * 100)}% sucesso
                  </div>
                  <span className="text-xs text-gray-500">({m.count} usos, {m.good} bons)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Best angles by niche */}
      <section className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold mb-1">Melhores Angulos por Nicho</h2>
        <p className="text-xs text-gray-500 mb-4">Nichos com 5+ roteiros — configuracoes que mais performam</p>
        {data.bestAnglesByNiche.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum nicho com 5+ roteiros ainda.</p>
        ) : (
          <div className="space-y-4">
            {data.bestAnglesByNiche.map(n => (
              <div key={n.niche} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{n.niche}</h3>
                  <span className="text-xs text-gray-500">
                    {n.goodOrExcellent}/{n.totalScripts} bons ({Math.round((n.goodOrExcellent / n.totalScripts) * 100)}%)
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Consciencia: </span>
                    <span>{n.bestAwareness ?? '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Sofisticacao: </span>
                    <span>{n.bestSophistication ?? '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tipo: </span>
                    <span>{n.bestContentType ?? '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Top modulos: </span>
                    <span>{n.topModules.join(', ') || '-'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Anti-patterns */}
      <section className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold mb-1">Anti-Padroes</h2>
        <p className="text-xs text-gray-500 mb-4">Modulos com mais roteiros PESSIMO/RUIM do que BOM/EXCELENTE</p>
        {antiPatterns.length === 0 ? (
          <p className="text-green-400 text-sm">Nenhum anti-padrao detectado.</p>
        ) : (
          <div className="space-y-2">
            {antiPatterns.map(m => (
              <div key={m.module} className="flex items-center gap-3 bg-red-500/5 rounded-lg px-3 py-2">
                <div className="w-48 text-sm font-mono truncate">{m.module}</div>
                <div className="flex gap-2 text-xs">
                  <span className="text-red-400">{m.bad} ruins</span>
                  <span className="text-gray-500">vs</span>
                  <span className="text-green-400">{m.good} bons</span>
                  <span className="text-gray-500">({m.count} total)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Top 10 recent good scripts */}
      <section className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold mb-4">Ultimos Roteiros de Sucesso</h2>
        {data.topScripts.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum roteiro BOM/EXCELENTE ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="text-left py-2 pr-4">Nicho</th>
                  <th className="text-center py-2 px-2">Tipo</th>
                  <th className="text-center py-2 px-2">Consc.</th>
                  <th className="text-center py-2 px-2">Sofist.</th>
                  <th className="text-center py-2 px-2">Class.</th>
                  <th className="text-left py-2 px-2">Modulos</th>
                </tr>
              </thead>
              <tbody>
                {data.topScripts.map((s, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-2 pr-4">{s.niche}</td>
                    <td className="py-2 px-2 text-center">{s.contentType}</td>
                    <td className="py-2 px-2 text-center">{s.awarenessLevel}</td>
                    <td className="py-2 px-2 text-center">{s.sophisticationLevel}</td>
                    <td className="py-2 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        s.classification === 'EXCELLENT' ? 'bg-green-500/20 text-green-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {s.classification === 'EXCELLENT' ? 'Excelente' : 'Bom'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-xs text-gray-400 truncate max-w-48">
                      {s.modulesUsed.slice(0, 3).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
