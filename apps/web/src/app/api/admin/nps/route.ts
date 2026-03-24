import { auth } from '@/lib/auth'
import { z } from 'zod'
import {
  listNpsCampaigns,
  createNpsCampaign,
  updateNpsCampaign,
  updateNpsCampaignStatus,
} from '@sol/db'
import type { CampaignStatus } from '@sol/db'

// GET /api/admin/nps — list all NPS campaigns
export async function GET() {
  const session = await auth()
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const campaigns = await listNpsCampaigns()
  return Response.json({ campaigns })
}

// POST /api/admin/nps — create NPS campaign
const createSchema = z.object({
  name: z.string().min(1).max(200),
  question: z.string().min(1).max(500),
  minDays: z.number().int().min(0).max(365).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = createSchema.safeParse(await req.json())
  if (!body.success) {
    return Response.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
  }

  const campaign = await createNpsCampaign({
    name: body.data.name,
    question: body.data.question,
    minDays: body.data.minDays,
    startsAt: body.data.startsAt ? new Date(body.data.startsAt) : undefined,
    endsAt: body.data.endsAt ? new Date(body.data.endsAt) : undefined,
  })

  console.log(`[Admin NPS] Campaign created by ${session.user.email}: ${campaign.name}`)
  return Response.json({ campaign }, { status: 201 })
}

// PUT /api/admin/nps — update NPS campaign
const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  question: z.string().min(1).max(500).optional(),
  minDays: z.number().int().min(0).max(365).optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
})

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = updateSchema.safeParse(await req.json())
  if (!body.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { id, ...data } = body.data
  const campaign = await updateNpsCampaign(id, {
    ...data,
    startsAt: data.startsAt === null ? null : data.startsAt ? new Date(data.startsAt) : undefined,
    endsAt: data.endsAt === null ? null : data.endsAt ? new Date(data.endsAt) : undefined,
  })

  return Response.json({ campaign })
}

// PATCH /api/admin/nps — change campaign status
const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED']),
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = statusSchema.safeParse(await req.json())
  if (!body.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const campaign = await updateNpsCampaignStatus(body.data.id, body.data.status as CampaignStatus)
    console.log(`[Admin NPS] Status changed to ${body.data.status} by ${session.user.email}: ${campaign.name}`)
    return Response.json({ campaign })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Status change failed' }, { status: 400 })
  }
}
