/**
 * TikTok Research API Service (Story 12.4)
 *
 * Searches viral TikTok videos by keyword.
 * Feature flag: checks api_configurations for enabled status.
 * If TikTok API not approved, returns empty results silently.
 */

import { prisma } from '@sol/db'

import { gatewayFetch, getCacheKey, type GatewayConfig } from './api-gateway'
import type { OrganicResult } from './youtube-search'

const ORGANIC_CACHE_TTL_MS = 43_200_000 // 12h

const config: GatewayConfig = {
  provider: 'tiktok',
  cacheTtlMs: ORGANIC_CACHE_TTL_MS,
  timeoutMs: 10_000,
  maxRetries: 2,
  rateLimitPerHour: 1000,
}

interface TikTokSearchResult {
  unavailable?: boolean
  data: OrganicResult[]
}

export async function searchTikTok(
  query: string,
  limit: number = 20,
): Promise<TikTokSearchResult> {
  // Feature flag — check if TikTok is enabled in api_configurations
  const apiConfig = await prisma.apiConfiguration.findUnique({
    where: { provider: 'tiktok' },
  })

  if (!apiConfig?.enabled) {
    return { data: [], unavailable: true }
  }

  const clientKey = process.env.TIKTOK_RESEARCH_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_RESEARCH_CLIENT_SECRET
  if (!clientKey || !clientSecret) {
    return { data: [], unavailable: true }
  }

  const cacheKey = getCacheKey(query, 'TIKTOK', { limit: String(limit) })

  try {
    const result = await gatewayFetch<OrganicResult[]>(
      config,
      'TIKTOK',
      cacheKey,
      async (signal) => {
        // TikTok Research API v2 — query/video endpoint
        const res = await fetch(
          'https://open.tiktokapis.com/v2/research/video/query/',
          {
            method: 'POST',
            signal,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${clientKey}`,
            },
            body: JSON.stringify({
              query: { and: [{ operation: 'IN', field_name: 'keyword', field_values: [query] }] },
              max_count: Math.min(limit, 100),
              start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
              end_date: new Date().toISOString().slice(0, 10),
            }),
          },
        )
        if (!res.ok) throw new Error(`TikTok API error: ${res.status}`)
        const json = await res.json()

        const videos = (json.data?.videos ?? []) as Array<Record<string, unknown>>
        return videos.map((v): OrganicResult => ({
          platform: 'tiktok',
          title: (v.video_description as string) ?? '',
          url: (v.share_url as string) ?? `https://www.tiktok.com/@unknown/video/${v.id}`,
          thumbnailUrl: (v.cover_image_url as string) ?? null,
          metrics: {
            views: (v.view_count as number) ?? undefined,
            likes: (v.like_count as number) ?? undefined,
            comments: (v.comment_count as number) ?? undefined,
            shares: (v.share_count as number) ?? undefined,
          },
          duration: (v.duration as number) ?? undefined,
          publishedAt: (v.create_time as string) ?? null,
          authorName: (v.username as string) ?? null,
        }))
      },
    )

    return { data: result.data }
  } catch {
    return { data: [], unavailable: true }
  }
}
