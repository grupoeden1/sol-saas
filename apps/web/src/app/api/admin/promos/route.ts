import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import {
  listCampaigns,
  createCampaign,
  updateCampaign,
  updateCampaignStatus,
  getCampaignMetrics,
} from '@sol/db';

// ─── Schemas ───────────────────────────────────────────────────────────────

const CampaignFiltersSchema = z.object({
  creditsMin: z.number().int().min(0).optional(),
  creditsMax: z.number().int().min(0).optional(),
  inactiveDays: z.number().int().min(0).optional(),
  messagesMin: z.number().int().min(0).optional(),
  messagesMax: z.number().int().min(0).optional(),
});

const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  offerType: z.enum(['CREDIT_PACKAGE', 'SUBSCRIPTION_PLAN', 'CUSTOM']),
  offerId: z.string().optional(),
  discountPercent: z.number().int().min(1).max(100).optional(),
  filters: CampaignFiltersSchema,
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

const UpdateCampaignSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  title: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(2000).optional(),
  offerType: z.enum(['CREDIT_PACKAGE', 'SUBSCRIPTION_PLAN', 'CUSTOM']).optional(),
  offerId: z.string().nullable().optional(),
  discountPercent: z.number().int().min(1).max(100).nullable().optional(),
  filters: CampaignFiltersSchema.optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

const UpdateStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['ACTIVE', 'PAUSED', 'ENDED']),
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function adminGuard(session: { user?: { email?: string | null; role?: string } } | null) {
  return !session?.user?.email || session.user.role !== 'ADMIN';
}

// ─── GET — list all campaigns with metrics ─────────────────────────────────

export async function GET() {
  const session = await auth();
  if (adminGuard(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const campaigns = await listCampaigns();

    // Fetch metrics for each campaign
    const campaignsWithMetrics = await Promise.all(
      campaigns.map(async (campaign) => {
        const metrics = await getCampaignMetrics(campaign.id);
        return { ...campaign, metrics };
      }),
    );

    return NextResponse.json({ campaigns: campaignsWithMetrics });
  } catch (error) {
    console.error('[Admin/Promos] GET error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Failed to list campaigns' }, { status: 500 });
  }
}

// ─── POST — create campaign ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (adminGuard(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof CreateCampaignSchema>;
  try {
    body = CreateCampaignSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const campaign = await createCampaign({
      name: body.name,
      title: body.title,
      message: body.message,
      offerType: body.offerType,
      offerId: body.offerId,
      discountPercent: body.discountPercent,
      filters: body.filters,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
    });

    console.log(
      `[Admin/Promos] Campaign created by ${session!.user!.email}: ${campaign.id} (${body.name})`,
    );

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('[Admin/Promos] POST error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}

// ─── PUT — update campaign details ─────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (adminGuard(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof UpdateCampaignSchema>;
  try {
    body = UpdateCampaignSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const campaign = await updateCampaign(body.id, {
      name: body.name,
      title: body.title,
      message: body.message,
      offerType: body.offerType,
      offerId: body.offerId,
      discountPercent: body.discountPercent,
      filters: body.filters,
      startsAt: body.startsAt ? new Date(body.startsAt) : body.startsAt === null ? null : undefined,
      endsAt: body.endsAt ? new Date(body.endsAt) : body.endsAt === null ? null : undefined,
    });

    console.log(
      `[Admin/Promos] Campaign updated by ${session!.user!.email}: ${body.id}`,
    );

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('[Admin/Promos] PUT error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

// ─── PATCH — update campaign status ────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (adminGuard(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof UpdateStatusSchema>;
  try {
    body = UpdateStatusSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const campaign = await updateCampaignStatus(body.id, body.status);

    console.log(
      `[Admin/Promos] Campaign status changed to ${body.status} by ${session!.user!.email}: ${body.id}`,
    );

    return NextResponse.json({ campaign });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown';
    console.error('[Admin/Promos] PATCH error:', message);

    if (message.includes('Invalid status transition')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update campaign status' }, { status: 500 });
  }
}
