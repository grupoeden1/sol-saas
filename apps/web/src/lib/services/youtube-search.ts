/**
 * YouTube Data API v3 Search Service (Story 12.4)
 *
 * Searches viral organic videos by keyword. Enriches with statistics.
 * Uses API Gateway for caching (12h), rate limiting (100/h) and retry.
 */

import { gatewayFetch, getCacheKey, type GatewayConfig } from './api-gateway'

const ORGANIC_CACHE_TTL_MS = 43_200_000 // 12h

const config: GatewayConfig = {
  provider: 'youtube',
  cacheTtlMs: ORGANIC_CACHE_TTL_MS,
  timeoutMs: 10_000,
  maxRetries: 2,
  rateLimitPerHour: 100,
}

export interface OrganicResult {
  platform: 'youtube' | 'tiktok' | 'instagram'
  title: string
  url: string
  thumbnailUrl: string | null
  metrics: {
    views?: number
    likes?: number
    comments?: number
    shares?: number
  }
  duration?: number
  publishedAt: string | null
  authorName: string | null
}

interface YouTubeSearchItem {
  id?: { videoId?: string }
  snippet?: {
    title?: string
    channelTitle?: string
    publishedAt?: string
    thumbnails?: { high?: { url?: string } }
  }
}

interface YouTubeVideoStats {
  id?: string
  statistics?: {
    viewCount?: string
    likeCount?: string
    commentCount?: string
  }
  contentDetails?: {
    duration?: string
  }
}

function parseIsoDuration(iso: string): number | undefined {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso)
  if (!match) return undefined
  const h = parseInt(match[1] ?? '0', 10)
  const m = parseInt(match[2] ?? '0', 10)
  const s = parseInt(match[3] ?? '0', 10)
  return h * 3600 + m * 60 + s
}

export async function searchYouTube(
  query: string,
  limit: number = 20,
): Promise<OrganicResult[]> {
  const cacheKey = getCacheKey(query, 'YOUTUBE', { limit: String(limit) })

  const result = await gatewayFetch<OrganicResult[]>(
    config,
    'YOUTUBE',
    cacheKey,
    async (signal) => {
      const apiKey = process.env.YOUTUBE_API_KEY
      if (!apiKey) throw new Error('YOUTUBE_API_KEY not configured')

      // 1. Search videos
      const searchParams = new URLSearchParams({
        q: query,
        type: 'video',
        videoDuration: 'short',
        order: 'viewCount',
        regionCode: 'BR',
        relevanceLanguage: 'pt',
        maxResults: String(Math.min(limit, 50)),
        part: 'snippet',
        key: apiKey,
      })

      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${searchParams}`,
        { signal },
      )
      if (!searchRes.ok) throw new Error(`YouTube Search API error: ${searchRes.status}`)
      const searchJson = await searchRes.json()
      const items = (searchJson.items ?? []) as YouTubeSearchItem[]

      const videoIds = items
        .map((i) => i.id?.videoId)
        .filter((id): id is string => Boolean(id))

      if (videoIds.length === 0) return []

      // 2. Enrich with statistics
      const statsParams = new URLSearchParams({
        id: videoIds.join(','),
        part: 'statistics,contentDetails',
        key: apiKey,
      })

      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?${statsParams}`,
        { signal },
      )
      const statsJson = statsRes.ok ? await statsRes.json() : { items: [] }
      const statsMap = new Map<string, YouTubeVideoStats>()
      for (const s of (statsJson.items ?? []) as YouTubeVideoStats[]) {
        if (s.id) statsMap.set(s.id, s)
      }

      return items.map((item): OrganicResult => {
        const videoId = item.id?.videoId ?? ''
        const stats = statsMap.get(videoId)
        return {
          platform: 'youtube',
          title: item.snippet?.title ?? '',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnailUrl: item.snippet?.thumbnails?.high?.url ?? null,
          metrics: {
            views: stats?.statistics?.viewCount
              ? parseInt(stats.statistics.viewCount, 10)
              : undefined,
            likes: stats?.statistics?.likeCount
              ? parseInt(stats.statistics.likeCount, 10)
              : undefined,
            comments: stats?.statistics?.commentCount
              ? parseInt(stats.statistics.commentCount, 10)
              : undefined,
          },
          duration: stats?.contentDetails?.duration
            ? parseIsoDuration(stats.contentDetails.duration)
            : undefined,
          publishedAt: item.snippet?.publishedAt ?? null,
          authorName: item.snippet?.channelTitle ?? null,
        }
      })
    },
  )

  return result.data
}
