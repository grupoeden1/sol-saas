'use client'

import type { EnrichmentResult } from '@/lib/services/enrichment'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HistoricalReferencesProps {
  items: EnrichmentResult[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}

function formatMetric(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HistoricalReferences({ items }: HistoricalReferencesProps) {
  if (!items || items.length === 0) {
    return null
  }

  // Collect unique provider names for the header badge
  const providers = [...new Set(items.map((item) => item.provider))]

  return (
    <section className="mt-6">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-zinc-200">
          Refer&ecirc;ncias Hist&oacute;ricas
        </h3>
        {providers.map((provider) => (
          <span
            key={provider}
            className="inline-flex items-center rounded-full bg-solar-500/20 px-2 py-0.5 text-xs font-medium text-solar-400"
          >
            {provider}
          </span>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <a
            key={`${item.sourceUrl}-${index}`}
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-lg border border-zinc-700 bg-zinc-900 p-3 transition-colors hover:border-solar-500/50 hover:bg-zinc-800/80"
          >
            <div className="flex items-start gap-3">
              {/* Thumbnail */}
              {item.thumbnailUrl && (
                <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-md bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-zinc-100 group-hover:text-solar-400">
                    {item.title}
                  </p>
                  <span className="flex-shrink-0 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                    {item.provider}
                  </span>
                </div>

                {item.description && (
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                    {truncate(item.description, 140)}
                  </p>
                )}

                {/* Metrics */}
                {item.metrics && (
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-zinc-500">
                    {item.metrics.views !== undefined && (
                      <span>{formatMetric(item.metrics.views)} views</span>
                    )}
                    {item.metrics.likes !== undefined && (
                      <span>{formatMetric(item.metrics.likes)} likes</span>
                    )}
                    {item.metrics.comments !== undefined && (
                      <span>{formatMetric(item.metrics.comments)} comments</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
