import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import { getStripeClient } from '@/lib/stripe';
import { findPackage } from '@/lib/credits-config';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const checkoutSchema = z.object({
  packageId: z.string().min(1),
});

// Usa auth como wrapper (padrão NextAuth v5 para Route Handlers)
// req.auth contém a sessão de forma confiável no beta.30
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

    const { packageId } = parsed.data;

    const pkg = findPackage(packageId);
    if (!pkg) {
      return NextResponse.json({ error: `Package '${packageId}' not found` }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

    const checkoutSession = await getStripeClient().checkout.sessions.create({
      // Cartão habilitado por padrão. Para adicionar PIX:
      // 1. Ativar em Stripe Dashboard > Settings > Payment methods > Pix
      // 2. Adicionar 'pix' ao array abaixo
      payment_method_types: ['card'],
      mode: 'payment',
      currency: 'brl',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: pkg.price,
            product_data: {
              name: `SOL — ${pkg.label} (${pkg.credits} créditos)`,
              description: pkg.description,
            },
          },
        },
      ],
      success_url: `${baseUrl}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/credits/error`,
      metadata: {
        userId: user.id,
        packageId: pkg.id,
        creditsAmount: String(pkg.credits),
      },
    });

    console.log(`[Checkout] Session created for userId=${user.id} packageId=${pkg.id} credits=${pkg.credits}`);

    return NextResponse.json({ sessionUrl: checkoutSession.url });
  } catch (error) {
    console.error('[Checkout] Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
});
