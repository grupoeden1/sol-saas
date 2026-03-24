/**
 * Competitor Profile Analyzer Service (Story 12.8)
 *
 * Detects platform from URL, resolves profile handle,
 * and uses existing search services to find top content.
 */

interface CompetitorProfile {
  topPosts: unknown
}

import { searchYouTube, type OrganicResult } from './youtube-search'
import { searchTikTok } from './tiktok-research'
import { searchInstagram } from './instagram-search'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TopPost {
  title: string
  url: string
  thumbnailUrl: string | null
  platform: string
  metrics: {
    views?: number
    likes?: number
    comments?: number
    shares?: number
  }
  publishedAt: string | null
}

type SupportedPlatform = 'youtube' | 'tiktok' | 'instagram'

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

const PLATFORM_PATTERNS: Array<{ platform: SupportedPlatform; regex: RegExp }> = [
  { platform: 'youtube', regex: /(?:youtube\.com|youtu\.be)/i },
  { platform: 'tiktok', regex: /tiktok\.com/i },
  { platform: 'instagram', regex: /instagram\.com/i },
]

export function detectPlatform(url: string): SupportedPlatform | null {
  for (const { platform, regex } of PLATFORM_PATTERNS) {
    if (regex.test(url)) return platform
  }
  return null
}

// ---------------------------------------------------------------------------
// Handle extraction
// ---------------------------------------------------------------------------

/**
 * Extracts the profile handle from a profile URL.
 * Supports:
 *   youtube.com/@handle  |  youtube.com/channel/XYZ  |  youtube.com/c/name
 *   tiktok.com/@handle
 *   instagram.com/handle
 */
export function extractHandle(url: string): string | null {
  try {
    const u = new URL(url)
    const pathname = u.pathname.replace(/\/+$/, '') // trim trailing slashes

    // YouTube: /@handle or /channel/ID or /c/name
    if (/youtube\.com|youtu\.be/.test(u.hostname)) {
      const match = pathname.match(/^\/@([^/]+)/) || pathname.match(/^\/(?:channel|c)\/([^/]+)/)
      return match ? match[1] : null
    }

    // TikTok: /@handle
    if (/tiktok\.com/.test(u.hostname)) {
      const match = pathname.match(/^\/@([^/]+)/)
      return match ? match[1] : null
    }

    // Instagram: /handle
    if (/instagram\.com/.test(u.hostname)) {
      const match = pathname.match(/^\/([^/]+)/)
      // Filter out known non-profile paths
      if (match && !['p', 'reel', 'explore', 'stories', 'accounts'].includes(match[1])) {
        return match[1]
      }
      return null
    }
  } catch {
    // Invalid URL
  }
  return null
}

// ---------------------------------------------------------------------------
// Profile analysis — search for top content using existing services
// ---------------------------------------------------------------------------

/**
 * Analyzes a competitor profile URL:
 *  1. Detects platform
 *  2. Extracts handle
 *  3. Searches for the handle's content via platform search APIs
 *  4. Returns the top posts sorted by engagement
 */
export async function analyzeProfile(profileUrl: string): Promise<{
  platform: SupportedPlatform
  handle: string
  topPosts: TopPost[]
}> {
  const platform = detectPlatform(profileUrl)
  if (!platform) {
    throw new Error('Plataforma não suportada. Use YouTube, TikTok ou Instagram.')
  }

  const handle = extractHandle(profileUrl)
  if (!handle) {
    throw new Error('Não foi possível extrair o handle do perfil. Verifique a URL.')
  }

  // Search for content by the handle using existing search services
  let results: OrganicResult[] = []

  try {
    switch (platform) {
      case 'youtube':
        results = await searchYouTube(handle, 10)
        break
      case 'tiktok': {
        const tiktokResult = await searchTikTok(handle, 10)
        results = tiktokResult.data
        break
      }
      case 'instagram':
        results = await searchInstagram(handle, 10)
        break
    }
  } catch {
    // Search failed — return empty topPosts, profile still gets created
    results = []
  }

  // Filter results to only include content from this author when possible
  const authorFiltered = results.filter((r) => {
    if (!r.authorName) return true
    return r.authorName.toLowerCase().includes(handle.toLowerCase()) ||
           handle.toLowerCase().includes(r.authorName.toLowerCase())
  })

  // Use filtered if we have enough, otherwise use all results
  const finalResults = authorFiltered.length >= 3 ? authorFiltered : results

  // Sort by engagement score
  const sorted = finalResults.sort((a, b) => {
    const scoreA = (a.metrics.views ?? 0) + (a.metrics.likes ?? 0) * 10 + (a.metrics.comments ?? 0) * 5
    const scoreB = (b.metrics.views ?? 0) + (b.metrics.likes ?? 0) * 10 + (b.metrics.comments ?? 0) * 5
    return scoreB - scoreA
  })

  const topPosts: TopPost[] = sorted.slice(0, 10).map((r) => ({
    title: r.title,
    url: r.url,
    thumbnailUrl: r.thumbnailUrl,
    platform: r.platform,
    metrics: r.metrics,
    publishedAt: r.publishedAt,
  }))

  return { platform, handle, topPosts }
}

// ---------------------------------------------------------------------------
// Parse stored topPosts and return sorted by engagement
// ---------------------------------------------------------------------------

export function getTopPosts(profile: CompetitorProfile): TopPost[] {
  if (!profile.topPosts) return []

  try {
    const posts = (typeof profile.topPosts === 'string'
      ? JSON.parse(profile.topPosts)
      : profile.topPosts) as TopPost[]

    if (!Array.isArray(posts)) return []

    return posts.sort((a, b) => {
      const scoreA = (a.metrics?.views ?? 0) + (a.metrics?.likes ?? 0) * 10 + (a.metrics?.comments ?? 0) * 5
      const scoreB = (b.metrics?.views ?? 0) + (b.metrics?.likes ?? 0) * 10 + (b.metrics?.comments ?? 0) * 5
      return scoreB - scoreA
    })
  } catch {
    return []
  }
}
