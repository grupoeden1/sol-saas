/**
 * Generic API Gateway for all external API integrations (Epic 12).
 *
 * Provides a unified fetch pipeline with:
 *  - Database-backed caching (search_cache table)
 *  - In-memory rate limiting per provider
 *  - Automatic retries with exponential backoff
 *  - Timeout via AbortSignal
 *  - Graceful fallback chain: API -> fresh cache -> stale cache -> throw
 */

import crypto from 'crypto'

import { prisma } from '@sol/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GatewayConfig {
  provider: string
  cacheTtlMs: number
  timeoutMs: number
  maxRetries: number
  rateLimitPerHour: number
}

export interface GatewayResult<T> {
  data: T
  source: 'api' | 'cache' | 'stale_cache'
}

// ---------------------------------------------------------------------------
// In-memory rate limiter
// ---------------------------------------------------------------------------

const rateLimiter = new Map<string, { count: number; resetAt: number }>()

/**
 * Check whether the given provider has exceeded its hourly rate limit.
 * Returns `true` when the call is allowed, `false` otherwise.
 */
function checkRateLimit(provider: string, maxPerHour: number): boolean {
  const now = Date.now()
  const entry = rateLimiter.get(provider)

  if (!entry || now > entry.resetAt) {
    rateLimiter.set(provider, { count: 1, resetAt: now + 3_600_000 })
    return true
  }

  if (entry.count >= maxPerHour) {
    return false
  }

  entry.count++
  return true
}

// ---------------------------------------------------------------------------
// Cache key generation
// ---------------------------------------------------------------------------

/**
 * Generates a deterministic SHA-256 hash suitable for use as a `queryHash`
 * in the `search_cache` table.
 */
export function getCacheKey(
  query: string,
  source: string,
  filters?: Record<string, string>,
): string {
  const payload = JSON.stringify({ query, source, filters: filters ?? {} })
  return crypto.createHash('sha256').update(payload).digest('hex')
}

// ---------------------------------------------------------------------------
// Main gateway fetch
// ---------------------------------------------------------------------------

/**
 * Unified fetch pipeline that wraps any external API call with caching,
 * rate-limiting, retries and timeout.
 *
 * Fallback chain:
 *  1. Fresh cache (expiresAt > now)     -> return immediately
 *  2. Live API call (with retries)      -> save to cache, return
 *  3. Stale cache (expiresAt <= now)     -> return as last resort
 *  4. Throw if nothing is available
 */
export async function gatewayFetch<T>(
  config: GatewayConfig,
  source: string,
  cacheKey: string,
  fetchFn: (signal: AbortSignal) => Promise<T>,
): Promise<GatewayResult<T>> {
  const now = new Date()

  // ----- 1. Check fresh cache --------------------------------------------
  const cached = await prisma.searchCache.findUnique({
    where: { queryHash: cacheKey },
  })

  if (cached && cached.expiresAt > now) {
    return { data: cached.results as T, source: 'cache' }
  }

  // ----- 2. Check rate limit ---------------------------------------------
  const allowed = checkRateLimit(config.provider, config.rateLimitPerHour)

  if (!allowed) {
    // Rate-limited: fall back to stale cache if available
    if (cached) {
      return { data: cached.results as T, source: 'stale_cache' }
    }
    throw new Error(
      `Rate limit exceeded for provider "${config.provider}" and no cached data is available.`,
    )
  }

  // ----- 3. Call the external API with retries ----------------------------
  let lastError: unknown = null

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

      try {
        const data = await fetchFn(controller.signal)
        clearTimeout(timeout)

        // Persist to cache
        const expiresAt = new Date(Date.now() + config.cacheTtlMs)

        await prisma.searchCache.upsert({
          where: { queryHash: cacheKey },
          update: {
            source: source as 'META_AD_LIBRARY' | 'TIKTOK' | 'YOUTUBE' | 'INSTAGRAM' | 'MANUAL_UPLOAD' | 'ENRICHMENT',
            results: JSON.parse(JSON.stringify(data)),
            expiresAt,
          },
          create: {
            queryHash: cacheKey,
            source: source as 'META_AD_LIBRARY' | 'TIKTOK' | 'YOUTUBE' | 'INSTAGRAM' | 'MANUAL_UPLOAD' | 'ENRICHMENT',
            results: JSON.parse(JSON.stringify(data)),
            expiresAt,
          },
        })

        return { data, source: 'api' }
      } catch (err) {
        clearTimeout(timeout)
        throw err
      }
    } catch (err) {
      lastError = err

      // If we still have retries left, wait with exponential backoff
      if (attempt < config.maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  // ----- 4. All retries exhausted: fall back to stale cache ---------------
  if (cached) {
    return { data: cached.results as T, source: 'stale_cache' }
  }

  // Nothing left to do
  throw new Error(
    `Gateway fetch failed for provider "${config.provider}" after ${config.maxRetries} retries: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  )
}

// ---------------------------------------------------------------------------
// Cache maintenance
// ---------------------------------------------------------------------------

/**
 * Deletes all `search_cache` records whose `expiresAt` is in the past.
 * Intended to be called periodically (e.g. via a cron job).
 */
export async function cleanExpiredCache(): Promise<number> {
  const { count } = await prisma.searchCache.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return count
}
