import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getStripeClient } from '@/lib/stripe';
import {
  prisma,
  listPlans,
  createPlanInDb,
  updatePlanInDb,
  togglePlanActive,
} from '@sol/db';

// ─── Schemas ───────────────────────────────────────────────────────────────

const CreatePlanSchema = z.object({
  name: z.string().min(1).max(100),
  creditsMonthly: z.number().int().positive(),
  priceInCents: z.number().int().positive(),
  sortOrder: z.number().int().min(0).optional(),
});

const UpdatePlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  creditsMonthly: z.number().int().positive().optional(),
  priceInCents: z.number().int().positive().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const ToggleActiveSchema = z.object({
  id: z.string().min(1),
  active: z.boolean(),
});

const ToggleVisibilitySchema = z.object({
  subscriptionsEnabled: z.boolean(),
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function adminGuard(session: { user?: { email?: string | null; role?: string } } | null) {
  return !session?.user?.email || session.user.role !== 'ADMIN';
}

// ─── GET — list all plans ──────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (adminGuard(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const [plans, enabledConfig] = await Promise.all([
      listPlans(),
      prisma.pricingConfig.findUnique({ where: { key: 'SUBSCRIPTIONS_ENABLED' } }),
    ]);
    return NextResponse.json({
      plans,
      subscriptionsEnabled: (enabledConfig?.value ?? 0) === 1,
    });
  } catch (error) {
    console.error('[Admin/Subscriptions] GET error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Failed to list plans' }, { status: 500 });
  }
}

// ─── POST — create plan (Stripe + DB) ─────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (adminGuard(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof CreatePlanSchema>;
  try {
    body = CreatePlanSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();

    // 1. Create Stripe Product
    const product = await stripe.products.create({
      name: `SOL — ${body.name}`,
      metadata: { solPlanName: body.name },
    });

    // 2. Create Stripe Price (recurring, monthly, BRL)
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: body.priceInCents,
      currency: 'brl',
      recurring: { interval: 'month' },
    });

    // 3. Save in DB
    const plan = await createPlanInDb({
      name: body.name,
      creditsMonthly: body.creditsMonthly,
      priceInCents: body.priceInCents,
      sortOrder: body.sortOrder,
      stripeProductId: product.id,
      stripePriceId: price.id,
    });

    console.log(
      `[Admin/Subscriptions] Plan created by ${session!.user!.email}: ${plan.id} (${body.name})`,
    );

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error('[Admin/Subscriptions] POST error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}

// ─── PUT — update plan (handles price change via Stripe) ───────────────────

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (adminGuard(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof UpdatePlanSchema>;
  try {
    body = UpdatePlanSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    let newStripePriceId: string | undefined;

    // If price changed, create new Stripe Price and archive old one
    if (body.priceInCents) {
      const existingPlans = await listPlans();
      const existingPlan = existingPlans.find((p) => p.id === body.id);

      if (!existingPlan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }

      if (existingPlan.priceInCents !== body.priceInCents) {
        if (!existingPlan.stripeProductId) {
          return NextResponse.json(
            { error: 'Plan has no Stripe Product — cannot update price' },
            { status: 400 },
          );
        }

        // Create new price in Stripe
        const newPrice = await stripe.prices.create({
          product: existingPlan.stripeProductId,
          unit_amount: body.priceInCents,
          currency: 'brl',
          recurring: { interval: 'month' },
        });

        // Archive old price in Stripe
        if (existingPlan.stripePriceId) {
          await stripe.prices.update(existingPlan.stripePriceId, { active: false });
        }

        newStripePriceId = newPrice.id;
      }
    }

    // Update name in Stripe Product if name changed
    if (body.name) {
      const existingPlans = await listPlans();
      const existingPlan = existingPlans.find((p) => p.id === body.id);
      if (existingPlan?.stripeProductId) {
        await stripe.products.update(existingPlan.stripeProductId, {
          name: `SOL — ${body.name}`,
        });
      }
    }

    const plan = await updatePlanInDb(body.id, {
      name: body.name,
      creditsMonthly: body.creditsMonthly,
      priceInCents: body.priceInCents,
      sortOrder: body.sortOrder,
      stripePriceId: newStripePriceId,
    });

    console.log(
      `[Admin/Subscriptions] Plan updated by ${session!.user!.email}: ${body.id}`,
    );

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('[Admin/Subscriptions] PUT error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

// ─── PATCH — toggle plan active/inactive OR toggle section visibility ────

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (adminGuard(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rawBody = await req.json();

  // Check if this is a visibility toggle
  const visibilityParsed = ToggleVisibilitySchema.safeParse(rawBody);
  if (visibilityParsed.success) {
    try {
      const newValue = visibilityParsed.data.subscriptionsEnabled ? 1 : 0;
      await prisma.pricingConfig.upsert({
        where: { key: 'SUBSCRIPTIONS_ENABLED' },
        update: { value: newValue },
        create: { key: 'SUBSCRIPTIONS_ENABLED', value: newValue },
      });

      console.log(
        `[Admin/Subscriptions] Visibility ${visibilityParsed.data.subscriptionsEnabled ? 'enabled' : 'disabled'} by ${session!.user!.email}`,
      );

      return NextResponse.json({ success: true, subscriptionsEnabled: visibilityParsed.data.subscriptionsEnabled });
    } catch (error) {
      console.error('[Admin/Subscriptions] PATCH visibility error:', error instanceof Error ? error.message : 'Unknown');
      return NextResponse.json({ error: 'Failed to update visibility' }, { status: 500 });
    }
  }

  // Otherwise, toggle plan active/inactive
  let body: z.infer<typeof ToggleActiveSchema>;
  try {
    body = ToggleActiveSchema.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const plan = await togglePlanActive(body.id, body.active);

    console.log(
      `[Admin/Subscriptions] Plan ${body.active ? 'activated' : 'deactivated'} by ${session!.user!.email}: ${body.id}`,
    );

    return NextResponse.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown';
    console.error('[Admin/Subscriptions] PATCH error:', message);

    if (message.includes('Cannot activate plan')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to toggle plan status' }, { status: 500 });
  }
}
