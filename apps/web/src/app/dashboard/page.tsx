import { auth } from '@/lib/auth';
import { prisma, getUserSubscription, getActivePlans, getReferralStats, validateReferralCode } from '@sol/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getReferralCookie, clearReferralCookie } from '@/lib/referral-cookie';
import CreditSummary from '@/components/dashboard/CreditSummary';
import TransactionHistory from '@/components/dashboard/TransactionHistory';
import ConversationList from '@/components/dashboard/ConversationList';
import PaymentSuccessBanner from '@/components/dashboard/PaymentSuccessBanner';
import SubscriptionManager from '@/components/dashboard/SubscriptionManager';
import ReferralSection from '@/components/dashboard/ReferralSection';
import PromoPopup from '@/components/dashboard/PromoPopup';
import NpsPopup from '@/components/dashboard/NpsPopup';
import UpsellBanner from '@/components/dashboard/UpsellBanner';

const PAGE_SIZE = 20;

interface DashboardPageProps {
  searchParams: Promise<{ page?: string; payment?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, credits: true },
  });

  if (!user) {
    redirect('/login');
  }

  // Process referral cookie if present (handles users who arrived via referral link and logged in)
  try {
    const refCode = await getReferralCookie();
    if (refCode) {
      // Only create PENDING reward if user doesn't already have one
      const existingReward = await prisma.referralReward.findFirst({
        where: { referredId: user.id },
        select: { id: true },
      });

      if (!existingReward) {
        const validation = await validateReferralCode(refCode, user.id);
        if (validation.valid && validation.referrerId) {
          await prisma.user.update({
            where: { id: user.id },
            data: { referredBy: validation.referrerId },
          });

          await prisma.referralReward.create({
            data: {
              referrerId: validation.referrerId,
              referredId: user.id,
              referrerCredits: 0,
              referredCredits: 0,
              status: 'PENDING',
            },
          });
        }
      }

      await clearReferralCookie();
    }
  } catch {
    // Referral processing must never block dashboard rendering
  }

  const resolvedParams = await searchParams;
  const page = Math.max(1, Number(resolvedParams?.page) || 1);
  const showPaymentSuccess = resolvedParams?.payment === 'success';

  const [totalCount, transactions, conversations, subscription, activePlans, subscriptionsEnabledConfig, referralEnabledConfig, referralStats] = await Promise.all([
    prisma.creditTransaction.count({ where: { userId: user.id } }),
    prisma.creditTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    }),
    getUserSubscription(user.id),
    getActivePlans(),
    prisma.pricingConfig.findUnique({ where: { key: 'SUBSCRIPTIONS_ENABLED' } }),
    prisma.pricingConfig.findUnique({ where: { key: 'REFERRAL_ENABLED' } }),
    getReferralStats(user.id),
  ]);

  const subscriptionsEnabled = (subscriptionsEnabledConfig?.value ?? 0) === 1;
  const referralEnabled = (referralEnabledConfig?.value ?? 0) === 1;

  // Show subscription section only if enabled by admin OR user already has one
  const showSubscriptions = subscriptionsEnabled || !!subscription;

  // Serialize referral stats for the client component
  const serializedReferralStats = referralStats
    ? {
        referralCode: referralStats.referralCode,
        totalReferrals: referralStats.totalReferrals,
        creditsEarned: referralStats.creditsEarned,
        referrals: referralStats.referrals.map((r) => ({
          maskedEmail: r.maskedEmail,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        })),
      }
    : null;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Serialize subscription dates for the client component
  const serializedSubscription = subscription
    ? {
        id: subscription.id,
        planId: subscription.planId,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart.toISOString(),
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        plan: {
          id: subscription.plan.id,
          name: subscription.plan.name,
          creditsMonthly: subscription.plan.creditsMonthly,
          priceInCents: subscription.plan.priceInCents,
        },
      }
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <PromoPopup />
      <NpsPopup />
      {showPaymentSuccess && <PaymentSuccessBanner />}
      <UpsellBanner />
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Painel</h1>
        <Link
          href="/quiz"
          className="group inline-flex items-center gap-2 rounded-xl bg-solar-500 px-5 py-2.5 text-sm font-semibold text-background transition-all hover:bg-solar-600 hover:shadow-lg hover:shadow-solar-500/25"
        >
          Novo Roteiro
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>

      <div className="mb-6">
        <CreditSummary credits={user.credits} />
      </div>

      {showSubscriptions && (
        <div className="mb-6">
          <SubscriptionManager
            subscription={serializedSubscription}
            availablePlans={activePlans}
          />
        </div>
      )}

      <div className="mb-6">
        <ReferralSection
          enabled={referralEnabled}
          referralCode={referralStats?.referralCode ?? null}
          initialStats={serializedReferralStats}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TransactionHistory
            transactions={transactions}
            currentPage={page}
            totalPages={totalPages}
          />
        </div>
        <div className="lg:col-span-1">
          <ConversationList conversations={conversations} />
        </div>
      </div>
    </div>
  );
}
