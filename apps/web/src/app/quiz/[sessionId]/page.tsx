'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { QuizEngine } from '@/components/quiz/QuizEngine'
import { GeneratingScript } from '@/components/quiz/GeneratingScript'
import { ReferencePicker } from '@/components/quiz/ReferencePicker'
import type { AnswerMap } from '@/lib/quiz/conditions'

interface QuizSessionData {
  id: string
  onboardingProfileId: string
  path1: 'AD' | 'ORGANIC' | null
  path2: 'MODELED' | 'FROM_SCRATCH' | null
  status: string
  answerMap: AnswerMap
  onboardingProfile: {
    id: string
    name: string
    answers?: Record<string, string>
  }
}

export default function QuizSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [sessionData, setSessionData] = useState<QuizSessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'quiz' | 'reference' | 'generating'>('quiz')

  useEffect(() => {
    fetch(`/api/quiz/session/${sessionId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Sessão não encontrada')
        }
        return res.json()
      })
      .then((data) => {
        if (data.status === 'COMPLETED') {
          router.push('/roteiros')
          return
        }
        setSessionData(data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sessionId, router])

  // Handle reference selection — update quiz session referenceSource
  const handleReferenceSelect = useCallback(
    async (referenceSource: 'API_SEARCH' | 'LINK_ANALYSIS' | 'NONE') => {
      try {
        await fetch(`/api/quiz/session/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referenceSource }),
        })
      } catch {
        // Non-blocking — proceed to generation even if PATCH fails
      }
      setPhase('generating')
    },
    [sessionId]
  )

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-solar-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !sessionData) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-400">{error ?? 'Sessão não encontrada'}</p>
        <button
          onClick={() => router.push('/quiz')}
          className="text-sm text-solar-400 hover:underline"
        >
          ← Voltar para Quiz
        </button>
      </div>
    )
  }

  // Phase 3: Generating script via SSE
  if (phase === 'generating') {
    return (
      <GeneratingScript
        quizSessionId={sessionData.id}
        profileName={sessionData.onboardingProfile.name}
      />
    )
  }

  // Phase 2: Reference picker (between quiz and generation)
  if (phase === 'reference') {
    const niche =
      sessionData.onboardingProfile.answers?.['O1'] ??
      sessionData.answerMap?.['O1'] ??
      ''

    return (
      <ReferencePicker
        sessionId={sessionData.id}
        path1={sessionData.path1 ?? 'AD'}
        niche={niche}
        onSelect={handleReferenceSelect}
      />
    )
  }

  // Phase 1: Quiz answering
  return (
    <div className="px-4 py-8">
      <div className="mx-auto mb-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Quiz — {sessionData.onboardingProfile.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              Responda as perguntas para gerar seu roteiro personalizado
            </p>
          </div>
          <button
            onClick={() => router.push('/quiz')}
            className="text-xs text-muted-foreground hover:text-solar-400"
          >
            ← Voltar
          </button>
        </div>
      </div>

      <QuizEngine
        sessionId={sessionData.id}
        initialAnswers={sessionData.answerMap}
        initialPath1={sessionData.path1}
        initialPath2={sessionData.path2}
        onComplete={() => setPhase('reference')}
      />
    </div>
  )
}
