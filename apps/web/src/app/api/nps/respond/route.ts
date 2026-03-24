import { auth } from '@/lib/auth'
import { z } from 'zod'
import { prisma, submitNpsResponse } from '@sol/db'

const respondSchema = z.object({
  campaignId: z.string().min(1),
  score: z.number().int().min(1).max(5),
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    const body = respondSchema.safeParse(await req.json())
    if (!body.success) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    await submitNpsResponse(body.data.campaignId, user.id, body.data.score)

    return Response.json({ success: true })
  } catch (error) {
    console.error('[NPS Respond] Error:', error instanceof Error ? error.message : 'Unknown')
    return Response.json({ error: 'Failed to submit response' }, { status: 500 })
  }
}
