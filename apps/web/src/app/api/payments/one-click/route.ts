import { auth } from '@/lib/auth';
import { prisma, addCredits } from '@sol/db';
import { getStripeClient } from '@/lib/stripe';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type Stripe from 'stripe';

const oneClickSchema = z.object({
  packageId: z.string().min(1),
  campaignId: z.string().min(1).optional(),
});

// POST /api/payments/one-click — One-click purchase using saved payment method
export const POST = auth(async function handler(req) {
  try {
    const session = req.auth;

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, stripeCustomerId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = oneClickSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const { packageId, campaignId } = parsed.data;

    // Validate package exists and is active
    const pkg = await prisma.creditPackage.findUnique({
      where: { id: packageId },
    });

    if (!pkg || !pkg.active) {
      return NextResponse.json({ error: 'Package not found or inactive' }, { status: 400 });
    }

    // Check user has a Stripe Customer ID
    if (!user.stripeCustomerId) {
      // Build fallback checkout URL
      const origin =
        req.headers.get('origin') ||
        req.headers.get('referer')?.replace(/\/[^/]*$/, '') ||
        '';
      const baseUrl = origin || process.env.NEXTAUTH_URL || 'http://localhost:3000';
      return NextResponse.json({
        error: 'no_payment_method',
        fallbackUrl: `${baseUrl}/credits/buy`,
      });
    }

    // List saved payment methods
    const stripe = getStripeClient();
    const paymentMethods = await stripe.customers.listPaymentMethods(user.stripeCustomerId, {
      type: 'card',
    });

    if (paymentMethods.data.length === 0) {
      const origin =
        req.headers.get('origin') ||
        req.headers.get('referer')?.replace(/\/[^/]*$/, '') ||
        '';
      const baseUrl = origin || process.env.NEXTAUTH_URL || 'http://localhost:3000';
      return NextResponse.json({
        error: 'no_payment_method',
        fallbackUrl: `${baseUrl}/credits/buy`,
      });
    }

    const paymentMethodId = paymentMethods.data[0].id;

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

    // Generate idempotency key to prevent duplicate charges (NFR10)
    const idempotencyKey = `one-click_${user.id}_${packageId}_${Date.now()}`;

    // Create PaymentIntent with confirm: true (one-click)
    let paymentIntent: Stripe.PaymentIntent;

    try {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount,
          currency: 'brl',
          customer: user.stripeCustomerId,
          payment_method: paymentMethodId,
          confirm: true,
          off_session: true,
          metadata: {
            userId: user.id,
            packageId: pkg.id,
            ...(campaignId ? { campaignId } : {}),
            ...(discountPercent != null ? { discountPercent: String(discountPercent) } : {}),
          },
        },
        { idempotencyKey },
      );
    } catch (stripeError) {
      // Handle specific Stripe errors
      if (stripeError instanceof Error && 'type' in stripeError) {
        const err = stripeError as Stripe.errors.StripeError;

        if (err.code === 'authentication_required') {
          const origin =
            req.headers.get('origin') ||
            req.headers.get('referer')?.replace(/\/[^/]*$/, '') ||
            '';
          const baseUrl = origin || process.env.NEXTAUTH_URL || 'http://localhost:3000';
          return NextResponse.json({
            error: 'authentication_required',
            message: 'Autenticacao necessaria. Use o checkout normal.',
            fallbackUrl: `${baseUrl}/credits/buy`,
          });
        }

        if (err.code === 'card_declined') {
          return NextResponse.json(
            { error: 'card_declined', message: 'Cartao recusado. Tente outro metodo de pagamento.' },
            { status: 402 },
          );
        }

        return NextResponse.json(
          { error: 'payment_failed', message: err.message ?? 'Falha no pagamento' },
          { status: 402 },
        );
      }

      throw stripeError;
    }

    // Check if payment succeeded
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'payment_not_completed', message: 'Pagamento nao foi concluido' },
        { status: 402 },
      );
    }

    // Add credits
    const creditType = campaignId ? 'promo_purchase' : 'purchase';
    const description = campaignId
      ? `Compra promocional de creditos (campanha: ${campaignId})`
      : undefined;

    const result = await addCredits(user.id, pkg.credits, {
      type: creditType,
      stripePaymentId: paymentIntent.id,
      ...(description ? { description } : {}),
    });

    // If campaign, record conversion
    if (campaignId) {
      await prisma.promoDelivery.upsert({
        where: {
          campaignId_userId: {
            campaignId,
            userId: user.id,
          },
        },
        update: {
          convertedAt: new Date(),
        },
        create: {
          campaignId,
          userId: user.id,
          convertedAt: new Date(),
        },
      });
    }

    console.log(
      `[OneClick] Payment succeeded userId=${user.id} packageId=${pkg.id} credits=${pkg.credits} campaignId=${campaignId ?? 'none'}`,
    );

    return NextResponse.json({
      success: true,
      credits: pkg.credits,
      newBalance: result.credits,
    });
  } catch (error) {
    console.error(
      '[OneClick] Error processing payment:',
      error instanceof Error ? error.message : 'Unknown',
    );
    return NextResponse.json(
      { error: 'Failed to process one-click payment' },
      { status: 500 },
    );
  }
});
