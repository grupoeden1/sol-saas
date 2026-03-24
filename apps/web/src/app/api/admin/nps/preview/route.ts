import { auth } from '@/lib/auth'
import { z } from 'zod'
import { previewNpsAudience } from '@sol/db'

const previewSchema = z.object({
  minDays: z.number().int().min(0).max(365),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = previewSchema.safeParse(await req.json())
  if (!body.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const count = await previewNpsAudience(body.data.minDays)
  return Response.json({ count })
}
