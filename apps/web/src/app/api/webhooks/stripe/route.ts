import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Prisma, prisma, addCredits } from '@sol/db';
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

    const userId =
      typeof session.metadata?.userId === 'string' ? session.metadata.userId : null;
    const packageId =
      typeof session.metadata?.packageId === 'string' ? session.metadata.packageId : null;
    const stripePaymentId =
      typeof session.payment_intent === 'string' ? session.payment_intent : null;

    if (!userId || !packageId || !stripePaymentId) {
      console.error('[Webhook] Metadata incompleto sessionId=', session.id);
      return NextResponse.json({ error: 'Incomplete metadata' }, { status: 400 });
    }

    // Buscar pacote do banco para obter quantidade de créditos
    const pkg = await prisma.creditPackage.findUnique({ where: { id: packageId } });

    if (!pkg) {
      console.error('[Webhook] Pacote não encontrado packageId=', packageId);
      return NextResponse.json({ error: 'Package not found' }, { status: 400 });
    }

    try {
      await addCredits(userId, pkg.credits, {
        type: 'purchase',
        stripePaymentId,
      });
      console.log(
        `[Webhook] Créditos adicionados credits=${pkg.credits} package=${pkg.name}`
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
