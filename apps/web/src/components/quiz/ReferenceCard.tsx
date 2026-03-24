'use client'

interface ReferenceCardProps {
  title: string
  url: string
  thumbnailUrl: string | null
  platform: string
  authorName?: string | null
  metrics?: {
    views?: number
    likes?: number
    comments?: number
    shares?: number
  }
  format?: string | null
  selected?: boolean
  onClick?: () => void
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'bg-red-500/20 text-red-400',
  tiktok: 'bg-cyan-500/20 text-cyan-400',
  instagram: 'bg-pink-500/20 text-pink-400',
  facebook: 'bg-blue-500/20 text-blue-400',
  meta: 'bg-blue-500/20 text-blue-400',
}

export function ReferenceCard({
  title,
  url,
  thumbnailUrl,
  platform,
  authorName,
  metrics,
  format,
  selected,
  onClick,
}: ReferenceCardProps) {
  const platformKey = platform.toLowerCase()
  const platformColor = PLATFORM_COLORS[platformKey] ?? 'bg-zinc-500/20 text-zinc-400'

  return (
    <button
      onClick={onClick}
      className={`group flex w-full gap-3 rounded-lg border p-3 text-left transition-all ${
        selected
          ? 'border-solar-500/60 bg-solar-500/10 ring-1 ring-solar-500/30'
          : 'border-solar-800/20 bg-background hover:border-solar-800/40 hover:bg-background-secondary'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-800">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-zinc-600">
            {platformKey === 'youtube' ? '▶' : '📷'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <p className="line-clamp-2 text-sm font-medium text-foreground">
            {title || url}
          </p>
          {authorName && (
            <p className="mt-0.5 text-xs text-muted-foreground">{authorName}</p>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {/* Platform badge */}
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${platformColor}`}>
            {platform}
          </span>

          {/* Format badge */}
          {format && (
            <span className="rounded bg-solar-500/15 px-1.5 py-0.5 text-[10px] font-medium text-solar-400">
              {format}
            </span>
          )}

          {/* Metrics */}
          {metrics?.views !== undefined && (
            <span className="text-[10px] text-muted-foreground">
              {formatNumber(metrics.views)} views
            </span>
          )}
          {metrics?.likes !== undefined && (
            <span className="text-[10px] text-muted-foreground">
              {formatNumber(metrics.likes)} likes
            </span>
          )}
        </div>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="flex shrink-0 items-center">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-solar-500 text-black">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      )}
    </button>
  )
}
