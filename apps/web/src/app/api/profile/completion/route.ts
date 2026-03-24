import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!user) return Response.json({ percentage: 0 })

  const profile = await prisma.expertProfile.findUnique({
    where: { userId: user.id },
    select: { completionPercentage: true },
  })

  return Response.json({ percentage: profile?.completionPercentage ?? 0 })
}
