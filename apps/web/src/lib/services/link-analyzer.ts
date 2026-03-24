/**
 * Link Analyzer Service (Story 12.3)
 *
 * Detects the platform of a social media URL, extracts metadata via oEmbed
 * or official API, and optionally classifies the creative format.
 */

import type { OrganicResult } from './youtube-search'

type Platform = 'tiktok' | 'instagram' | 'youtube' | 'facebook'

const PLATFORM_PATTERNS: Array<{ platform: Platform; regex: RegExp }> = [
  { platform: 'tiktok', regex: /tiktok\.com/ },
  { platform: 'instagram', regex: /instagram\.com\/(p|reel|reels)\// },
  { platform: 'youtube', regex: /(?:youtube\.com\/(?:watch|shorts)|youtu\.be)/ },
  { platform: 'facebook', regex: /facebook\.com/ },
]

export interface LinkAnalysisResult {
  platform: Platform | null
  title: string | null
  authorName: string | null
  thumbnailUrl: string | null
  url: string
  metrics: {
    views?: number
    likes?: number
    comments?: number
    shares?: number
  }
  duration?: number
  publishedAt: string | null
}

export function detectPlatform(url: string): Platform | null {
  for (const { platform, regex } of PLATFORM_PATTERNS) {
    if (regex.test(url)) return platform
  }
  return null
}

// oEmbed endpoints (public, no auth required)
const OEMBED_URLS: Record<Platform, string> = {
  youtube: 'https://www.youtube.com/oembed',
  instagram: 'https://api.instagram.com/oembed',
  tiktok: 'https://www.tiktok.com/oembed',
  facebook: 'https://www.facebook.com/plugins/post/oembed.json',
}

interface OEmbedResponse {
  title?: string
  author_name?: string
  thumbnail_url?: string
  [key: string]: unknown
}

async function fetchOEmbed(platform: Platform, url: string): Promise<OEmbedResponse | null> {
  try {
    const endpoint = OEMBED_URLS[platform]
    const res = await fetch(`${endpoint}?url=${encodeURIComponent(url)}&format=json`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    return (await res.json()) as OEmbedResponse
  } catch {
    return null
  }
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const match = p.exec(url)
    if (match?.[1]) return match[1]
  }
  return null
}

async function enrichYouTube(url: string): Promise<Partial<LinkAnalysisResult>> {
  const videoId = extractYouTubeVideoId(url)
  if (!videoId) return {}

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return {}

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=statistics,snippet,contentDetails&key=${apiKey}`,
      { signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) return {}
    const json = await res.json()
    const item = json.items?.[0] as Record<string, unknown> | undefined
    if (!item) return {}

    const snippet = item.snippet as Record<string, unknown> | undefined
    const statistics = item.statistics as Record<string, string> | undefined
    const thumbnails = snippet?.thumbnails as Record<string, Record<string, string>> | undefined

    return {
      title: (snippet?.title as string) ?? null,
      authorName: (snippet?.channelTitle as string) ?? null,
      thumbnailUrl: thumbnails?.high?.url ?? null,
      publishedAt: (snippet?.publishedAt as string) ?? null,
      metrics: {
        views: statistics?.viewCount ? parseInt(statistics.viewCount, 10) : undefined,
        likes: statistics?.likeCount ? parseInt(statistics.likeCount, 10) : undefined,
        comments: statistics?.commentCount ? parseInt(statistics.commentCount, 10) : undefined,
      },
    }
  } catch {
    return {}
  }
}

export async function analyzeLink(url: string): Promise<LinkAnalysisResult> {
  const platform = detectPlatform(url)

  const base: LinkAnalysisResult = {
    platform,
    title: null,
    authorName: null,
    thumbnailUrl: null,
    url,
    metrics: {},
    publishedAt: null,
  }

  if (!platform) return base

  // Fetch oEmbed
  const oembed = await fetchOEmbed(platform, url)
  if (oembed) {
    base.title = oembed.title ?? null
    base.authorName = oembed.author_name ?? null
    base.thumbnailUrl = oembed.thumbnail_url ?? null
  }

  // Enrich YouTube with Data API
  if (platform === 'youtube') {
    const enriched = await enrichYouTube(url)
    if (enriched.title) base.title = enriched.title
    if (enriched.authorName) base.authorName = enriched.authorName
    if (enriched.thumbnailUrl) base.thumbnailUrl = enriched.thumbnailUrl
    if (enriched.publishedAt) base.publishedAt = enriched.publishedAt
    if (enriched.metrics) base.metrics = { ...base.metrics, ...enriched.metrics }
  }

  return base
}

export function linkAnalysisToOrganicResult(result: LinkAnalysisResult): OrganicResult | null {
  if (!result.platform || result.platform === 'facebook') return null
  return {
    platform: result.platform as 'youtube' | 'tiktok' | 'instagram',
    title: result.title ?? '',
    url: result.url,
    thumbnailUrl: result.thumbnailUrl,
    metrics: result.metrics,
    duration: result.duration,
    publishedAt: result.publishedAt,
    authorName: result.authorName,
  }
}
