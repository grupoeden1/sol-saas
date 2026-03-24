/**
 * Instagram Graph API Search Service (Story 12.4)
 *
 * Searches posts by hashtag via Instagram Graph API.
 * Limited to 30 results, last 7 days (top_media).
 * Uses API Gateway for caching (12h), rate limiting (200/h) and retry.
 */

import { gatewayFetch, getCacheKey, type GatewayConfig } from './api-gateway'
import type { OrganicResult } from './youtube-search'

const ORGANIC_CACHE_TTL_MS = 43_200_000 // 12h

const config: GatewayConfig = {
  provider: 'instagram',
  cacheTtlMs: ORGANIC_CACHE_TTL_MS,
  timeoutMs: 10_000,
  maxRetries: 2,
  rateLimitPerHour: 200,
}

export async function searchInstagram(
  query: string,
  limit: number = 20,
): Promise<OrganicResult[]> {
  const cacheKey = getCacheKey(query, 'INSTAGRAM', { limit: String(limit) })

  try {
    const result = await gatewayFetch<OrganicResult[]>(
      config,
      'INSTAGRAM',
      cacheKey,
      async (signal) => {
        const token = process.env.INSTAGRAM_ACCESS_TOKEN
        if (!token) throw new Error('INSTAGRAM_ACCESS_TOKEN not configured')

        // 1. Search for the hashtag ID
        const hashtagQuery = query.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        const tagRes = await fetch(
          `https://graph.facebook.com/v18.0/ig_hashtag_search?q=${encodeURIComponent(hashtagQuery)}&access_token=${token}`,
          { signal },
        )
        if (!tagRes.ok) throw new Error(`Instagram hashtag search error: ${tagRes.status}`)
        const tagJson = await tagRes.json()
        const hashtagId = (tagJson.data?.[0] as Record<string, unknown> | undefined)?.id as string | undefined
        if (!hashtagId) return []

        // 2. Get top media for the hashtag
        const mediaRes = await fetch(
          `https://graph.facebook.com/v18.0/${hashtagId}/top_media?fields=id,caption,like_count,comments_count,permalink,media_url,timestamp,media_type&limit=${Math.min(limit, 30)}&access_token=${token}`,
          { signal },
        )
        if (!mediaRes.ok) throw new Error(`Instagram top_media error: ${mediaRes.status}`)
        const mediaJson = await mediaRes.json()

        const posts = (mediaJson.data ?? []) as Array<Record<string, unknown>>
        return posts.map((p): OrganicResult => ({
          platform: 'instagram',
          title: ((p.caption as string) ?? '').slice(0, 200),
          url: (p.permalink as string) ?? '',
          thumbnailUrl: (p.media_url as string) ?? null,
          metrics: {
            likes: (p.like_count as number) ?? undefined,
            comments: (p.comments_count as number) ?? undefined,
          },
          publishedAt: (p.timestamp as string) ?? null,
          authorName: null, // Not available from hashtag search
        }))
      },
    )

    return result.data
  } catch {
    return []
  }
}
