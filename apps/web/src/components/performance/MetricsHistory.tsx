'use client'

import type { ContentType, PerformanceMetrics, Classification } from '@/lib/performance/types'
import { CLASSIFICATION_LABELS, CLASSIFICATION_COLORS } from '@/lib/performance/types'

interface MetricsHistoryProps {
  metrics: PerformanceMetrics[]
  contentType: ContentType
  classification: Classification | null
}

export function MetricsHistory({ metrics, contentType, classification }: MetricsHistoryProps) {
  if (metrics.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Histórico de Métricas</h3>
        {classification && (
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${CLASSIFICATION_COLORS[classification]}`}>
            {CLASSIFICATION_LABELS[classification]}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-solar-800/20 text-muted-foreground">
              <th className="py-2 pr-3 text-left font-medium">Dia</th>
              {contentType === 'PAID' ? (
                <>
                  <th className="px-2 py-2 text-right font-medium">Impr.</th>
                  <th className="px-2 py-2 text-right font-medium">CTR</th>
                  <th className="px-2 py-2 text-right font-medium">CPC</th>
                  <th className="px-2 py-2 text-right font-medium">CPM</th>
                  <th className="px-2 py-2 text-right font-medium">CPA</th>
                  <th className="px-2 py-2 text-right font-medium">ROAS</th>
                  <th className="px-2 py-2 text-right font-medium">Hook</th>
                  <th className="px-2 py-2 text-right font-medium">Ret.</th>
                </>
              ) : (
                <>
                  <th className="px-2 py-2 text-right font-medium">Views</th>
                  <th className="px-2 py-2 text-right font-medium">Likes</th>
                  <th className="px-2 py-2 text-right font-medium">Coment.</th>
                  <th className="px-2 py-2 text-right font-medium">Shares</th>
                  <th className="px-2 py-2 text-right font-medium">Salvos</th>
                  <th className="px-2 py-2 text-right font-medium">Ret.</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.id} className="border-b border-solar-800/10">
                <td className="py-2 pr-3 font-medium text-foreground">Dia {m.snapshotDay}</td>
                {contentType === 'PAID' ? (
                  <>
                    <td className="px-2 py-2 text-right text-foreground">{formatInt(m.impressions)}</td>
                    <td className="px-2 py-2 text-right text-foreground">{formatPct(m.ctr)}</td>
                    <td className="px-2 py-2 text-right text-foreground">{formatCurrency(m.cpc)}</td>
                    <td className="px-2 py-2 text-right text-foreground">{formatCurrency(m.cpm)}</td>
                    <td className="px-2 py-2 text-right text-foreground">{formatCurrency(m.cpa)}</td>
                    <td className="px-2 py-2 text-right font-medium text-solar-400">{formatFloat(m.roas, 'x')}</td>
                    <td className="px-2 py-2 text-right text-foreground">{formatPct(m.hookRate)}</td>
                    <td className="px-2 py-2 text-right text-foreground">{formatPct(m.retention)}</td>
                  </>
                ) : (
                  <>
                    <td className="px-2 py-2 text-right text-foreground">{formatInt(m.views)}</td>
                    <td className="px-2 py-2 text-right text-foreground">{formatInt(m.likes)}</td>
                    <td className="px-2 py-2 text-right text-foreground">{formatInt(m.comments)}</td>
                    <td className="px-2 py-2 text-right text-foreground">{formatInt(m.shares)}</td>
                    <td className="px-2 py-2 text-right text-foreground">{formatInt(m.saves)}</td>
                    <td className="px-2 py-2 text-right font-medium text-solar-400">{formatPct(m.retention)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatInt(v: number | null): string {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR')
}

function formatPct(v: number | null): string {
  if (v == null) return '—'
  return `${v.toFixed(1)}%`
}

function formatCurrency(v: number | null): string {
  if (v == null) return '—'
  return `R$${v.toFixed(2)}`
}

function formatFloat(v: number | null, suffix: string): string {
  if (v == null) return '—'
  return `${v.toFixed(2)}${suffix}`
}
