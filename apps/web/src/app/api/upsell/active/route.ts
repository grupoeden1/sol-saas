import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import type { CampaignFilters } from '@sol/db';

// GET /api/upsell/active — returns the upsell campaign + package for the logged-in user (if eligible)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Read linked campaign ID
  const cfg = await prisma.pricingConfig.findUnique({
    where: { key: 'UPSELL_CAMPAIGN_ID' },
  });

  const campaignId = cfg?.textValue;
  if (!campaignId) {
    return NextResponse.json({ campaign: null });
  }

  // Fetch campaign
  const now = new Date();
  const campaign = await prisma.promoCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign || campaign.status !== 'ACTIVE') {
    return NextResponse.json({ campaign: null });
  }

  // Check date range
  if (campaign.startsAt && campaign.startsAt > now) {
    return NextResponse.json({ campaign: null });
  }
  if (campaign.endsAt && campaign.endsAt < now) {
    return NextResponse.json({ campaign: null });
  }

  // Check if already delivered to this user
  const delivery = await prisma.promoDelivery.findUnique({
    where: { campaignId_userId: { campaignId, userId } },
  });

  if (delivery) {
    return NextResponse.json({ campaign: null });
  }

  // Fetch package
  if (!campaign.offerId) {
    return NextResponse.json({ campaign: null });
  }

  const pkg = await prisma.creditPackage.findUnique({
    where: { id: campaign.offerId },
  });

  if (!pkg || !pkg.active) {
    return NextResponse.json({ campaign: null });
  }

  // Check audience filters (same logic as /api/promos/active)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      credits: true,
      conversations: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        select: { createdAt: true },
      },
      _count: { select: { conversations: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ campaign: null });
  }

  const filters = campaign.filters as CampaignFilters;

  if (filters.creditsMin !== undefined && user.credits < filters.creditsMin) {
    return NextResponse.json({ campaign: null });
  }
  if (filters.creditsMax !== undefined && user.credits > filters.creditsMax) {
    return NextResponse.json({ campaign: null });
  }

  if (filters.inactiveDays !== undefined) {
    const lastActivity = user.conversations[0]?.createdAt;
    const daysSinceActivity = lastActivity
      ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    if (daysSinceActivity < filters.inactiveDays) {
      return NextResponse.json({ campaign: null });
    }
  }

  if (filters.messagesMin !== undefined || filters.messagesMax !== undefined) {
    const messageCount = await prisma.message.count({
      where: { role: 'user', conversation: { userId } },
    });
    if (filters.messagesMin !== undefined && messageCount < filters.messagesMin) {
      return NextResponse.json({ campaign: null });
    }
    if (filters.messagesMax !== undefined && messageCount > filters.messagesMax) {
      return NextResponse.json({ campaign: null });
    }
  }

  // Record view (unified tracking via PromoDelivery)
  await prisma.promoDelivery.create({
    data: {
      campaignId,
      userId,
      viewedAt: now,
    },
  });

  // Calculate discounted price
  const discountedPrice = campaign.discountPercent
    ? Math.round(pkg.priceBrl * (1 - campaign.discountPercent / 100))
    : pkg.priceBrl;

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      title: campaign.title,
      discountPercent: campaign.discountPercent,
    },
    package: {
      id: pkg.id,
      name: pkg.name,
      credits: pkg.credits,
      priceBrl: pkg.priceBrl,
      discountedPrice,
    },
  });
}
