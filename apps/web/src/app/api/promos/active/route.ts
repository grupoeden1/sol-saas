import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import type { CampaignFilters } from '@sol/db';

// GET /api/promos/active — returns the first applicable active campaign for the logged-in user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Get user data for filter matching
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      credits: true,
      conversations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
      _count: {
        select: {
          conversations: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ campaign: null });
  }

  const now = new Date();

  // Exclude the campaign linked to upsell banner (avoid duplicate display)
  const upsellCfg = await prisma.pricingConfig.findUnique({
    where: { key: 'UPSELL_CAMPAIGN_ID' },
  });
  const upsellCampaignId = upsellCfg?.textValue ?? null;

  // Get active campaigns that haven't been delivered to this user yet
  const campaigns = await prisma.promoCampaign.findMany({
    where: {
      status: 'ACTIVE',
      ...(upsellCampaignId ? { id: { not: upsellCampaignId } } : {}),
      OR: [
        { startsAt: null },
        { startsAt: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { endsAt: null },
            { endsAt: { gte: now } },
          ],
        },
      ],
      // Exclude campaigns already delivered to this user
      deliveries: {
        none: { userId },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter campaigns by their audience criteria
  const lastActivity = user.conversations[0]?.createdAt;
  const daysSinceActivity = lastActivity
    ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Count user messages for message filters
  const messageCount = await prisma.message.count({
    where: {
      role: 'user',
      conversation: { userId },
    },
  });

  for (const campaign of campaigns) {
    const filters = campaign.filters as CampaignFilters;

    // Check all filters (AND logic)
    if (filters.creditsMin !== undefined && user.credits < filters.creditsMin) continue;
    if (filters.creditsMax !== undefined && user.credits > filters.creditsMax) continue;
    if (filters.inactiveDays !== undefined && daysSinceActivity < filters.inactiveDays) continue;
    if (filters.messagesMin !== undefined && messageCount < filters.messagesMin) continue;
    if (filters.messagesMax !== undefined && messageCount > filters.messagesMax) continue;

    // This campaign matches — return it
    return NextResponse.json({
      campaign: {
        id: campaign.id,
        title: campaign.title,
        message: campaign.message,
        offerType: campaign.offerType,
        offerId: campaign.offerId,
        discountPercent: campaign.discountPercent,
      },
    });
  }

  return NextResponse.json({ campaign: null });
}
