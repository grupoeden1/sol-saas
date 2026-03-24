import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'
import { analyzeProfile } from '@/lib/services/competitor-analyzer'

const MAX_PROFILES = 5

const createSchema = z.object({
  profileUrl: z.string().url('URL inválida'),
  platform: z.enum(['youtube', 'tiktok', 'instagram']).optional(),
  profileHandle: z.string().min(1).optional(),
})

// ---------------------------------------------------------------------------
// GET — List user's competitor profiles
// ---------------------------------------------------------------------------
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  const profiles = await prisma.competitorProfile.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: profiles, count: profiles.length, max: MAX_PROFILES })
}

// ---------------------------------------------------------------------------
// POST — Create a new competitor profile
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  // Validate body
  let body: z.infer<typeof createSchema>
  try {
    body = createSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Enforce max 5 profiles per user
  const currentCount = await prisma.competitorProfile.count({
    where: { userId: user.id },
  })
  if (currentCount >= MAX_PROFILES) {
    return NextResponse.json(
      { error: `Limite de ${MAX_PROFILES} perfis atingido. Remova um perfil antes de adicionar outro.` },
      { status: 400 },
    )
  }

  // Analyze the profile URL to detect platform and get top posts
  let platform = body.platform ?? ''
  let handle = body.profileHandle ?? ''
  let topPosts: unknown[] = []

  try {
    const analysis = await analyzeProfile(body.profileUrl)
    platform = platform || analysis.platform
    handle = handle || analysis.handle
    topPosts = analysis.topPosts
  } catch (err) {
    // If analysis fails but we have platform and handle, proceed without topPosts
    if (!platform || !handle) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Falha ao analisar perfil' },
        { status: 400 },
      )
    }
  }

  const profile = await prisma.competitorProfile.create({
    data: {
      userId: user.id,
      platform,
      profileHandle: handle,
      profileUrl: body.profileUrl,
      topPosts: topPosts.length > 0 ? JSON.parse(JSON.stringify(topPosts)) : undefined,
    },
  })

  return NextResponse.json({ data: profile }, { status: 201 })
}
