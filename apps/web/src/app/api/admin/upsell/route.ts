import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@sol/db';
import { auth } from '@/lib/auth';
import { z } from 'zod';

function adminGuard(session: { user?: { email?: string | null; role?: string } } | null) {
  return !session?.user?.email || session.user.role !== 'ADMIN';
}

// ─── GET — read upsell config ─────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (adminGuard(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [campaignIdCfg, campaigns] = await Promise.all([
    prisma.pricingConfig.findUnique({ where: { key: 'UPSELL_CAMPAIGN_ID' } }),
    prisma.promoCampaign.findMany({
      where: {
        status: 'ACTIVE',
        offerType: 'CREDIT_PACKAGE',
        offerId: { not: null },
      },
      select: { id: true, name: true, discountPercent: true, offerId: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return NextResponse.json({
    campaignId: campaignIdCfg?.textValue ?? null,
    campaigns,
  });
}

// ─── PUT — save upsell config ─────────────────────────────────────────────

const UpdateSchema = z.object({
  campaignId: z.string().nullable(),
});

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (adminGuard(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof UpdateSchema>;
  try {
    body = UpdateSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  await prisma.pricingConfig.upsert({
    where: { key: 'UPSELL_CAMPAIGN_ID' },
    update: { textValue: body.campaignId },
    create: { key: 'UPSELL_CAMPAIGN_ID', value: 0, textValue: body.campaignId },
  });

  return NextResponse.json({ success: true });
}
