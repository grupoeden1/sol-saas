'use client'

import { useState, useEffect, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PostMetrics {
  views?: number
  likes?: number
  comments?: number
  shares?: number
}

interface TopPost {
  title: string
  url: string
  thumbnailUrl: string | null
  platform: string
  metrics: PostMetrics
  publishedAt: string | null
}

interface CompetitorProfile {
  id: string
  platform: string
  profileHandle: string
  profileUrl: string
  topPosts: TopPost[] | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  tiktok: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  instagram: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CompetitorsPage() {
  const [profiles, setProfiles] = useState<CompetitorProfile[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingRef, setSavingRef] = useState<string | null>(null)

  // Form state
  const [profileUrl, setProfileUrl] = useState('')

  // -------------------------------------------------------------------------
  // Fetch profiles
  // -------------------------------------------------------------------------
  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/references/competitors')
      if (!res.ok) throw new Error('Falha ao carregar perfis')
      const json = await res.json()
      setProfiles(json.data ?? [])
      setCount(json.count ?? 0)
    } catch {
      setError('Falha ao carregar perfis de concorrentes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  // -------------------------------------------------------------------------
  // Add profile
  // -------------------------------------------------------------------------
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileUrl.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/references/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileUrl: profileUrl.trim() }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Falha ao adicionar perfil')
      }

      setProfileUrl('')
      await fetchProfiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSubmitting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Delete profile
  // -------------------------------------------------------------------------
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/references/competitors/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao remover perfil')
      await fetchProfiles()
    } catch {
      setError('Falha ao remover perfil')
    }
  }

  // -------------------------------------------------------------------------
  // Use post as reference
  // -------------------------------------------------------------------------
  const handleUseAsReference = async (post: TopPost, profile: CompetitorProfile) => {
    const refId = `${profile.id}-${post.url}`
    setSavingRef(refId)

    try {
      const platformSource = profile.platform.toUpperCase() as
        | 'YOUTUBE'
        | 'TIKTOK'
        | 'INSTAGRAM'

      await fetch('/api/references/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizSessionId: 'competitor-analysis',
          source: platformSource,
          sourceUrl: post.url,
          mediaType: 'VIDEO',
          mediaUrl: post.thumbnailUrl ?? undefined,
          engagementMetrics: post.metrics,
          platform: profile.platform,
          advertiserName: profile.profileHandle,
          searchQuery: profile.profileHandle,
        }),
      })
    } catch {
      setError('Falha ao salvar referencia')
    } finally {
      setSavingRef(null)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <main className="relative z-10 mx-auto max-w-4xl px-4 pb-16 pt-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Analise de Concorrentes
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Adicione perfis de concorrentes para analisar seus conteudos de maior
          performance e usar como referencia.
        </p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="mb-8">
        <div className="flex flex-col gap-3 rounded-xl border border-solar-800/30 bg-background-secondary/50 p-4 backdrop-blur sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="profileUrl"
              className="mb-1.5 block text-xs font-medium text-foreground-muted"
            >
              URL do Perfil
            </label>
            <input
              id="profileUrl"
              type="url"
              placeholder="https://youtube.com/@canal ou https://tiktok.com/@perfil"
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              disabled={submitting || count >= 5}
              className="w-full rounded-lg border border-solar-800/20 bg-zinc-900 px-3 py-2 text-sm text-foreground placeholder:text-zinc-600 focus:border-solar-500/50 focus:outline-none focus:ring-1 focus:ring-solar-500/30 disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !profileUrl.trim() || count >= 5}
            className="shrink-0 rounded-lg bg-solar-500 px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-solar-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Analisando...' : 'Adicionar'}
          </button>
        </div>

        {/* Counter */}
        <p className="mt-2 text-right text-xs text-foreground-muted">
          <span className={count >= 5 ? 'text-red-400' : 'text-solar-400'}>
            {count}/5
          </span>{' '}
          perfis
        </p>
      </form>

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-300 underline hover:text-red-200"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-solar-500/30 border-t-solar-500" />
        </div>
      )}

      {/* Empty state */}
      {!loading && profiles.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-solar-800/30 py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-solar-500/10">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-solar-500"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground">
            Nenhum concorrente adicionado
          </h3>
          <p className="mt-1 max-w-sm text-sm text-foreground-muted">
            Cole a URL do perfil de um concorrente no YouTube, TikTok ou
            Instagram para analisar seus conteudos mais populares.
          </p>
        </div>
      )}

      {/* Profile list */}
      {!loading && profiles.length > 0 && (
        <div className="space-y-6">
          {profiles.map((profile) => {
            const platformColor =
              PLATFORM_COLORS[profile.platform] ?? 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
            const platformLabel =
              PLATFORM_LABELS[profile.platform] ?? profile.platform

            const posts: TopPost[] = Array.isArray(profile.topPosts)
              ? profile.topPosts
              : []

            return (
              <div
                key={profile.id}
                className="overflow-hidden rounded-xl border border-solar-800/20 bg-background-secondary/40 backdrop-blur"
              >
                {/* Profile header */}
                <div className="flex items-center justify-between border-b border-solar-800/20 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${platformColor}`}
                    >
                      {platformLabel}
                    </span>
                    <div>
                      <a
                        href={profile.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-foreground hover:text-solar-400 hover:underline"
                      >
                        @{profile.profileHandle}
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(profile.id)}
                    className="rounded-lg px-3 py-1.5 text-xs text-foreground-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Remover perfil"
                  >
                    Remover
                  </button>
                </div>

                {/* Top posts */}
                {posts.length === 0 ? (
                  <div className="px-5 py-6 text-center text-sm text-foreground-muted">
                    Nenhum conteudo encontrado para este perfil.
                  </div>
                ) : (
                  <div className="divide-y divide-solar-800/10">
                    {posts.map((post, i) => {
                      const refId = `${profile.id}-${post.url}`
                      const isSaving = savingRef === refId

                      return (
                        <div
                          key={`${post.url}-${i}`}
                          className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-zinc-900/40"
                        >
                          {/* Thumbnail */}
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                            {post.thumbnailUrl ? (
                              <img
                                src={post.thumbnailUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-lg text-zinc-600">
                                {profile.platform === 'youtube' ? '▶' : '◎'}
                              </div>
                            )}
                          </div>

                          {/* Post info */}
                          <div className="flex min-w-0 flex-1 flex-col">
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="line-clamp-2 text-sm font-medium text-foreground hover:text-solar-400"
                            >
                              {post.title || post.url}
                            </a>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-foreground-muted">
                              {post.metrics?.views !== undefined && (
                                <span>{formatNumber(post.metrics.views)} views</span>
                              )}
                              {post.metrics?.likes !== undefined && (
                                <span>{formatNumber(post.metrics.likes)} likes</span>
                              )}
                              {post.metrics?.comments !== undefined && (
                                <span>
                                  {formatNumber(post.metrics.comments)} comments
                                </span>
                              )}
                              {post.metrics?.shares !== undefined && (
                                <span>
                                  {formatNumber(post.metrics.shares)} shares
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Use as reference button */}
                          <button
                            onClick={() => handleUseAsReference(post, profile)}
                            disabled={isSaving}
                            className="shrink-0 rounded-lg border border-solar-500/30 bg-solar-500/10 px-3 py-1.5 text-xs font-medium text-solar-400 transition-colors hover:bg-solar-500/20 hover:text-solar-300 disabled:opacity-50"
                          >
                            {isSaving ? 'Salvando...' : 'Usar como Referencia'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
