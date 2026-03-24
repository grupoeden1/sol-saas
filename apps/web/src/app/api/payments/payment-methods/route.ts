import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import { getStripeClient } from '@/lib/stripe';
import { NextResponse } from 'next/server';

interface PaymentMethodInfo {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

// GET /api/payments/payment-methods — List user's saved payment methods
export const GET = auth(async function handler(req) {
  try {
    const session = req.auth;

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { stripeCustomerId: true },
    });

    if (!user || !user.stripeCustomerId) {
      return NextResponse.json({ paymentMethods: [] as PaymentMethodInfo[] });
    }

    const stripe = getStripeClient();
    const methods = await stripe.customers.listPaymentMethods(user.stripeCustomerId, {
      type: 'card',
    });

    const paymentMethods: PaymentMethodInfo[] = methods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand ?? 'unknown',
      last4: pm.card?.last4 ?? '****',
      expMonth: pm.card?.exp_month ?? 0,
      expYear: pm.card?.exp_year ?? 0,
    }));

    return NextResponse.json({ paymentMethods });
  } catch (error) {
    console.error(
      '[PaymentMethods] Error listing methods:',
      error instanceof Error ? error.message : 'Unknown',
    );
    return NextResponse.json(
      { error: 'Failed to list payment methods' },
      { status: 500 },
    );
  }
});
