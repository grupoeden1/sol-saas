import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';

const TrackSchema = z.object({
  campaignId: z.string().min(1),
  event: z.enum(['viewed', 'clicked', 'converted', 'dismissed']),
});

// POST /api/promos/track — track promo delivery events
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof TrackSchema>;
  try {
    body = TrackSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const userId = session.user.id;
  const { campaignId, event } = body;

  // Verify campaign exists
  const campaign = await prisma.promoCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const fieldMap: Record<string, string> = {
    viewed: 'viewedAt',
    clicked: 'clickedAt',
    converted: 'convertedAt',
    dismissed: 'dismissedAt',
  };

  const field = fieldMap[event];
  const now = new Date();

  // Check if delivery already exists
  const existing = await prisma.promoDelivery.findUnique({
    where: { campaignId_userId: { campaignId, userId } },
  });

  if (existing) {
    // Only update the field if it hasn't been set yet
    const currentValue = existing[field as keyof typeof existing];
    if (currentValue === null) {
      await prisma.promoDelivery.update({
        where: { campaignId_userId: { campaignId, userId } },
        data: { [field]: now },
      });
    }
  } else {
    await prisma.promoDelivery.create({
      data: {
        campaignId,
        userId,
        [field]: now,
      },
    });
  }

  return NextResponse.json({ success: true });
}
