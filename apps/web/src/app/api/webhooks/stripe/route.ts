import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  Prisma,
  prisma,
  addCredits,
  createUserSubscription,
  updateUserSubscriptionByStripeId,
  processReferralReward,
} from '@sol/db';
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

  // ─── checkout.session.completed ────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Handle subscription checkout
    if (session.mode === 'subscription') {
      await handleSubscriptionCheckoutCompleted(session);
      return NextResponse.json({ received: true });
    }

    // Handle one-time payment checkout (existing logic)
    const userId =
      typeof session.metadata?.userId === 'string' ? session.metadata.userId : null;
    const packageId =
      typeof session.metadata?.packageId === 'string' ? session.metadata.packageId : null;
    const stripePaymentId =
      typeof session.payment_intent === 'string' ? session.payment_intent : null;
    const campaignId =
      typeof session.metadata?.campaignId === 'string' ? session.metadata.campaignId : null;

    if (!userId || !packageId || !stripePaymentId) {
      console.error('[Webhook] Metadata incompleto sessionId=', session.id);
      return NextResponse.json({ error: 'Incomplete metadata' }, { status: 400 });
    }

    // Buscar pacote do banco para obter quantidade de créditos
    const pkg = await prisma.creditPackage.findUnique({ where: { id: packageId } });

    if (!pkg || pkg.credits <= 0) {
      console.error('[Webhook] Pacote inválido ou sem créditos packageId=', packageId);
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }

    try {
      const creditType = campaignId ? 'promo_purchase' : 'purchase';
      const description = campaignId
        ? `Compra promocional de créditos (campanha: ${campaignId})`
        : undefined;

      await addCredits(userId, pkg.credits, {
        type: creditType,
        stripePaymentId,
        ...(description ? { description } : {}),
      });
      console.log(
        `[Webhook] Créditos adicionados credits=${pkg.credits} package=${pkg.name} campaign=${campaignId ?? 'none'}`
      );

      // Record promo conversion if campaign purchase
      if (campaignId) {
        try {
          await prisma.promoDelivery.upsert({
            where: {
              campaignId_userId: { campaignId, userId },
            },
            update: { convertedAt: new Date() },
            create: { campaignId, userId, convertedAt: new Date() },
          });
        } catch {
          // Non-blocking — conversion tracking should not fail the purchase
        }
      }

      // Process referral reward on first purchase (must NOT block the purchase)
      try {
        const referralResult = await processReferralReward(userId, stripePaymentId);
        if (referralResult.processed) {
          console.log(`[Webhook] Referral reward processed for userId=${userId}`);
        }
      } catch (refErr) {
        console.error(
          '[Webhook] Referral reward error (non-blocking):',
          refErr instanceof Error ? refErr.message : 'Unknown',
        );
      }
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

  // ─── invoice.payment_succeeded ─────────────────────────────────────────────
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice;
    await handleInvoicePaymentSucceeded(invoice);
  }

  // ─── invoice.payment_failed ────────────────────────────────────────────────
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    await handleInvoicePaymentFailed(invoice);
  }

  // ─── customer.subscription.updated ─────────────────────────────────────────
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    await handleSubscriptionUpdated(subscription);
  }

  // ─── customer.subscription.deleted ─────────────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    await handleSubscriptionDeleted(subscription);
  }

  return NextResponse.json({ received: true });
}

// ─── Helpers: extract subscription ID from Stripe Invoice (SDK v20+) ────────

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  // Stripe SDK v20+ moved subscription to parent.subscription_details.subscription
  const subDetails = invoice.parent?.subscription_details;
  if (subDetails?.subscription) {
    return typeof subDetails.subscription === 'string'
      ? subDetails.subscription
      : subDetails.subscription.id;
  }
  return null;
}

// ─── Helpers: extract period dates from Stripe Subscription ─────────────────

function getSubscriptionPeriodDates(sub: Stripe.Subscription): {
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
} {
  // Stripe SDK v20+ moved current_period_start/end to items.data[]
  const item = sub.items?.data?.[0];
  const start = item?.current_period_start;
  const end = item?.current_period_end;

  if (typeof start === 'number' && typeof end === 'number') {
    return {
      currentPeriodStart: new Date(start * 1000),
      currentPeriodEnd: new Date(end * 1000),
    };
  }

  // Fallback: use current date + 30 days
  console.warn('[Webhook] Could not extract period dates from subscription, using fallback');
  const now = new Date();
  return {
    currentPeriodStart: now,
    currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  };
}

// ─── Handler: Subscription Checkout Completed ────────────────────────────────

async function handleSubscriptionCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId =
    typeof session.metadata?.userId === 'string' ? session.metadata.userId : null;
  const planId =
    typeof session.metadata?.planId === 'string' ? session.metadata.planId : null;
  const stripeSubscriptionId =
    typeof session.subscription === 'string' ? session.subscription : null;
  const stripeCustomerId =
    typeof session.customer === 'string' ? session.customer : null;

  if (!userId || !planId || !stripeSubscriptionId || !stripeCustomerId) {
    console.error(
      '[Webhook/Subscription] Incomplete metadata for subscription checkout sessionId=',
      session.id,
    );
    return;
  }

  // Check if subscription already exists (idempotency)
  const existing = await prisma.userSubscription.findUnique({
    where: { stripeSubscriptionId },
  });

  if (existing) {
    console.log('[Webhook/Subscription] Subscription already exists, skipping duplicate');
    return;
  }

  try {
    // Retrieve the Stripe Subscription to get period dates
    const stripe = getStripeClient();
    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    const { currentPeriodStart, currentPeriodEnd } = getSubscriptionPeriodDates(stripeSubscription);

    await createUserSubscription({
      userId,
      planId,
      stripeSubscriptionId,
      stripeCustomerId,
      currentPeriodStart,
      currentPeriodEnd,
    });

    // Also ensure user has stripeCustomerId saved
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId },
    });

    // Add initial credits for the first billing period
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (plan && plan.creditsMonthly > 0) {
      // Use the first invoice ID as payment reference for idempotency
      let paymentId = `sub_initial_${stripeSubscriptionId}`;
      try {
        const invoices = await stripe.invoices.list({
          subscription: stripeSubscriptionId,
          limit: 1,
        });
        if (invoices.data[0]?.id) {
          paymentId = invoices.data[0].id;
        }
      } catch {
        // Invoice listing failed — use fallback payment ID
      }

      try {
        await addCredits(userId, plan.creditsMonthly, {
          type: 'subscription_renewal',
          stripePaymentId: paymentId,
          description: `Assinatura ativada — ${plan.name}`,
        });
        console.log(
          `[Webhook/Subscription] Initial credits added: ${plan.creditsMonthly} for plan=${plan.name}`,
        );
      } catch (err: unknown) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          console.log('[Webhook/Subscription] Duplicate initial credit add, skipping');
        } else {
          throw err;
        }
      }
    }

    console.log(
      `[Webhook/Subscription] Subscription created userId=${userId} planId=${planId} stripeSubId=${stripeSubscriptionId}`,
    );
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      console.log('[Webhook/Subscription] Duplicate subscription creation, skipping');
    } else {
      console.error(
        '[Webhook/Subscription] Error creating subscription:',
        err instanceof Error ? err.message : 'Unknown',
      );
    }
  }
}

// ─── Handler: Invoice Payment Succeeded ──────────────────────────────────────

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = getInvoiceSubscriptionId(invoice);

  if (!stripeSubscriptionId) {
    // Not a subscription invoice, skip
    return;
  }

  const isInitialInvoice = invoice.billing_reason === 'subscription_create';

  // Find the user subscription
  let userSub = await prisma.userSubscription.findUnique({
    where: { stripeSubscriptionId },
    include: { plan: true },
  });

  // If subscription record doesn't exist yet (initial invoice arrived before checkout.session.completed)
  if (!userSub && isInitialInvoice) {
    console.log('[Webhook/Invoice] Subscription not found for initial invoice, creating from Stripe metadata');
    try {
      const stripe = getStripeClient();
      const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

      const userId = stripeSub.metadata?.userId;
      const planId = stripeSub.metadata?.planId;
      const stripeCustomerId =
        typeof stripeSub.customer === 'string' ? stripeSub.customer : null;

      if (userId && planId && stripeCustomerId) {
        const { currentPeriodStart, currentPeriodEnd } = getSubscriptionPeriodDates(stripeSub);

        try {
          await createUserSubscription({
            userId,
            planId,
            stripeSubscriptionId,
            stripeCustomerId,
            currentPeriodStart,
            currentPeriodEnd,
          });

          await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId },
          });

          userSub = await prisma.userSubscription.findUnique({
            where: { stripeSubscriptionId },
            include: { plan: true },
          });

          console.log(
            `[Webhook/Invoice] Subscription created from invoice handler userId=${userId} planId=${planId}`,
          );
        } catch (err: unknown) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            // Created by concurrent checkout.session.completed — refetch
            userSub = await prisma.userSubscription.findUnique({
              where: { stripeSubscriptionId },
              include: { plan: true },
            });
          } else {
            console.error('[Webhook/Invoice] Error creating subscription from invoice:', err instanceof Error ? err.message : 'Unknown');
          }
        }
      }
    } catch (err) {
      console.error('[Webhook/Invoice] Error retrieving Stripe subscription:', err instanceof Error ? err.message : 'Unknown');
    }
  }

  if (!userSub) {
    if (!isInitialInvoice) {
      console.error(
        `[Webhook/Invoice] No subscription found for stripeSubscriptionId=${stripeSubscriptionId}`,
      );
    }
    return;
  }

  // Add credits (works for both initial and renewal invoices)
  if (userSub.plan.creditsMonthly > 0 && invoice.id) {
    try {
      const description = isInitialInvoice
        ? `Assinatura ativada — ${userSub.plan.name}`
        : `Renovação mensal — ${userSub.plan.name}`;

      await addCredits(userSub.userId, userSub.plan.creditsMonthly, {
        type: 'subscription_renewal',
        stripePaymentId: invoice.id,
        description,
      });
      console.log(
        `[Webhook/Invoice] ${isInitialInvoice ? 'Initial' : 'Renewal'} credits added: ${userSub.plan.creditsMonthly} for userId=${userSub.userId} plan=${userSub.plan.name}`,
      );
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        console.log('[Webhook/Invoice] Duplicate invoice credit add, skipping');
      } else {
        console.error(
          '[Webhook/Invoice] Error adding credits:',
          err instanceof Error ? err.message : 'Unknown',
        );
      }
    }
  }

  // Update subscription status to ACTIVE (in case it was PAST_DUE)
  try {
    await updateUserSubscriptionByStripeId(stripeSubscriptionId, {
      status: 'ACTIVE',
    });
  } catch (err) {
    console.error(
      '[Webhook/Invoice] Error updating subscription status:',
      err instanceof Error ? err.message : 'Unknown',
    );
  }
}

// ─── Handler: Invoice Payment Failed ─────────────────────────────────────────

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = getInvoiceSubscriptionId(invoice);

  if (!stripeSubscriptionId) {
    return;
  }

  try {
    await updateUserSubscriptionByStripeId(stripeSubscriptionId, {
      status: 'PAST_DUE',
    });
    console.log(
      `[Webhook/Invoice] Subscription marked PAST_DUE stripeSubId=${stripeSubscriptionId}`,
    );
  } catch (err) {
    console.error(
      '[Webhook/Invoice] Error marking subscription as PAST_DUE:',
      err instanceof Error ? err.message : 'Unknown',
    );
  }
}

// ─── Handler: Subscription Updated ──────────────────────────────────────────

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const stripeSubscriptionId = subscription.id;

  // Map Stripe status to our enum
  const statusMap: Record<string, 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'PAUSED'> = {
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    paused: 'PAUSED',
  };

  const status = statusMap[subscription.status];
  if (!status) {
    console.log(`[Webhook/SubUpdate] Unhandled subscription status: ${subscription.status}`);
    return;
  }

  const { currentPeriodStart, currentPeriodEnd } = getSubscriptionPeriodDates(subscription);

  // Check if plan changed (subscription item price changed)
  const stripePriceId = subscription.items.data[0]?.price?.id;
  let planId: string | undefined;

  if (stripePriceId) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { stripePriceId },
    });
    if (plan) {
      planId = plan.id;
    }
  }

  try {
    await updateUserSubscriptionByStripeId(stripeSubscriptionId, {
      status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      ...(planId && { planId }),
    });
    console.log(
      `[Webhook/SubUpdate] Subscription updated stripeSubId=${stripeSubscriptionId} status=${status} cancelAtPeriodEnd=${subscription.cancel_at_period_end}`,
    );
  } catch (err) {
    console.error(
      '[Webhook/SubUpdate] Error updating subscription:',
      err instanceof Error ? err.message : 'Unknown',
    );
  }
}

// ─── Handler: Subscription Deleted ──────────────────────────────────────────

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const stripeSubscriptionId = subscription.id;

  try {
    await updateUserSubscriptionByStripeId(stripeSubscriptionId, {
      status: 'CANCELED',
      cancelAtPeriodEnd: false,
    });
    console.log(
      `[Webhook/SubDeleted] Subscription canceled stripeSubId=${stripeSubscriptionId}`,
    );
  } catch (err) {
    console.error(
      '[Webhook/SubDeleted] Error canceling subscription:',
      err instanceof Error ? err.message : 'Unknown',
    );
  }
}
