import { auth } from '@/lib/auth'
import { z } from 'zod'
import { prisma, dismissNps } from '@sol/db'

const dismissSchema = z.object({
  campaignId: z.string().min(1),
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

    const body = dismissSchema.safeParse(await req.json())
    if (!body.success) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    await dismissNps(body.data.campaignId, user.id)

    return Response.json({ success: true })
  } catch (error) {
    console.error('[NPS Dismiss] Error:', error instanceof Error ? error.message : 'Unknown')
    return Response.json({ error: 'Failed to dismiss' }, { status: 500 })
  }
}
