/**
 * Generic Enrichment Adapter (Story 12.9)
 *
 * Connects to any enrichment API via configurable environment variables:
 *  - ENRICHMENT_API_URL  — base URL of the enrichment service (POST endpoint)
 *  - ENRICHMENT_API_KEY  — bearer token for authentication
 *
 * The adapter sends a POST request with `{ query, type }` and expects a JSON
 * array of results that can be mapped to EnrichmentResult[].
 */

import type { EnrichmentAdapter, EnrichmentResult } from '../enrichment'

// ---------------------------------------------------------------------------
// Expected shape of each item in the API response
// ---------------------------------------------------------------------------

interface RawEnrichmentItem {
  url?: string
  source_url?: string
  sourceUrl?: string
  title?: string
  description?: string
  provider?: string
  thumbnail_url?: string | null
  thumbnailUrl?: string | null
  metrics?: {
    views?: number
    likes?: number
    comments?: number
  }
}

// ---------------------------------------------------------------------------
// Adapter implementation
// ---------------------------------------------------------------------------

export class GenericEnrichmentAdapter implements EnrichmentAdapter {
  private readonly apiUrl: string
  private readonly apiKey: string

  constructor() {
    this.apiUrl = process.env.ENRICHMENT_API_URL ?? ''
    this.apiKey = process.env.ENRICHMENT_API_KEY ?? ''
  }

  async search(query: string, type: 'ad' | 'organic'): Promise<EnrichmentResult[]> {
    if (!this.apiUrl) {
      // No URL configured — nothing to call
      return []
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({ query, type }),
      })

      if (!response.ok) {
        console.log(
          `[generic-enrichment-adapter] HTTP ${response.status} from ${this.apiUrl}`,
        )
        return []
      }

      const body = await response.json()

      // The response should be an array (or wrapped in a `results` / `data` field)
      const items: RawEnrichmentItem[] = Array.isArray(body)
        ? body
        : Array.isArray(body?.results)
          ? body.results
          : Array.isArray(body?.data)
            ? body.data
            : []

      return items
        .map((item) => this.mapItem(item))
        .filter((r): r is EnrichmentResult => r !== null)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`[generic-enrichment-adapter] error: ${message}`)
      return []
    }
  }

  // -------------------------------------------------------------------------
  // Internal mapping
  // -------------------------------------------------------------------------

  private mapItem(raw: RawEnrichmentItem): EnrichmentResult | null {
    const sourceUrl = raw.sourceUrl ?? raw.source_url ?? raw.url
    const title = raw.title

    // sourceUrl and title are required
    if (!sourceUrl || !title) {
      return null
    }

    return {
      sourceUrl,
      title,
      description: raw.description ?? undefined,
      provider: raw.provider ?? 'enrichment',
      thumbnailUrl: raw.thumbnailUrl ?? raw.thumbnail_url ?? null,
      metrics: raw.metrics,
    }
  }
}
