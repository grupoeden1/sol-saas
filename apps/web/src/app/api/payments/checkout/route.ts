import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import { getStripeClient } from '@/lib/stripe';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const checkoutSchema = z.object({
  packageId: z.string().min(1),
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

    const { packageId } = parsed.data;

    // Buscar pacote do banco
    const pkg = await prisma.creditPackage.findUnique({
      where: { id: packageId },
    });

    if (!pkg || !pkg.active) {
      return NextResponse.json({ error: `Package '${packageId}' not found` }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

    const checkoutSession = await getStripeClient().checkout.sessions.create({
      payment_method_types: ['card', 'pix'],
      mode: 'payment',
      currency: 'brl',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: pkg.priceBrl,
            product_data: {
              name: `SOL — ${pkg.name}`,
              description: pkg.description ?? `${pkg.credits} créditos`,
            },
          },
        },
      ],
      success_url: `${baseUrl}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/credits/error`,
      metadata: {
        userId: user.id,
        packageId: pkg.id,
      },
    });

    console.log(`[Checkout] Session created packageId=${pkg.id} credits=${pkg.credits}`);

    return NextResponse.json({ sessionUrl: checkoutSession.url });
  } catch (error) {
    console.error('[Checkout] Error creating session:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
});
