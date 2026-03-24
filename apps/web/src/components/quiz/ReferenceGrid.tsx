'use client'

import { ReferenceCard } from './ReferenceCard'

export interface ReferenceItem {
  id?: string
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
  mediaType?: 'VIDEO' | 'IMAGE'
  adCopy?: string | null
  sourceId?: string | null
  daysActive?: number | null
}

interface ReferenceGridProps {
  items: ReferenceItem[]
  selectedUrl: string | null
  onSelect: (item: ReferenceItem) => void
  loading?: boolean
  emptyMessage?: string
}

function SkeletonCard() {
  return (
    <div className="flex gap-3 rounded-lg border border-solar-800/20 bg-background p-3 animate-pulse">
      <div className="h-20 w-20 shrink-0 rounded-md bg-zinc-800" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-4 w-3/4 rounded bg-zinc-800" />
        <div className="h-3 w-1/2 rounded bg-zinc-800" />
        <div className="flex gap-2">
          <div className="h-4 w-16 rounded bg-zinc-800" />
          <div className="h-4 w-12 rounded bg-zinc-800" />
        </div>
      </div>
    </div>
  )
}

export function ReferenceGrid({
  items,
  selectedUrl,
  onSelect,
  loading,
  emptyMessage = 'Nenhuma referência encontrada. Tente outro termo ou faça upload manual.',
}: ReferenceGridProps) {
  if (loading) {
    return (
      <div className="grid gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-solar-800/30 py-12 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      {items.map((item, idx) => (
        <ReferenceCard
          key={item.url + idx}
          title={item.title}
          url={item.url}
          thumbnailUrl={item.thumbnailUrl}
          platform={item.platform}
          authorName={item.authorName}
          metrics={item.metrics}
          format={item.format}
          selected={selectedUrl === item.url}
          onClick={() => onSelect(item)}
        />
      ))}
    </div>
  )
}
