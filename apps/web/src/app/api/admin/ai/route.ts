import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma, invalidateAiConfigCache } from '@sol/db'
import { invalidateAiAdapterCache } from '@/lib/ai'

const AI_CONFIG_KEYS = [
  'AI_PROVIDER',
  'ANTHROPIC_MODEL_DEFAULT',
  'ANTHROPIC_MODEL_FINAL',
  'OPENAI_MODEL_DEFAULT',
  'OPENAI_MODEL_FINAL',
] as const

export async function GET() {
  const session = await auth()
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await prisma.appConfig.findMany({
    where: { key: { in: [...AI_CONFIG_KEYS] } },
  })

  const get = (k: string, fallback: string) =>
    rows.find((r) => r.key === k)?.value ?? fallback

  return NextResponse.json({
    provider: get('AI_PROVIDER', 'anthropic'),
    anthropicModelDefault: get(
      'ANTHROPIC_MODEL_DEFAULT',
      process.env.ANTHROPIC_MODEL_DEFAULT ?? 'claude-haiku-4-5-20251001',
    ),
    anthropicModelFinal: get(
      'ANTHROPIC_MODEL_FINAL',
      process.env.ANTHROPIC_MODEL_FINAL ?? 'claude-sonnet-4-5-20250929',
    ),
    openaiModelDefault: get(
      'OPENAI_MODEL_DEFAULT',
      process.env.OPENAI_MODEL_DEFAULT ?? 'gpt-4o-mini',
    ),
    openaiModelFinal: get(
      'OPENAI_MODEL_FINAL',
      process.env.OPENAI_MODEL_FINAL ?? 'gpt-4o',
    ),
  })
}

const AiConfigSchema = z.object({
  provider: z.enum(['anthropic', 'openai']),
  anthropicModelDefault: z.string().min(1),
  anthropicModelFinal: z.string().min(1),
  openaiModelDefault: z.string().min(1),
  openaiModelFinal: z.string().min(1),
})

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: z.infer<typeof AiConfigSchema>
  try {
    body = AiConfigSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const updates = [
    { key: 'AI_PROVIDER', value: body.provider },
    { key: 'ANTHROPIC_MODEL_DEFAULT', value: body.anthropicModelDefault },
    { key: 'ANTHROPIC_MODEL_FINAL', value: body.anthropicModelFinal },
    { key: 'OPENAI_MODEL_DEFAULT', value: body.openaiModelDefault },
    { key: 'OPENAI_MODEL_FINAL', value: body.openaiModelFinal },
  ]

  await prisma.$transaction(
    updates.map((u) =>
      prisma.appConfig.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      }),
    ),
  )

  invalidateAiConfigCache()
  invalidateAiAdapterCache()

  console.log(
    `[Admin] AI config updated by ${session.user.email}: provider=${body.provider}`,
  )
  return NextResponse.json({ success: true })
}
