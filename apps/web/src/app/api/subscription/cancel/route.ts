import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import { getStripeClient } from '@/lib/stripe';

// POST /api/subscription/cancel — Cancel subscription at period end
export async function POST() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, subscription: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!user.subscription) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
  }

  if (user.subscription.status !== 'ACTIVE') {
    return NextResponse.json(
      { error: 'Subscription is not active' },
      { status: 400 },
    );
  }

  if (user.subscription.cancelAtPeriodEnd) {
    return NextResponse.json(
      { error: 'Subscription is already scheduled for cancellation' },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripeClient();

    // Cancel at period end (not immediately)
    await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update local record
    await prisma.userSubscription.update({
      where: { id: user.subscription.id },
      data: { cancelAtPeriodEnd: true },
    });

    console.log(
      `[Subscription/Cancel] Subscription scheduled for cancellation userId=${user.id} stripeSubId=${user.subscription.stripeSubscriptionId}`,
    );

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current billing period',
      cancelAt: user.subscription.currentPeriodEnd,
    });
  } catch (error) {
    console.error(
      '[Subscription/Cancel] Error:',
      error instanceof Error ? error.message : 'Unknown',
    );
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 },
    );
  }
}
