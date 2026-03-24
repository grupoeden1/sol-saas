import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { searchYouTube } from '@/lib/services/youtube-search'
import { searchTikTok } from '@/lib/services/tiktok-research'
import { searchInstagram } from '@/lib/services/instagram-search'
import type { OrganicResult } from '@/lib/services/youtube-search'

const searchSchema = z.object({
  q: z.string().min(2),
  platforms: z.string().default('youtube,tiktok,instagram'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = searchSchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { q, platforms: platformsStr, limit } = parsed.data
  const enabledPlatforms = new Set(platformsStr.split(',').map((p) => p.trim()))

  // Call enabled services in PARALLEL — each failing independently
  const promises: Array<Promise<PromiseSettledResult<OrganicResult[]>>> = []
  const platformStatus: Record<string, boolean> = {
    youtube: false,
    tiktok: false,
    instagram: false,
  }

  if (enabledPlatforms.has('youtube')) {
    promises.push(
      Promise.allSettled([searchYouTube(q, limit)]).then((r) => r[0]),
    )
  }
  if (enabledPlatforms.has('tiktok')) {
    promises.push(
      Promise.allSettled([
        searchTikTok(q, limit).then((r) => r.data),
      ]).then((r) => r[0]),
    )
  }
  if (enabledPlatforms.has('instagram')) {
    promises.push(
      Promise.allSettled([searchInstagram(q, limit)]).then((r) => r[0]),
    )
  }

  const settled = await Promise.all(promises)

  // Collect results
  const allResults: OrganicResult[] = []
  const platformKeys = [...enabledPlatforms]

  settled.forEach((result, i) => {
    const platformKey = platformKeys[i]
    if (result.status === 'fulfilled' && result.value.length > 0) {
      if (platformKey) platformStatus[platformKey] = true
      allResults.push(...result.value)
    }
  })

  // Sort by engagement: views first, then likes+comments
  allResults.sort((a, b) => {
    const scoreA = (a.metrics.views ?? 0) + (a.metrics.likes ?? 0) * 10 + (a.metrics.comments ?? 0) * 5
    const scoreB = (b.metrics.views ?? 0) + (b.metrics.likes ?? 0) * 10 + (b.metrics.comments ?? 0) * 5
    return scoreB - scoreA
  })

  return NextResponse.json({
    data: allResults.slice(0, limit),
    platforms: platformStatus,
  })
}
