import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import { getStripeClient } from '@/lib/stripe';
import { getOrCreateStripeCustomer } from '@/lib/stripe-customer';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const checkoutSchema = z.object({
  packageId: z.string().min(1),
  campaignId: z.string().min(1).optional(),
});

// Usa auth como wrapper (padrão NextAuth v5 para Route Handlers)
export const POST = auth(async function handler(req) {
  try {
    const session = req.auth;

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const { packageId, campaignId } = parsed.data;

    // Buscar pacote do banco
    const pkg = await prisma.creditPackage.findUnique({
      where: { id: packageId },
    });

    if (!pkg || !pkg.active) {
      return NextResponse.json({ error: `Package '${packageId}' not found` }, { status: 400 });
    }

    // Calculate amount (apply discount if campaign)
    let amount = pkg.priceBrl;
    let discountPercent: number | null = null;

    if (campaignId) {
      const campaign = await prisma.promoCampaign.findUnique({
        where: { id: campaignId },
      });

      if (campaign && campaign.status === 'ACTIVE' && campaign.discountPercent) {
        discountPercent = campaign.discountPercent;
        amount = Math.round(pkg.priceBrl * (1 - campaign.discountPercent / 100));
      }
    }

    // Get or create Stripe Customer for this user
    const stripeCustomerId = await getOrCreateStripeCustomer(user.id, session.user.email);

    // Use the origin from the request so redirects work on any host (LAN IP, localhost, etc.)
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';
    const baseUrl = origin || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const productName = discountPercent
      ? `SOL — ${pkg.name} (${discountPercent}% OFF)`
      : `SOL — ${pkg.name}`;

    const checkoutSession = await getStripeClient().checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'payment',
      currency: 'brl',
      payment_intent_data: {
        setup_future_usage: 'off_session',
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: amount,
            product_data: {
              name: productName,
              description: pkg.description ?? `${pkg.credits} créditos`,
            },
          },
        },
      ],
      success_url: `${baseUrl}/dashboard?payment=success`,
      cancel_url: `${baseUrl}/credits/error`,
      metadata: {
        userId: user.id,
        packageId: pkg.id,
        ...(campaignId ? { campaignId } : {}),
        ...(discountPercent != null ? { discountPercent: String(discountPercent) } : {}),
      },
    });

    console.log(`[Checkout] Session created packageId=${pkg.id} credits=${pkg.credits} campaignId=${campaignId ?? 'none'} discount=${discountPercent ?? 0}%`);

    return NextResponse.json({ sessionUrl: checkoutSession.url });
  } catch (error) {
    console.error('[Checkout] Error creating session:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
});
