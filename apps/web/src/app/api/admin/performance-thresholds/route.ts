// GET/PUT /api/admin/performance-thresholds — Manage classification thresholds

import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'
import { z } from 'zod'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  })

  if (user?.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 })
  }

  const thresholds = await prisma.performanceThreshold.findMany({
    orderBy: [{ contentType: 'asc' }, { metricKey: 'asc' }],
  })

  return Response.json(thresholds)
}

const thresholdSchema = z.object({
  id: z.string(),
  terribleMax: z.number(),
  badMax: z.number(),
  averageMax: z.number(),
  goodMax: z.number(),
})

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true, email: true },
  })

  if (user?.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 })
  }

  const body = await req.json()
  const parsed = thresholdSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { id, terribleMax, badMax, averageMax, goodMax } = parsed.data

  // Validate order: terrible < bad < average < good
  if (!(terribleMax < badMax && badMax < averageMax && averageMax < goodMax)) {
    return Response.json(
      { error: 'Thresholds devem ser crescentes: terrible < bad < average < good' },
      { status: 400 }
    )
  }

  const updated = await prisma.performanceThreshold.update({
    where: { id },
    data: {
      terribleMax,
      badMax,
      averageMax,
      goodMax,
      updatedBy: user.email!,
    },
  })

  return Response.json(updated)
}
