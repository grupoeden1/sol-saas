'use client'

import type { PerformanceStatus } from '@/lib/performance/types'

const STEPS: { key: PerformanceStatus; label: string }[] = [
  { key: 'PRODUCED', label: 'Produzido' },
  { key: 'PUBLISHED', label: 'Publicado' },
  { key: 'METRICS', label: 'Métricas' },
  { key: 'ANALYZED', label: 'Analisado' },
]

const STATUS_ORDER: Record<PerformanceStatus, number> = {
  PRODUCED: 0,
  PUBLISHED: 1,
  METRICS: 2,
  ANALYZED: 3,
}

interface StatusTrackerProps {
  status: PerformanceStatus
}

export function StatusTracker({ status }: StatusTrackerProps) {
  const currentIndex = STATUS_ORDER[status]

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex
        const isCurrent = i === currentIndex

        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isCompleted
                    ? 'bg-solar-500 text-black'
                    : isCurrent
                      ? 'border-2 border-solar-500 text-solar-400'
                      : 'border border-solar-800/40 text-muted-foreground/50'
                }`}
              >
                {isCompleted ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isCompleted || isCurrent ? 'text-solar-400' : 'text-muted-foreground/50'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mb-4 h-px flex-1 ${
                  i < currentIndex ? 'bg-solar-500' : 'bg-solar-800/30'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
