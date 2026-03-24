import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'
import { analyzeLink, detectPlatform } from '@/lib/services/link-analyzer'
import {
  classifyFormat,
  getCachedClassification,
} from '@/lib/services/format-classifier'

const bodySchema = z.object({
  url: z.string().url(),
  quizSessionId: z.string().optional(),
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

  const platform = detectPlatform(body.url)
  if (!platform) {
    return NextResponse.json(
      { error: 'Plataforma não suportada. Suportamos: TikTok, Instagram, YouTube e Facebook.' },
      { status: 400 },
    )
  }

  try {
    const analysis = await analyzeLink(body.url)

    // Check for cached classification
    let formatClassification = await getCachedClassification(body.url)

    // Classify if we have a thumbnail (image available)
    if (!formatClassification && analysis.thumbnailUrl) {
      try {
        formatClassification = await classifyFormat({
          imageUrl: analysis.thumbnailUrl,
          adCopy: analysis.title ?? undefined,
        })
      } catch {
        // Classification failed — proceed without it
      }
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Save to creative_references
    const sourceMap: Record<string, 'TIKTOK' | 'INSTAGRAM' | 'YOUTUBE' | 'META_AD_LIBRARY'> = {
      tiktok: 'TIKTOK',
      instagram: 'INSTAGRAM',
      youtube: 'YOUTUBE',
      facebook: 'META_AD_LIBRARY',
    }

    const reference = await prisma.creativeReference.create({
      data: {
        userId: user.id,
        quizSessionId: body.quizSessionId ?? null,
        source: sourceMap[platform] ?? 'MANUAL_UPLOAD',
        sourceUrl: body.url,
        mediaType: 'VIDEO', // Most social links are video
        mediaUrl: analysis.thumbnailUrl,
        platform,
        formatClassification: formatClassification
          ? JSON.stringify(formatClassification)
          : null,
        searchQuery: analysis.title ?? body.url,
        engagementMetrics: analysis.metrics
          ? JSON.parse(JSON.stringify(analysis.metrics))
          : undefined,
        advertiserName: analysis.authorName,
      },
    })

    return NextResponse.json({
      reference,
      analysis,
      formatClassification,
    })
  } catch (err) {
    console.error('[References/AnalyzeLink]', err instanceof Error ? err.message : err)
    return NextResponse.json({
      error: 'Não foi possível analisar este link. Tente fazer upload manual.',
    }, { status: 500 })
  }
}
