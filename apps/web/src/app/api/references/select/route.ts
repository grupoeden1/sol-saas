import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'
import { classifyFormat, type ClassificationResult } from '@/lib/services/format-classifier'

const bodySchema = z.object({
  quizSessionId: z.string(),
  source: z.enum(['META_AD_LIBRARY', 'TIKTOK', 'YOUTUBE', 'INSTAGRAM', 'MANUAL_UPLOAD', 'ENRICHMENT']),
  sourceUrl: z.string().optional(),
  sourceId: z.string().optional(),
  mediaType: z.enum(['VIDEO', 'IMAGE']).default('VIDEO'),
  mediaUrl: z.string().optional(),
  adCopy: z.string().optional(),
  startDate: z.string().optional(),
  daysActive: z.number().optional(),
  engagementMetrics: z.record(z.string(), z.number()).optional(),
  platform: z.string(),
  advertiserName: z.string().optional(),
  searchQuery: z.string(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  // Auto-classify format if we have media
  let formatClassification: ClassificationResult | null = null
  if (body.mediaUrl) {
    try {
      formatClassification = await classifyFormat({
        imageUrl: body.mediaUrl,
        adCopy: body.adCopy,
      })
    } catch {
      // Classification failed — proceed without
    }
  }

  const reference = await prisma.creativeReference.create({
    data: {
      userId: user.id,
      quizSessionId: body.quizSessionId,
      source: body.source,
      sourceUrl: body.sourceUrl ?? null,
      sourceId: body.sourceId ?? null,
      mediaType: body.mediaType,
      mediaUrl: body.mediaUrl ?? null,
      adCopy: body.adCopy ?? null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      daysActive: body.daysActive ?? null,
      engagementMetrics: body.engagementMetrics
        ? JSON.parse(JSON.stringify(body.engagementMetrics))
        : undefined,
      platform: body.platform,
      formatClassification: formatClassification
        ? JSON.stringify(formatClassification)
        : null,
      advertiserName: body.advertiserName ?? null,
      searchQuery: body.searchQuery,
    },
  })

  return NextResponse.json({ reference, formatClassification }, { status: 201 })
}
