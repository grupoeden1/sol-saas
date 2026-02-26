import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Prisma, addCredits } from '@sol/db';
import { getStripeClient } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET não configurado');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  if (!signature) {
    console.error('[Webhook] Header stripe-signature ausente');
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[Webhook] Falha na validação de assinatura:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const { userId, creditsAmount } = session.metadata ?? {};
    const stripePaymentId =
      typeof session.payment_intent === 'string' ? session.payment_intent : null;

    if (!userId || !creditsAmount || !stripePaymentId) {
      console.error('[Webhook] Metadata incompleto', {
        userId,
        creditsAmount,
        stripePaymentId,
        sessionId: session.id,
      });
      return NextResponse.json({ error: 'Incomplete metadata' }, { status: 400 });
    }

    const credits = parseInt(creditsAmount, 10);
    if (isNaN(credits) || credits <= 0) {
      console.error('[Webhook] creditsAmount inválido', { creditsAmount, sessionId: session.id });
      return NextResponse.json({ error: 'Invalid credits amount' }, { status: 400 });
    }

    try {
      const newBalance = await addCredits(userId, credits, stripePaymentId);
      console.log(
        `[Webhook] Créditos adicionados userId=${userId} credits=${credits} newBalance=${newBalance} paymentId=${stripePaymentId}`
      );
    } catch (err: unknown) {
      // Idempotência: unique constraint em stripePaymentId rejeita webhook duplicado
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        console.log(
          `[Webhook] Evento duplicado ignorado userId=${userId} paymentId=${stripePaymentId}`
        );
        return NextResponse.json({ received: true, duplicate: true });
      }

      console.error(
        `[Webhook] Falha ao adicionar créditos userId=${userId} paymentId=${stripePaymentId}:`,
        err
      );
      return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
