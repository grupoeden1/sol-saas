import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'

const UpdateSchema = z.object({
  enabled: z.boolean().optional(),
  apiKeyEnv: z.string().min(1).optional(),
  rateLimitPerHour: z.number().int().positive().optional(),
  config: z.record(z.string(), z.unknown()).nullable().optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: { provider: string } },
) {
  const session = await auth()
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { provider } = params

  let body: z.infer<typeof UpdateSchema>
  try {
    body = UpdateSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {
    updatedBy: session.user.email,
  }

  if (body.enabled !== undefined) updateData.enabled = body.enabled
  if (body.apiKeyEnv !== undefined) updateData.apiKeyEnv = body.apiKeyEnv
  if (body.rateLimitPerHour !== undefined) updateData.rateLimitPerHour = body.rateLimitPerHour
  if (body.config !== undefined) updateData.config = body.config ? JSON.parse(JSON.stringify(body.config)) : undefined

  const updated = await prisma.apiConfiguration.upsert({
    where: { provider },
    update: updateData,
    create: {
      provider,
      enabled: body.enabled ?? true,
      apiKeyEnv: body.apiKeyEnv ?? `${provider.toUpperCase()}_API_KEY`,
      rateLimitPerHour: body.rateLimitPerHour ?? 100,
      config: body.config ? JSON.parse(JSON.stringify(body.config)) : undefined,
      updatedBy: session.user.email,
    },
  })

  console.log(
    `[Admin] Integration "${provider}" updated by ${session.user.email}`,
  )

  return NextResponse.json(updated)
}
