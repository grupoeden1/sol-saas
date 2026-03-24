'use client'

import { useState, useCallback } from 'react'
import { ReferenceGrid, type ReferenceItem } from './ReferenceGrid'

type ReferenceMode = 'search' | 'link' | 'idle'

interface ReferencePickerProps {
  sessionId: string
  path1: 'AD' | 'ORGANIC'
  niche: string
  onSelect: (referenceSource: 'API_SEARCH' | 'LINK_ANALYSIS' | 'NONE') => void
}

export function ReferencePicker({
  sessionId,
  path1,
  niche,
  onSelect,
}: ReferencePickerProps) {
  const [mode, setMode] = useState<ReferenceMode>('idle')
  const [searchQuery, setSearchQuery] = useState(niche)
  const [linkUrl, setLinkUrl] = useState('')
  const [results, setResults] = useState<ReferenceItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ReferenceItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [linkAnalyzing, setLinkAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'search' | 'preview'>('search')

  // Search for references (ads or organic)
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    setError(null)
    setMode('search')
    setSelectedItem(null)

    try {
      const endpoint = path1 === 'AD'
        ? `/api/references/ads?q=${encodeURIComponent(searchQuery)}`
        : `/api/references/organic?q=${encodeURIComponent(searchQuery)}`

      const res = await fetch(endpoint)
      if (!res.ok) throw new Error('Erro na busca')
      const data = await res.json()

      // Normalize results from different endpoints
      const items: ReferenceItem[] = (data.results ?? data.data ?? []).map(
        (r: Record<string, unknown>) => ({
          title: (r.title as string) ?? (r.adCopy as string) ?? '',
          url: (r.url as string) ?? (r.sourceUrl as string) ?? '',
          thumbnailUrl: (r.thumbnailUrl as string) ?? (r.mediaUrl as string) ?? null,
          platform: (r.platform as string) ?? path1 === 'AD' ? 'meta' : 'youtube',
          authorName: (r.authorName as string) ?? (r.advertiserName as string) ?? null,
          metrics: (r.metrics ?? r.engagementMetrics ?? {}) as ReferenceItem['metrics'],
          adCopy: (r.adCopy as string) ?? null,
          sourceId: (r.sourceId as string) ?? null,
          daysActive: (r.daysActive as number) ?? null,
          mediaType: (r.mediaType as 'VIDEO' | 'IMAGE') ?? 'VIDEO',
        })
      )

      setResults(items)
    } catch {
      setError('Erro ao buscar referências. Tente novamente.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, path1])

  // Analyze a pasted link
  const handleAnalyzeLink = useCallback(async () => {
    if (!linkUrl.trim()) return
    setLinkAnalyzing(true)
    setError(null)
    setMode('link')

    try {
      const res = await fetch('/api/references/analyze-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl, quizSessionId: sessionId }),
      })
      if (!res.ok) throw new Error('Erro ao analisar link')
      const data = await res.json()

      const item: ReferenceItem = {
        title: data.analysis?.title ?? data.reference?.adCopy ?? linkUrl,
        url: linkUrl,
        thumbnailUrl: data.analysis?.thumbnailUrl ?? null,
        platform: data.analysis?.platform ?? 'unknown',
        authorName: data.analysis?.authorName ?? null,
        metrics: data.analysis?.metrics ?? {},
      }

      setSelectedItem(item)
      setResults([item])
      setActiveTab('preview')
    } catch {
      setError('Erro ao analisar link. Verifique a URL e tente novamente.')
    } finally {
      setLinkAnalyzing(false)
    }
  }, [linkUrl, sessionId])

  // Select a reference and save it
  const handleSelectReference = useCallback(async (item: ReferenceItem) => {
    setSelectedItem(item)
    setActiveTab('preview')
  }, [])

  // Confirm selection
  const handleConfirm = useCallback(async () => {
    if (!selectedItem) return
    setSaving(true)
    setError(null)

    try {
      const referenceSource = mode === 'link' ? 'LINK_ANALYSIS' : 'API_SEARCH'
      const source = path1 === 'AD' ? 'META_AD_LIBRARY'
        : selectedItem.platform?.toUpperCase() === 'TIKTOK' ? 'TIKTOK'
        : selectedItem.platform?.toUpperCase() === 'INSTAGRAM' ? 'INSTAGRAM'
        : 'YOUTUBE'

      const res = await fetch('/api/references/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizSessionId: sessionId,
          source,
          sourceUrl: selectedItem.url,
          sourceId: selectedItem.sourceId ?? undefined,
          mediaType: selectedItem.mediaType ?? 'VIDEO',
          mediaUrl: selectedItem.thumbnailUrl ?? undefined,
          adCopy: selectedItem.adCopy ?? selectedItem.title,
          daysActive: selectedItem.daysActive ?? undefined,
          engagementMetrics: selectedItem.metrics
            ? Object.fromEntries(
                Object.entries(selectedItem.metrics).filter(([, v]) => v !== undefined)
              )
            : undefined,
          platform: selectedItem.platform,
          advertiserName: selectedItem.authorName ?? undefined,
          searchQuery: searchQuery || niche,
        }),
      })

      if (!res.ok) throw new Error('Erro ao salvar referência')

      onSelect(referenceSource as 'API_SEARCH' | 'LINK_ANALYSIS')
    } catch {
      setError('Erro ao salvar referência. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }, [selectedItem, mode, path1, sessionId, searchQuery, niche, onSelect])

  // Skip reference selection
  const handleSkip = useCallback(() => {
    onSelect('NONE')
  }, [onSelect])

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">
          {path1 === 'AD' ? 'Escolha uma referência de anúncio' : 'Escolha uma referência orgânica'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecione uma referência para guiar seu roteiro, cole um link, ou pule para criar do zero.
        </p>
      </div>

      {/* Mobile tabs */}
      <div className="mb-4 flex gap-2 md:hidden">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'search'
              ? 'bg-solar-500/20 text-solar-400'
              : 'bg-background-secondary text-muted-foreground'
          }`}
        >
          Buscar
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'preview'
              ? 'bg-solar-500/20 text-solar-400'
              : 'bg-background-secondary text-muted-foreground'
          }`}
        >
          Preview
        </button>
      </div>

      {/* Split view */}
      <div className="flex flex-1 gap-4">
        {/* Left panel: Search / Link */}
        <div className={`flex-[3] flex-col gap-4 ${activeTab === 'search' ? 'flex' : 'hidden md:flex'}`}>
          {/* Search bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={path1 === 'AD' ? 'Buscar anúncios...' : 'Buscar vídeos virais...'}
              className="flex-1 rounded-lg border border-solar-800/30 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-solar-500/50 focus:outline-none focus:ring-1 focus:ring-solar-500/30"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="rounded-lg bg-solar-500/20 px-4 py-2.5 text-sm font-medium text-solar-400 transition-colors hover:bg-solar-500/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {/* Link paste section */}
          <div className="flex gap-2">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeLink()}
              placeholder="Cole o link de um post (YouTube, TikTok, Instagram...)"
              className="flex-1 rounded-lg border border-solar-800/30 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-solar-500/50 focus:outline-none focus:ring-1 focus:ring-solar-500/30"
            />
            <button
              onClick={handleAnalyzeLink}
              disabled={linkAnalyzing || !linkUrl.trim()}
              className="rounded-lg border border-solar-800/30 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-background-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              {linkAnalyzing ? 'Analisando...' : 'Analisar'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          {/* Results grid */}
          <div className="flex-1 overflow-y-auto">
            <ReferenceGrid
              items={results}
              selectedUrl={selectedItem?.url ?? null}
              onSelect={handleSelectReference}
              loading={loading}
              emptyMessage={
                mode === 'idle'
                  ? 'Busque por referências ou cole um link para começar.'
                  : 'Nenhuma referência encontrada. Tente outro termo ou cole um link.'
              }
            />
          </div>
        </div>

        {/* Right panel: Preview */}
        <div className={`flex-[2] flex-col ${activeTab === 'preview' ? 'flex' : 'hidden md:flex'}`}>
          <div className="flex-1 rounded-xl border border-solar-800/30 bg-background-secondary p-4">
            {selectedItem ? (
              <div className="flex flex-col gap-4">
                {/* Thumbnail */}
                {selectedItem.thumbnailUrl && (
                  <div className="overflow-hidden rounded-lg">
                    <img
                      src={selectedItem.thumbnailUrl}
                      alt=""
                      className="w-full object-cover"
                    />
                  </div>
                )}

                {/* Info */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {selectedItem.title || selectedItem.url}
                  </h3>
                  {selectedItem.authorName && (
                    <p className="mt-1 text-xs text-muted-foreground">{selectedItem.authorName}</p>
                  )}
                  <p className="mt-1 text-xs text-solar-400">{selectedItem.platform}</p>
                </div>

                {/* Metrics */}
                {selectedItem.metrics && Object.keys(selectedItem.metrics).length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedItem.metrics.views !== undefined && (
                      <MetricBadge label="Views" value={selectedItem.metrics.views} />
                    )}
                    {selectedItem.metrics.likes !== undefined && (
                      <MetricBadge label="Likes" value={selectedItem.metrics.likes} />
                    )}
                    {selectedItem.metrics.comments !== undefined && (
                      <MetricBadge label="Comments" value={selectedItem.metrics.comments} />
                    )}
                    {selectedItem.metrics.shares !== undefined && (
                      <MetricBadge label="Shares" value={selectedItem.metrics.shares} />
                    )}
                  </div>
                )}

                {/* URL */}
                <a
                  href={selectedItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-solar-400 hover:underline truncate"
                >
                  {selectedItem.url}
                </a>

                {/* Confirm button */}
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  className="mt-2 w-full rounded-lg bg-solar-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-solar-400 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Usar esta referência'}
                </button>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-3 text-3xl text-zinc-600">🔍</div>
                <p className="text-sm text-muted-foreground">
                  Selecione uma referência para ver o preview
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skip button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-solar-400 transition-colors"
        >
          Pular e criar do zero →
        </button>
      </div>
    </div>
  )
}

function MetricBadge({ label, value }: { label: string; value: number }) {
  const formatted = value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
      ? `${(value / 1_000).toFixed(1)}K`
      : String(value)

  return (
    <div className="rounded-lg bg-background px-3 py-2 text-center">
      <p className="text-xs font-medium text-foreground">{formatted}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}
