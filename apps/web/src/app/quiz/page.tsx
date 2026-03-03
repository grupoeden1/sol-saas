'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface OnboardingProfile {
  id: string
  name: string
  createdAt: string
}

interface QuizSessionItem {
  id: string
  onboardingProfileId: string
  path1: string | null
  path2: string | null
  status: string
  createdAt: string
  onboardingProfile: { name: string }
}

export default function QuizPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<OnboardingProfile[]>([])
  const [sessions, setSessions] = useState<QuizSessionItem[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/onboarding').then((r) => r.json()),
      fetch('/api/quiz').then((r) => r.json()),
    ]).then(([profileData, sessionData]) => {
      setProfiles(profileData)
      setSessions(sessionData)
      setLoading(false)
    })
  }, [])

  const handleCreateSession = async () => {
    if (!selectedProfileId) return
    setCreating(true)
    const res = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboardingProfileId: selectedProfileId }),
    })
    const session = await res.json()
    router.push(`/quiz/${session.id}`)
  }

  const inProgressSessions = sessions.filter((s) => s.status === 'IN_PROGRESS')

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-solar-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-foreground">Novo Roteiro</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Selecione um perfil de produto e inicie o quiz para gerar seu roteiro.
      </p>

      {/* In-progress sessions */}
      {inProgressSessions.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-solar-400">
            Quiz em andamento
          </h2>
          <div className="grid gap-3">
            {inProgressSessions.map((session) => (
              <Link
                key={session.id}
                href={`/quiz/${session.id}`}
                className="flex items-center justify-between rounded-xl border border-solar-500/30 bg-solar-500/5 p-4 transition-colors hover:bg-solar-500/10"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {session.onboardingProfile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Iniciado em{' '}
                    {new Date(session.createdAt).toLocaleDateString('pt-BR')}
                    {session.path1 && ` · ${session.path1 === 'AD' ? 'Anúncio' : 'Orgânico'}`}
                    {session.path2 && ` · ${session.path2 === 'MODELED' ? 'Modelado' : 'Do Zero'}`}
                  </p>
                </div>
                <span className="text-xs font-medium text-solar-400">
                  Continuar →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Profile selection */}
      {profiles.length === 0 ? (
        <div className="rounded-xl border border-solar-800/30 bg-background-secondary p-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            Você precisa criar um perfil de produto antes de iniciar o quiz.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex rounded-lg bg-solar-500 px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-solar-400"
          >
            Criar Perfil
          </Link>
        </div>
      ) : (
        <>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Selecione o perfil de produto
          </h2>
          <div className="mb-6 grid gap-3">
            {profiles.map((profile) => {
              const isSelected = selectedProfileId === profile.id
              return (
                <button
                  key={profile.id}
                  onClick={() => setSelectedProfileId(profile.id)}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-solar-500/50 bg-solar-500/10'
                      : 'border-solar-800/20 bg-background-secondary hover:border-solar-800/40'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      isSelected
                        ? 'border-solar-500 bg-solar-500'
                        : 'border-solar-800/40'
                    }`}
                  >
                    {isSelected && (
                      <span className="text-xs text-black">&#10003;</span>
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {profile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Criado em{' '}
                      {new Date(profile.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCreateSession}
              disabled={!selectedProfileId || creating}
              className="rounded-lg bg-solar-500 px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-solar-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating ? 'Iniciando...' : 'Iniciar Quiz'}
            </button>
            <Link
              href="/onboarding"
              className="text-sm text-muted-foreground transition-colors hover:text-solar-400"
            >
              + Novo perfil
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
