import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { searchAds } from '@/lib/services/ad-library'

const searchSchema = z.object({
  q: z.string().min(2),
  country: z.string().default('BR'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = searchSchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const result = await searchAds(parsed.data.q, parsed.data.country, parsed.data.limit)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[References/Ads]', err instanceof Error ? err.message : err)
    return NextResponse.json({
      data: [],
      message: 'Busca temporariamente indisponível. Faça upload manual da referência.',
    })
  }
}
