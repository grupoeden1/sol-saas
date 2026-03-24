import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import { getStripeClient } from '@/lib/stripe';

const changePlanSchema = z.object({
  planId: z.string().min(1),
});

// POST /api/subscription/change-plan — Upgrade or downgrade subscription
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof changePlanSchema>;
  try {
    body = changePlanSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      subscription: { include: { plan: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!user.subscription) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
  }

  if (user.subscription.status !== 'ACTIVE') {
    return NextResponse.json(
      { error: 'Subscription is not active — cannot change plan' },
      { status: 400 },
    );
  }

  // Validate new plan
  const newPlan = await prisma.subscriptionPlan.findUnique({
    where: { id: body.planId },
  });

  if (!newPlan || !newPlan.active) {
    return NextResponse.json({ error: 'Target plan not found or inactive' }, { status: 400 });
  }

  if (!newPlan.stripePriceId) {
    return NextResponse.json(
      { error: 'Target plan is not properly configured in Stripe' },
      { status: 400 },
    );
  }

  if (newPlan.id === user.subscription.planId) {
    return NextResponse.json(
      { error: 'Already subscribed to this plan' },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripeClient();

    // Retrieve the current Stripe Subscription to get the subscription item ID
    const stripeSubscription = await stripe.subscriptions.retrieve(
      user.subscription.stripeSubscriptionId,
    );

    const subscriptionItemId = stripeSubscription.items.data[0]?.id;
    if (!subscriptionItemId) {
      return NextResponse.json(
        { error: 'Could not find subscription item in Stripe' },
        { status: 500 },
      );
    }

    // Update the subscription with the new price (proration enabled by default)
    await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: newPlan.stripePriceId,
        },
      ],
      proration_behavior: 'create_prorations',
      // If the subscription was scheduled for cancellation, remove that
      cancel_at_period_end: false,
    });

    // Update local record
    await prisma.userSubscription.update({
      where: { id: user.subscription.id },
      data: {
        planId: newPlan.id,
        cancelAtPeriodEnd: false,
      },
    });

    const direction =
      newPlan.priceInCents > user.subscription.plan.priceInCents ? 'upgrade' : 'downgrade';

    console.log(
      `[Subscription/ChangePlan] ${direction} userId=${user.id} from=${user.subscription.plan.name} to=${newPlan.name}`,
    );

    return NextResponse.json({
      success: true,
      message: `Plan changed successfully (${direction})`,
      newPlan: {
        id: newPlan.id,
        name: newPlan.name,
        creditsMonthly: newPlan.creditsMonthly,
        priceInCents: newPlan.priceInCents,
      },
    });
  } catch (error) {
    console.error(
      '[Subscription/ChangePlan] Error:',
      error instanceof Error ? error.message : 'Unknown',
    );
    return NextResponse.json(
      { error: 'Failed to change subscription plan' },
      { status: 500 },
    );
  }
}
