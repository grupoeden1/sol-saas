/**
 * Meta Ad Library API Service (Story 12.2)
 *
 * Searches active ads by keyword via the Meta Ad Library API.
 * Uses the API Gateway for caching (24h), rate limiting (200/h) and retry.
 */

import { gatewayFetch, getCacheKey, type GatewayConfig } from './api-gateway'

const AD_CACHE_TTL_MS = 86_400_000 // 24h

const config: GatewayConfig = {
  provider: 'meta',
  cacheTtlMs: AD_CACHE_TTL_MS,
  timeoutMs: 10_000,
  maxRetries: 2,
  rateLimitPerHour: 200,
}

export interface AdResult {
  adCopy: string | null
  previewUrl: string | null
  startDate: string | null
  daysActive: number | null
  platforms: string[]
  pageName: string | null
  sourceId: string | null
}

export async function searchAds(
  query: string,
  country: string = 'BR',
  limit: number = 20,
): Promise<{ data: AdResult[]; source: string }> {
  const cacheKey = getCacheKey(query, 'META_AD_LIBRARY', { country })

  const result = await gatewayFetch<AdResult[]>(
    config,
    'META_AD_LIBRARY',
    cacheKey,
    async (signal) => {
      const token = process.env.META_AD_LIBRARY_ACCESS_TOKEN
      if (!token) throw new Error('META_AD_LIBRARY_ACCESS_TOKEN not configured')

      const params = new URLSearchParams({
        search_terms: query,
        ad_reached_countries: `["${country}"]`,
        ad_active_status: 'ACTIVE',
        fields:
          'ad_creative_bodies,ad_delivery_start_time,page_name,publisher_platforms,ad_snapshot_url,id',
        limit: String(limit),
        access_token: token,
      })

      const res = await fetch(
        `https://graph.facebook.com/v18.0/ads_archive?${params}`,
        { signal },
      )
      if (!res.ok) throw new Error(`Meta API error: ${res.status}`)
      const json = await res.json()

      const ads: AdResult[] = (
        (json.data ?? []) as Array<Record<string, unknown>>
      ).map((ad) => {
        const startDate = (ad.ad_delivery_start_time as string) ?? null
        const daysActive = startDate
          ? Math.floor(
              (Date.now() - new Date(startDate).getTime()) / 86_400_000,
            )
          : null
        return {
          adCopy: Array.isArray(ad.ad_creative_bodies)
            ? ((ad.ad_creative_bodies as string[])[0] ?? null)
            : null,
          previewUrl: (ad.ad_snapshot_url as string) ?? null,
          startDate,
          daysActive,
          platforms: Array.isArray(ad.publisher_platforms)
            ? (ad.publisher_platforms as string[])
            : [],
          pageName: (ad.page_name as string) ?? null,
          sourceId: (ad.id as string) ?? null,
        }
      })

      // Sort by daysActive DESC (longest running = proxy for performance)
      ads.sort((a, b) => (b.daysActive ?? 0) - (a.daysActive ?? 0))

      return ads
    },
  )

  return { data: result.data, source: result.source }
}
