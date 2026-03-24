import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'

type HealthResult = {
  status: 'ok' | 'error'
  latencyMs: number
  message: string
}

async function checkMeta(): Promise<HealthResult> {
  const start = Date.now()
  try {
    const token = process.env.META_AD_LIBRARY_TOKEN
    if (!token) {
      return { status: 'error', latencyMs: Date.now() - start, message: 'META_AD_LIBRARY_TOKEN nao configurado' }
    }

    const url = `https://graph.facebook.com/v21.0/ads_archive?access_token=${token}&search_terms=test&ad_reached_countries=BR&limit=1`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    const latencyMs = Date.now() - start

    if (!res.ok) {
      const body = await res.text()
      return { status: 'error', latencyMs, message: `HTTP ${res.status}: ${body.slice(0, 200)}` }
    }

    return { status: 'ok', latencyMs, message: 'Meta Ad Library respondendo normalmente' }
  } catch (err) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : 'Erro desconhecido',
    }
  }
}

async function checkYoutube(): Promise<HealthResult> {
  const start = Date.now()
  try {
    const key = process.env.YOUTUBE_API_KEY
    if (!key) {
      return { status: 'error', latencyMs: Date.now() - start, message: 'YOUTUBE_API_KEY nao configurado' }
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&type=video&key=${key}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    const latencyMs = Date.now() - start

    if (!res.ok) {
      const body = await res.text()
      return { status: 'error', latencyMs, message: `HTTP ${res.status}: ${body.slice(0, 200)}` }
    }

    return { status: 'ok', latencyMs, message: 'YouTube Data API respondendo normalmente' }
  } catch (err) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : 'Erro desconhecido',
    }
  }
}

async function checkTiktok(): Promise<HealthResult> {
  const start = Date.now()
  const key = process.env.TIKTOK_API_KEY
  const latencyMs = Date.now() - start

  if (!key) {
    return { status: 'error', latencyMs, message: 'TIKTOK_API_KEY nao configurado' }
  }

  return { status: 'ok', latencyMs, message: 'TIKTOK_API_KEY presente no ambiente' }
}

async function checkInstagram(): Promise<HealthResult> {
  const start = Date.now()
  const key = process.env.INSTAGRAM_API_KEY || process.env.META_AD_LIBRARY_TOKEN
  const latencyMs = Date.now() - start

  if (!key) {
    return { status: 'error', latencyMs, message: 'INSTAGRAM_API_KEY / META_AD_LIBRARY_TOKEN nao configurado' }
  }

  return { status: 'ok', latencyMs, message: 'Credenciais de Instagram presentes no ambiente' }
}

async function checkEnrichment(): Promise<HealthResult> {
  const start = Date.now()
  try {
    // Check if there is a configured enrichment URL in the api_configurations table
    const config = await prisma.apiConfiguration.findUnique({
      where: { provider: 'enrichment' },
    })

    const enrichmentUrl = (config?.config as Record<string, unknown> | null)?.baseUrl as string | undefined
      || process.env.ENRICHMENT_API_URL

    if (!enrichmentUrl) {
      return {
        status: 'error',
        latencyMs: Date.now() - start,
        message: 'URL de enrichment nao configurada (ENRICHMENT_API_URL ou config.baseUrl)',
      }
    }

    // Attempt a HEAD request to verify the URL is reachable
    const res = await fetch(enrichmentUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
    })
    const latencyMs = Date.now() - start

    if (!res.ok && res.status !== 405) {
      return { status: 'error', latencyMs, message: `Enrichment URL retornou HTTP ${res.status}` }
    }

    return { status: 'ok', latencyMs, message: 'Enrichment API acessivel' }
  } catch (err) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : 'Erro desconhecido',
    }
  }
}

const HEALTH_CHECKS: Record<string, () => Promise<HealthResult>> = {
  meta: checkMeta,
  youtube: checkYoutube,
  tiktok: checkTiktok,
  instagram: checkInstagram,
  enrichment: checkEnrichment,
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { provider: string } },
) {
  const session = await auth()
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { provider } = params
  const checkFn = HEALTH_CHECKS[provider]

  if (!checkFn) {
    return NextResponse.json(
      { status: 'error', latencyMs: 0, message: `Provider "${provider}" nao possui health check configurado` },
      { status: 400 },
    )
  }

  const result = await checkFn()

  return NextResponse.json(result)
}
