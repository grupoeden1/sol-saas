import { Prisma } from '@prisma/client'
import { prisma } from './index'

const Decimal = Prisma.Decimal

// ─── Custom Error ──────────────────────────────────────────────────────────

export class ExchangeRateApiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'ExchangeRateApiError'
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Retorna a data de hoje como Date truncada (midnight UTC-3 → UTC date) */
function todayDate(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

// ─── getExchangeRate ───────────────────────────────────────────────────────

/**
 * Busca cotação USD-BRL com fallback em 3 níveis:
 * 1. Cotação de hoje no banco
 * 2. Última cotação disponível (qualquer data)
 * 3. FALLBACK_USD_BRL_RATE do .env
 */
export async function getExchangeRate(currency: string): Promise<Prisma.Decimal> {
  // Nível 1: cotação de hoje
  const today = todayDate()
  const todayRate = await prisma.exchangeRate.findUnique({
    where: { currency_date: { currency, date: today } },
  })

  if (todayRate) {
    return todayRate.rate
  }

  // Nível 2: última cotação disponível
  const lastRate = await prisma.exchangeRate.findFirst({
    where: { currency },
    orderBy: { date: 'desc' },
  })

  if (lastRate) {
    return lastRate.rate
  }

  // Nível 3: fallback do .env
  const fallback = process.env.FALLBACK_USD_BRL_RATE ?? '6.00'
  try {
    const rate = new Decimal(fallback)
    if (rate.lte(0)) throw new Error('Rate must be positive')
    return rate
  } catch {
    console.error(`[ExchangeRate] FALLBACK_USD_BRL_RATE inválido: "${fallback}", usando 6.00`)
    return new Decimal('6.00')
  }
}

// ─── updateExchangeRate ────────────────────────────────────────────────────

/**
 * Faz upsert de cotação para o par + data de hoje.
 */
export async function updateExchangeRate(
  currency: string,
  rate: Prisma.Decimal,
) {
  const today = todayDate()

  return prisma.exchangeRate.upsert({
    where: { currency_date: { currency, date: today } },
    update: { rate },
    create: {
      currency,
      rate,
      date: today,
    },
  })
}

// ─── fetchExchangeRateFromApi ──────────────────────────────────────────────

/**
 * Busca cotação USD-BRL via AwesomeAPI.
 * GET https://economia.awesomeapi.com.br/json/last/USD-BRL
 * Response: { "USDBRL": { "bid": "5.4521", ... } }
 */
export async function fetchExchangeRateFromApi(currency: string): Promise<Prisma.Decimal> {
  const pair = currency.replace('-', '')
  const url = `https://economia.awesomeapi.com.br/json/last/${currency}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new ExchangeRateApiError(
        `AwesomeAPI retornou status ${response.status} para ${currency}`,
      )
    }

    const data = await response.json() as Record<string, { bid?: string }>
    const bid = data?.[pair]?.bid

    if (!bid || typeof bid !== 'string') {
      throw new ExchangeRateApiError(
        `AwesomeAPI retornou resposta inválida para ${currency}: campo "bid" ausente`,
      )
    }

    return new Decimal(bid)
  } catch (error) {
    if (error instanceof ExchangeRateApiError) throw error
    throw new ExchangeRateApiError(
      `Falha ao buscar cotação ${currency} da AwesomeAPI`,
      error,
    )
  }
}

// ─── ensureTodayRate ───────────────────────────────────────────────────────

/**
 * Lazy refresh: garante que existe cotação de hoje no banco.
 * Se não existir, busca da API e salva. Se API falhar, retorna última disponível.
 */
export async function ensureTodayRate(currency: string): Promise<Prisma.Decimal> {
  // Tentar cotação de hoje direto
  const today = todayDate()
  const todayRate = await prisma.exchangeRate.findUnique({
    where: { currency_date: { currency, date: today } },
  })

  if (todayRate) {
    return todayRate.rate
  }

  // Não tem de hoje — buscar da API
  try {
    const apiRate = await fetchExchangeRateFromApi(currency)
    const saved = await updateExchangeRate(currency, apiRate)
    console.log(`[ExchangeRate] Cotação atualizada: ${currency} = ${saved.rate}`)
    return saved.rate
  } catch (error) {
    console.error('[ExchangeRate] Falha ao buscar cotação da API, usando fallback:', error)
    // Fallback: última cotação ou env var (via getExchangeRate)
    return getExchangeRate(currency)
  }
}
