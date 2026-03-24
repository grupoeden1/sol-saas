import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import { getStripeClient } from '@/lib/stripe';

// POST /api/subscription/reactivate — Remove cancel_at_period_end flag
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
    return NextResponse.json({ error: 'No subscription found' }, { status: 400 });
  }

  if (user.subscription.status !== 'ACTIVE') {
    return NextResponse.json(
      { error: 'Subscription is not active — cannot reactivate' },
      { status: 400 },
    );
  }

  if (!user.subscription.cancelAtPeriodEnd) {
    return NextResponse.json(
      { error: 'Subscription is not scheduled for cancellation' },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripeClient();

    // Remove cancel_at_period_end flag
    await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    // Update local record
    await prisma.userSubscription.update({
      where: { id: user.subscription.id },
      data: { cancelAtPeriodEnd: false },
    });

    console.log(
      `[Subscription/Reactivate] Subscription reactivated userId=${user.id} stripeSubId=${user.subscription.stripeSubscriptionId}`,
    );

    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated successfully',
    });
  } catch (error) {
    console.error(
      '[Subscription/Reactivate] Error:',
      error instanceof Error ? error.message : 'Unknown',
    );
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 },
    );
  }
}
