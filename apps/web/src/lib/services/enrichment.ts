/**
 * Enrichment Service (Story 12.9)
 *
 * Provides a secondary enrichment layer that augments primary search results
 * with additional references from configurable external sources.
 *
 * Design principles:
 *  - Adapter pattern: swap enrichment providers without changing call-sites
 *  - Silent fallback: any failure returns an empty array (never breaks the UX)
 *  - Timeout: enrichment calls are capped at 5 seconds via Promise.race
 *  - Deduplication: results already present in primaryUrls are filtered out
 *  - Feature flag: reads `api_configurations` (provider = 'enrichment') to decide
 *    whether enrichment is enabled at all
 */

import { prisma } from '@sol/db'

import { GenericEnrichmentAdapter } from './adapters/generic-enrichment-adapter'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnrichmentAdapter {
  search(query: string, type: 'ad' | 'organic'): Promise<EnrichmentResult[]>
}

export interface EnrichmentResult {
  sourceUrl: string
  title: string
  description?: string
  provider: string
  thumbnailUrl?: string | null
  metrics?: { views?: number; likes?: number; comments?: number }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENRICHMENT_TIMEOUT_MS = 5_000

// ---------------------------------------------------------------------------
// Default adapter instance (singleton)
// ---------------------------------------------------------------------------

let defaultAdapter: EnrichmentAdapter | null = null

function getDefaultAdapter(): EnrichmentAdapter {
  if (!defaultAdapter) {
    defaultAdapter = new GenericEnrichmentAdapter()
  }
  return defaultAdapter
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Search for enrichment references that complement the primary results.
 *
 * @param query        - The search query (keyword / niche / product name)
 * @param type         - Whether the search context is 'ad' or 'organic'
 * @param primaryUrls  - URLs already present in the primary results (used for dedup)
 * @param adapter      - Optional adapter override (useful for testing)
 * @returns Deduplicated enrichment results, or empty array on any failure
 */
export async function enrichSearch(
  query: string,
  type: 'ad' | 'organic',
  primaryUrls: string[],
  adapter?: EnrichmentAdapter,
): Promise<EnrichmentResult[]> {
  const startMs = Date.now()
  const activeAdapter = adapter ?? getDefaultAdapter()
  const providerName = activeAdapter.constructor.name

  try {
    // ---- 1. Check feature flag in api_configurations ----------------------
    const config = await prisma.apiConfiguration.findUnique({
      where: { provider: 'enrichment' },
    })

    if (!config || !config.enabled) {
      // Enrichment is not enabled — silently return empty
      return []
    }

    // ---- 2. Call adapter with timeout ------------------------------------
    const results = await Promise.race<EnrichmentResult[]>([
      activeAdapter.search(query, type),
      new Promise<EnrichmentResult[]>((_, reject) =>
        setTimeout(() => reject(new Error('Enrichment timeout')), ENRICHMENT_TIMEOUT_MS),
      ),
    ])

    // ---- 3. Deduplicate against primary URLs -----------------------------
    const primarySet = new Set(primaryUrls.map(normalizeUrl))
    const deduplicated = results.filter(
      (r) => !primarySet.has(normalizeUrl(r.sourceUrl)),
    )

    // ---- 4. Log success --------------------------------------------------
    const latencyMs = Date.now() - startMs
    console.log(
      `[enrichment] provider=${providerName} query="${query}" type=${type} ` +
        `results=${deduplicated.length}/${results.length} latency=${latencyMs}ms`,
    )

    return deduplicated
  } catch (error) {
    // ---- Silent fallback — never throw -----------------------------------
    const latencyMs = Date.now() - startMs
    const message = error instanceof Error ? error.message : String(error)
    console.log(
      `[enrichment] provider=${providerName} query="${query}" type=${type} ` +
        `error="${message}" latency=${latencyMs}ms`,
    )
    return []
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalizes a URL for deduplication by stripping protocol, trailing slashes,
 * and lowering the case.
 */
function normalizeUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .toLowerCase()
}
