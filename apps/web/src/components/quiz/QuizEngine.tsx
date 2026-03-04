'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { QuestionDefinition } from '@/lib/quiz/questions'
import { QUIZ_SECTIONS, getActiveSections } from '@/lib/quiz/questions'
import {
  derivePath1,
  derivePath2,
  getSectionProgress,
  getVisibleQuestions,
  isSectionComplete,
  type AnswerMap,
} from '@/lib/quiz/conditions'

interface QuizEngineProps {
  sessionId: string
  initialAnswers: AnswerMap
  initialPath1: 'AD' | 'ORGANIC' | null
  initialPath2: 'MODELED' | 'FROM_SCRATCH' | null
  onComplete?: () => void
}

export function QuizEngine({
  sessionId,
  initialAnswers,
  initialPath1,
  initialPath2,
  onComplete,
}: QuizEngineProps) {
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [saving, setSaving] = useState(false)

  const path1 = derivePath1(answers) ?? initialPath1
  const path2 = derivePath2(answers) ?? initialPath2
  const activeSectionKeys = getActiveSections(path1, path2)

  const activeSections = QUIZ_SECTIONS.filter((s) =>
    activeSectionKeys.includes(s.key)
  )

  const currentSection = activeSections[currentSectionIndex]
  const sectionQuestions = currentSection
    ? getVisibleQuestions(currentSection.questions, answers)
    : []
  const currentQuestion = sectionQuestions[currentQuestionIndex]

  // Auto-save answer to API
  const saveAnswer = useCallback(
    async (question: QuestionDefinition, value: string) => {
      setSaving(true)
      try {
        await fetch('/api/quiz/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizSessionId: sessionId,
            questionKey: question.questionKey,
            section: question.section,
            answerType: question.type,
            answerValue: value,
          }),
        })
      } finally {
        setSaving(false)
      }
    },
    [sessionId]
  )

  const handleAnswer = useCallback(
    (questionKey: string, value: string) => {
      setAnswers((prev) => ({ ...prev, [questionKey]: value }))

      const question = sectionQuestions.find((q) => q.questionKey === questionKey)
      if (question) {
        saveAnswer(question, value)
      }
    },
    [sectionQuestions, saveAnswer]
  )

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < sectionQuestions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1)
    } else if (currentSectionIndex < activeSections.length - 1) {
      setCurrentSectionIndex((i) => i + 1)
      setCurrentQuestionIndex(0)
    }
  }, [currentQuestionIndex, sectionQuestions.length, currentSectionIndex, activeSections.length])

  const handlePrev = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((i) => i - 1)
    } else if (currentSectionIndex > 0) {
      const prevSection = activeSections[currentSectionIndex - 1]
      const prevQuestions = prevSection
        ? getVisibleQuestions(prevSection.questions, answers)
        : []
      setCurrentSectionIndex((i) => i - 1)
      setCurrentQuestionIndex(Math.max(0, prevQuestions.length - 1))
    }
  }, [currentQuestionIndex, currentSectionIndex, activeSections, answers])

  const handleComplete = useCallback(() => {
    // Don't PATCH status here — the /api/quiz/generate endpoint
    // marks the session COMPLETED after successful generation.
    onComplete?.()
  }, [onComplete])

  // Check if all required questions across all active sections are answered
  const isQuizComplete = activeSections.every((section) =>
    isSectionComplete(section.questions, answers)
  )

  const isLastQuestion =
    currentSectionIndex === activeSections.length - 1 &&
    currentQuestionIndex === sectionQuestions.length - 1

  const canGoNext = currentQuestion
    ? !currentQuestion.required || (answers[currentQuestion.questionKey]?.trim() ?? '') !== ''
    : false

  // Total progress across all sections
  const totalProgress = activeSections.reduce(
    (acc, section) => {
      const progress = getSectionProgress(section.questions, answers)
      return {
        answered: acc.answered + progress.answered,
        total: acc.total + progress.total,
      }
    },
    { answered: 0, total: 0 }
  )

  if (!currentSection || !currentQuestion) {
    return null
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col">
      {/* Section navigation sidebar */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {activeSections.map((section, idx) => {
          const progress = getSectionProgress(section.questions, answers)
          const isActive = idx === currentSectionIndex
          const isComplete = isSectionComplete(section.questions, answers)
          return (
            <button
              key={section.key}
              onClick={() => {
                setCurrentSectionIndex(idx)
                setCurrentQuestionIndex(0)
              }}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-solar-500/20 text-solar-400 ring-1 ring-solar-500/40'
                  : isComplete
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-background-secondary text-muted-foreground hover:bg-background-secondary/80'
              }`}
            >
              {isComplete && <span className="text-green-400">&#10003;</span>}
              {section.label}
              <span className="text-xs opacity-60">
                {progress.answered}/{progress.total}
              </span>
            </button>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {currentSection.label} — Pergunta {currentQuestionIndex + 1} de{' '}
            {sectionQuestions.length}
          </span>
          <span>
            Total: {totalProgress.answered}/{totalProgress.total}
          </span>
        </div>
        <div className="h-2 rounded-full bg-background-secondary">
          <div
            className="h-2 rounded-full bg-solar-500 transition-all duration-300"
            style={{
              width: `${totalProgress.total > 0 ? (totalProgress.answered / totalProgress.total) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="flex-1">
        <div className="rounded-xl border border-solar-800/30 bg-background-secondary p-6">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-solar-400">
            {currentQuestion.questionKey}
          </div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            {currentQuestion.title}
          </h2>

          {/* Render question by type */}
          {currentQuestion.type === 'TEXT' && (
            <TextQuestion
              question={currentQuestion}
              value={answers[currentQuestion.questionKey] ?? ''}
              onChange={(val) => handleAnswer(currentQuestion.questionKey, val)}
            />
          )}

          {currentQuestion.type === 'SINGLE_SELECT' && currentQuestion.options && (
            <SingleSelectQuestion
              question={currentQuestion}
              value={answers[currentQuestion.questionKey] ?? ''}
              onChange={(val) => handleAnswer(currentQuestion.questionKey, val)}
            />
          )}

          {currentQuestion.type === 'UPLOAD' && (
            <UploadQuestion
              question={currentQuestion}
              value={answers[currentQuestion.questionKey] ?? ''}
              onChange={(val) => handleAnswer(currentQuestion.questionKey, val)}
              sessionId={sessionId}
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentSectionIndex === 0 && currentQuestionIndex === 0}
          className="rounded-lg border border-solar-800/30 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-background-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Anterior
        </button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {saving && <span className="text-solar-400">Salvando...</span>}
        </div>

        {isLastQuestion && isQuizComplete ? (
          <button
            onClick={handleComplete}
            className="rounded-lg bg-solar-500 px-6 py-2 text-sm font-semibold text-black transition-colors hover:bg-solar-400"
          >
            Finalizar Quiz
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className="rounded-lg bg-solar-500/20 px-4 py-2 text-sm font-medium text-solar-400 transition-colors hover:bg-solar-500/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próxima →
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Question type components
// ---------------------------------------------------------------------------

function TextQuestion({
  question,
  value,
  onChange,
}: {
  question: QuestionDefinition
  value: string
  onChange: (val: string) => void
}) {
  const [localValue, setLocalValue] = useState(value)

  // Sync local value when external value changes (e.g., from initial load)
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  return (
    <textarea
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue !== value) {
          onChange(localValue)
        }
      }}
      placeholder={question.example ?? ''}
      rows={4}
      className="w-full resize-none rounded-lg border border-solar-800/30 bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-solar-500/50 focus:outline-none focus:ring-1 focus:ring-solar-500/30"
    />
  )
}

function SingleSelectQuestion({
  question,
  value,
  onChange,
}: {
  question: QuestionDefinition
  value: string
  onChange: (val: string) => void
}) {
  return (
    <div className="grid gap-2">
      {question.options?.map((option) => {
        const isSelected = value === option.key
        return (
          <button
            key={option.key}
            onClick={() => onChange(option.key)}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
              isSelected
                ? 'border-solar-500/50 bg-solar-500/10 text-solar-400'
                : 'border-solar-800/20 bg-background text-foreground hover:border-solar-800/40 hover:bg-background-secondary'
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                isSelected
                  ? 'border-solar-500 bg-solar-500 text-black'
                  : 'border-solar-800/40 text-muted-foreground'
              }`}
            >
              {option.key}
            </span>
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

function UploadQuestion({
  question,
  value,
  onChange,
  sessionId,
}: {
  question: QuestionDefinition
  value: string
  onChange: (val: string) => void
  sessionId: string
}) {
  const [status, setStatus] = useState<UploadStatus>(value ? 'done' : 'idle')
  const [fileName, setFileName] = useState(value || '')
  const [errorMsg, setErrorMsg] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus('uploading')
    setFileName(file.name)
    setErrorMsg('')

    try {
      const formData = new FormData()
      formData.append('video', file)
      formData.append('quizSessionId', sessionId)

      const res = await fetch('/api/video/upload', { method: 'POST', body: formData })

      if (res.status === 402) {
        setStatus('error')
        setErrorMsg('Créditos insuficientes para processar vídeo.')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setStatus('error')
        setErrorMsg((data as { error?: string }).error || 'Erro ao fazer upload do vídeo.')
        return
      }

      const { videoAnalysisId } = await res.json() as { videoAnalysisId: string }
      setStatus('processing')

      // Poll every 5s until COMPLETED or FAILED
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/video/status/${videoAnalysisId}`)
          if (!statusRes.ok) return
          const statusData = await statusRes.json() as { status: string; errorMessage?: string }

          if (statusData.status === 'COMPLETED') {
            clearInterval(pollRef.current!)
            setStatus('done')
            onChange(file.name) // marks question as answered
          } else if (statusData.status === 'FAILED') {
            clearInterval(pollRef.current!)
            setStatus('error')
            setErrorMsg(statusData.errorMessage || 'Falha ao processar vídeo. Tente novamente.')
          }
        } catch {
          // transient network error — keep polling
        }
      }, 5000)
    } catch {
      setStatus('error')
      setErrorMsg('Erro ao conectar com o servidor.')
    }
  }

  return (
    <div className="rounded-lg border-2 border-dashed border-solar-800/30 p-6 text-center">
      {status === 'idle' && (
        <>
          <div className="mb-2 text-2xl">🎬</div>
          <p className="mb-1 text-sm font-medium text-foreground">Upload de vídeo referência</p>
          <p className="mb-3 text-xs text-muted-foreground">
            {question.example ?? 'MP4, MOV, AVI ou WebM · máx. 500MB · até 5 min'}
          </p>
          <label className="cursor-pointer rounded-lg border border-solar-500/30 bg-solar-500/10 px-4 py-2 text-xs font-medium text-solar-400 transition-all hover:bg-solar-500/20">
            Selecionar vídeo
            <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
          </label>
        </>
      )}

      {status === 'uploading' && (
        <>
          <div className="mb-3 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-solar-500 border-t-transparent" />
          </div>
          <p className="text-sm font-medium text-solar-300">Enviando vídeo…</p>
          <p className="mt-1 text-xs text-muted-foreground truncate max-w-[240px] mx-auto">{fileName}</p>
        </>
      )}

      {status === 'processing' && (
        <>
          <div className="mb-3 flex justify-center gap-1">
            <div className="h-2 w-2 animate-bounce rounded-full bg-solar-400 [animation-delay:0ms]" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-solar-400 [animation-delay:150ms]" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-solar-400 [animation-delay:300ms]" />
          </div>
          <p className="text-sm font-medium text-solar-300">Analisando vídeo com IA…</p>
          <p className="mt-1 text-xs text-muted-foreground">Isso pode levar 1-2 minutos.</p>
          <p className="mt-1 text-xs text-muted-foreground truncate max-w-[240px] mx-auto">{fileName}</p>
        </>
      )}

      {status === 'done' && (
        <>
          <div className="mb-2 flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-medium text-green-400">Vídeo analisado com sucesso!</p>
          <p className="mt-1 text-xs text-muted-foreground truncate max-w-[240px] mx-auto">{fileName}</p>
          <label className="mt-3 inline-block cursor-pointer text-xs text-solar-400 underline hover:text-solar-300">
            Trocar vídeo
            <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
          </label>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="mb-2 flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-medium text-red-400">Erro no upload</p>
          <p className="mt-1 text-xs text-muted-foreground">{errorMsg}</p>
          <label className="mt-3 inline-block cursor-pointer rounded-lg border border-solar-500/30 bg-solar-500/10 px-4 py-2 text-xs font-medium text-solar-400 transition-all hover:bg-solar-500/20">
            Tentar novamente
            <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
          </label>
        </>
      )}
    </div>
  )
}
