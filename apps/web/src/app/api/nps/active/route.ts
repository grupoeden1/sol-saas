import { auth } from '@/lib/auth'
import { prisma, getActiveNpsForUser, markNpsViewed } from '@sol/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return Response.json({ campaign: null })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!user) {
      return Response.json({ campaign: null })
    }

    const campaign = await getActiveNpsForUser(user.id)
    if (!campaign) {
      return Response.json({ campaign: null })
    }

    // Mark as viewed
    await markNpsViewed(campaign.id, user.id)

    return Response.json({
      campaign: {
        id: campaign.id,
        question: campaign.question,
      },
    })
  } catch (error) {
    console.error('[NPS Active] Error:', error instanceof Error ? error.message : 'Unknown')
    return Response.json({ campaign: null })
  }
}
