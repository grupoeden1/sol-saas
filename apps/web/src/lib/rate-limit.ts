// In-memory rate limiter — per-IP sliding window
// Suitable for single-instance deployments. For multi-instance, use Redis/Upstash.

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 300_000)

interface RateLimitConfig {
  /** Max requests per window */
  limit: number
  /** Window size in seconds */
  windowSeconds: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: config.limit - 1, resetAt: now + windowMs }
  }

  entry.count++

  if (entry.count > config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: config.limit - entry.count, resetAt: entry.resetAt }
}

/** Extract IP from request headers (works with Next.js + proxies) */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? '127.0.0.1'
}

/** Rate limit response helper */
export function rateLimitResponse(resetAt: number): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
  return Response.json(
    { error: 'Muitas requisições. Tente novamente em alguns segundos.' },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.max(1, retryAfter)) },
    },
  )
}
