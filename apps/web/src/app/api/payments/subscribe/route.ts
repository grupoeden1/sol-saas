import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import { getStripeClient } from '@/lib/stripe';
import { getOrCreateStripeCustomer } from '@/lib/stripe-customer';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const subscribeSchema = z.object({
  planId: z.string().min(1),
});

// POST /api/payments/subscribe — Create a Stripe Checkout Session for subscription
export const POST = auth(async function handler(req) {
  try {
    const session = req.auth;

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, subscription: { select: { id: true, status: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already has an active subscription
    if (user.subscription && user.subscription.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'User already has an active subscription. Use change-plan to switch plans.' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const { planId } = parsed.data;

    // Validate plan exists and is active
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.active) {
      return NextResponse.json({ error: 'Plan not found or inactive' }, { status: 400 });
    }

    if (!plan.stripePriceId) {
      return NextResponse.json(
        { error: 'Plan is not properly configured in Stripe' },
        { status: 400 },
      );
    }

    // Get or create Stripe Customer
    const stripeCustomerId = await getOrCreateStripeCustomer(user.id, session.user.email);

    // Use the origin from the request
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';
    const baseUrl = origin || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Create Stripe Checkout Session in subscription mode
    const checkoutSession = await getStripeClient().checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard?payment=success&subscription=true`,
      cancel_url: `${baseUrl}/credits/error`,
      metadata: {
        userId: user.id,
        planId: plan.id,
        type: 'subscription',
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planId: plan.id,
        },
      },
    });

    console.log(
      `[Subscribe] Checkout session created planId=${plan.id} planName=${plan.name} userId=${user.id}`,
    );

    return NextResponse.json({ sessionUrl: checkoutSession.url });
  } catch (error) {
    console.error(
      '[Subscribe] Error creating session:',
      error instanceof Error ? error.message : 'Unknown',
    );
    return NextResponse.json(
      { error: 'Failed to create subscription checkout session' },
      { status: 500 },
    );
  }
});
