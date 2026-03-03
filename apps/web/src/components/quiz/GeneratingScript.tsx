'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface GeneratingScriptProps {
  quizSessionId: string
  profileName: string
}

export function GeneratingScript({
  quizSessionId,
  profileName,
}: GeneratingScriptProps) {
  const router = useRouter()
  const [status, setStatus] = useState<'generating' | 'done' | 'error'>('generating')
  const [script, setScript] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const scriptRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  const generate = useCallback(async () => {
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizSessionId }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.error === 'insufficient_credits') {
          setErrorMessage(
            `Créditos insuficientes. Necessário: ${data.required}, disponível: ${data.available}`
          )
        } else {
          setErrorMessage(data.error ?? 'Erro ao gerar roteiro')
        }
        setStatus('error')
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setErrorMessage('Erro de conexão')
        setStatus('error')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue

          try {
            const data = JSON.parse(jsonStr)

            if (data.error) {
              setErrorMessage(data.error)
              setStatus('error')
              return
            }

            if (data.token) {
              setScript((prev) => prev + data.token)
            }

            if (data.done) {
              setConversationId(data.conversationId)
              setStatus('done')
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch {
      setErrorMessage('Erro de conexão ao gerar roteiro')
      setStatus('error')
    }
  }, [quizSessionId])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    generate()
  }, [generate])

  // Auto-scroll as content streams
  useEffect(() => {
    if (scriptRef.current) {
      scriptRef.current.scrollTop = scriptRef.current.scrollHeight
    }
  }, [script])

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col px-4 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">
          Gerando Roteiro — {profileName}
        </h1>
        <p className="text-xs text-muted-foreground">
          {status === 'generating'
            ? 'A IA está criando seu roteiro personalizado...'
            : status === 'done'
              ? 'Roteiro gerado com sucesso!'
              : 'Ocorreu um erro na geração'}
        </p>
      </div>

      {/* Status indicator */}
      {status === 'generating' && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-solar-500/30 bg-solar-500/5 px-4 py-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-solar-500 border-t-transparent" />
          <span className="text-sm text-solar-400">Gerando roteiro...</span>
        </div>
      )}

      {status === 'done' && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3">
          <span className="text-green-400">&#10003;</span>
          <span className="text-sm text-green-400">Roteiro gerado com sucesso!</span>
        </div>
      )}

      {status === 'error' && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-400">{errorMessage}</p>
        </div>
      )}

      {/* Script content */}
      {script && (
        <div
          ref={scriptRef}
          className="flex-1 overflow-y-auto rounded-xl border border-solar-800/30 bg-background-secondary p-6"
          style={{ maxHeight: '60vh' }}
        >
          <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm text-foreground">
            {script}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex items-center justify-between">
        {status === 'error' && (
          <button
            onClick={() => {
              setStatus('generating')
              setScript('')
              setErrorMessage(null)
              startedRef.current = false
              generate()
            }}
            className="rounded-lg border border-solar-800/30 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-background-secondary"
          >
            Tentar novamente
          </button>
        )}

        {status === 'done' && conversationId && (
          <div className="flex w-full items-center justify-end gap-3">
            <button
              onClick={() => router.push('/roteiros')}
              className="rounded-lg border border-solar-800/30 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-background-secondary"
            >
              Meus Roteiros
            </button>
            <button
              onClick={() => router.push(`/roteiros/${conversationId}`)}
              className="rounded-lg bg-solar-500 px-6 py-2 text-sm font-semibold text-black transition-colors hover:bg-solar-400"
            >
              Ver Roteiro e Iterar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
