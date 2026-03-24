import { prisma } from './index'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CreatePlanInput {
  name: string
  creditsMonthly: number
  priceInCents: number
  sortOrder?: number
  stripeProductId: string
  stripePriceId: string
}

export interface UpdatePlanInput {
  name?: string
  creditsMonthly?: number
  priceInCents?: number
  sortOrder?: number
  stripePriceId?: string // new Stripe Price ID if price changed
}

// ─── List all plans ────────────────────────────────────────────────────────

export async function listPlans() {
  return prisma.subscriptionPlan.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { subscriptions: { where: { status: 'ACTIVE' } } } },
      stripeProductRecords: { orderBy: { createdAt: 'desc' } },
    },
  })
}

// ─── Get a single plan ─────────────────────────────────────────────────────

export async function getPlanById(id: string) {
  return prisma.subscriptionPlan.findUnique({
    where: { id },
    include: {
      _count: { select: { subscriptions: { where: { status: 'ACTIVE' } } } },
      stripeProductRecords: { orderBy: { createdAt: 'desc' } },
    },
  })
}

// ─── Get active plans (for public listing) ─────────────────────────────────

export async function getActivePlans() {
  return prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      creditsMonthly: true,
      priceInCents: true,
      stripePriceId: true,
      sortOrder: true,
    },
  })
}

// ─── Create plan in DB (after Stripe provisioning) ─────────────────────────

export async function createPlanInDb(data: CreatePlanInput) {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.subscriptionPlan.create({
      data: {
        name: data.name,
        creditsMonthly: data.creditsMonthly,
        priceInCents: data.priceInCents,
        sortOrder: data.sortOrder ?? 0,
        stripeProductId: data.stripeProductId,
        stripePriceId: data.stripePriceId,
        active: false,
      },
    })

    await tx.stripeProductRecord.create({
      data: {
        planId: plan.id,
        stripeProductId: data.stripeProductId,
        stripePriceId: data.stripePriceId,
        priceInCents: data.priceInCents,
        status: 'ACTIVE',
      },
    })

    return plan
  })
}

// ─── Update plan in DB (handles price change records) ──────────────────────

export async function updatePlanInDb(id: string, data: UpdatePlanInput) {
  return prisma.$transaction(async (tx) => {
    // If price changed, archive old record and create new one
    if (data.stripePriceId && data.priceInCents) {
      await tx.stripeProductRecord.updateMany({
        where: { planId: id, status: 'ACTIVE' },
        data: { status: 'ARCHIVED' },
      })

      const plan = await tx.subscriptionPlan.findUniqueOrThrow({ where: { id } })

      await tx.stripeProductRecord.create({
        data: {
          planId: id,
          stripeProductId: plan.stripeProductId!,
          stripePriceId: data.stripePriceId,
          priceInCents: data.priceInCents,
          status: 'ACTIVE',
        },
      })
    }

    return tx.subscriptionPlan.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.creditsMonthly !== undefined && { creditsMonthly: data.creditsMonthly }),
        ...(data.priceInCents !== undefined && { priceInCents: data.priceInCents }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.stripePriceId !== undefined && { stripePriceId: data.stripePriceId }),
      },
    })
  })
}

// ─── Toggle plan active/inactive ───────────────────────────────────────────

export async function togglePlanActive(id: string, active: boolean) {
  if (active) {
    const plan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { id } })
    if (!plan.stripeProductId || !plan.stripePriceId) {
      throw new Error('Cannot activate plan without Stripe Product and Price configured')
    }
  }

  return prisma.subscriptionPlan.update({
    where: { id },
    data: { active },
  })
}

// ─── Get user subscription with plan details ───────────────────────────────

export async function getUserSubscription(userId: string) {
  return prisma.userSubscription.findUnique({
    where: { userId },
    include: { plan: true },
  })
}

// ─── Create user subscription record ───────────────────────────────────────

export async function createUserSubscription(data: {
  userId: string
  planId: string
  stripeSubscriptionId: string
  stripeCustomerId: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
}) {
  return prisma.userSubscription.create({
    data: {
      userId: data.userId,
      planId: data.planId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      stripeCustomerId: data.stripeCustomerId,
      status: 'ACTIVE',
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
    },
  })
}

// ─── Update user subscription from webhook ─────────────────────────────────

export async function updateUserSubscriptionByStripeId(
  stripeSubscriptionId: string,
  data: {
    status?: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'PAUSED'
    currentPeriodStart?: Date
    currentPeriodEnd?: Date
    cancelAtPeriodEnd?: boolean
    planId?: string
  },
) {
  return prisma.userSubscription.update({
    where: { stripeSubscriptionId },
    data,
  })
}
