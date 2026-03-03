'use client'

import { useState, useEffect, useCallback } from 'react'

interface ProcessingStatusProps {
  videoAnalysisId: string
  onCompleted?: () => void
  onRetry?: () => void
}

const STATUS_LABELS: Record<string, string> = {
  QUEUED: 'Preparando análise...',
  PROCESSING: 'Analisando vídeo...',
  COMPLETED: 'Análise concluída!',
  FAILED: 'Erro na análise',
}

const STATUS_DETAILS: Record<string, string> = {
  QUEUED: 'Seu vídeo entrou na fila de processamento',
  PROCESSING: 'Transcrevendo áudio e analisando frames...',
  COMPLETED: 'O vídeo foi analisado com sucesso. Continue o quiz.',
  FAILED: 'Ocorreu um erro durante o processamento.',
}

export function ProcessingStatus({
  videoAnalysisId,
  onCompleted,
  onRetry,
}: ProcessingStatusProps) {
  const [status, setStatus] = useState<string>('QUEUED')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null)

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/video/status/${videoAnalysisId}`)
      if (!res.ok) return

      const data = await res.json()
      setStatus(data.status)
      setErrorMessage(data.errorMessage)
      setProcessingTimeMs(data.processingTimeMs)

      if (data.status === 'COMPLETED') {
        onCompleted?.()
      }
    } catch {
      // Ignore polling errors
    }
  }, [videoAnalysisId, onCompleted])

  useEffect(() => {
    if (status === 'COMPLETED' || status === 'FAILED') return

    const interval = setInterval(poll, 3000)
    poll() // Initial fetch

    return () => clearInterval(interval)
  }, [poll, status])

  const isActive = status === 'QUEUED' || status === 'PROCESSING'
  const isComplete = status === 'COMPLETED'
  const isFailed = status === 'FAILED'

  return (
    <div
      className={`rounded-lg border p-4 ${
        isComplete
          ? 'border-green-500/30 bg-green-500/5'
          : isFailed
            ? 'border-red-500/30 bg-red-500/5'
            : 'border-solar-500/30 bg-solar-500/5'
      }`}
    >
      <div className="flex items-center gap-3">
        {isActive && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-solar-500 border-t-transparent" />
        )}
        {isComplete && <span className="text-lg text-green-400">&#10003;</span>}
        {isFailed && <span className="text-lg text-red-400">&#10007;</span>}

        <div className="flex-1">
          <p
            className={`text-sm font-medium ${
              isComplete
                ? 'text-green-400'
                : isFailed
                  ? 'text-red-400'
                  : 'text-solar-400'
            }`}
          >
            {STATUS_LABELS[status] ?? status}
          </p>
          <p className="text-xs text-muted-foreground">
            {errorMessage ?? STATUS_DETAILS[status] ?? ''}
          </p>
          {processingTimeMs && isComplete && (
            <p className="text-xs text-muted-foreground">
              Processado em {(processingTimeMs / 1000).toFixed(1)}s
            </p>
          )}
        </div>
      </div>

      {isFailed && onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg border border-solar-800/30 px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-background-secondary"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}
