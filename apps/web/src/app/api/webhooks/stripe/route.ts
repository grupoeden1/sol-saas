import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Prisma, addCredits, getExchangeRate } from '@sol/db';
import { getStripeClient } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET não configurado');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  if (!signature) {
    console.error('[Webhook] Header stripe-signature ausente');
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[Webhook] Falha na validação de assinatura:', err instanceof Error ? err.message : 'Unknown');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const { userId } = session.metadata ?? {};
    const stripePaymentId =
      typeof session.payment_intent === 'string' ? session.payment_intent : null;
    const amountTotal = session.amount_total;

    if (!userId || !stripePaymentId || !amountTotal) {
      console.error('[Webhook] Metadata incompleto sessionId=', session.id);
      return NextResponse.json({ error: 'Incomplete metadata' }, { status: 400 });
    }

    // Calcular créditos em centavos com CREDIT_PERCENTAGE (fração decimal)
    const creditPercentage = parseFloat(process.env.CREDIT_PERCENTAGE ?? '0.40');
    const amountCents = Math.floor(amountTotal * (isNaN(creditPercentage) ? 0.40 : creditPercentage));

    if (amountCents <= 0) {
      console.error('[Webhook] amountCents calculado é zero ou negativo', {
        amountTotal,
        creditPercentage,
        amountCents,
        sessionId: session.id,
      });
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    try {
      // Buscar cotação para registro de auditoria
      const exchangeRate = await getExchangeRate('USD-BRL');

      await addCredits(userId, amountCents, stripePaymentId, exchangeRate);
      console.log(
        `[Webhook] Créditos adicionados amountCents=${amountCents} percentage=${creditPercentage}`
      );
    } catch (err: unknown) {
      // Idempotência: unique constraint em stripePaymentId rejeita webhook duplicado
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        console.log('[Webhook] Evento duplicado ignorado');
        return NextResponse.json({ received: true, duplicate: true });
      }

      console.error('[Webhook] Falha ao adicionar créditos:', err instanceof Error ? err.message : 'Unknown');
      return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
