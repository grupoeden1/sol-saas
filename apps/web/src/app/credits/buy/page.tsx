import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@sol/db';
import { formatPrice } from '@/lib/credits-config';
import BuyButton from './components/BuyButton';

interface BuyCreditsPageProps {
  searchParams: Promise<{ campaign?: string; offer?: string }>;
}

export default async function BuyCreditsPage({ searchParams }: BuyCreditsPageProps) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const campaignId = resolvedParams?.campaign;

  // Buscar pacotes ativos, user, e campanha (se houver)
  const [packages, user, campaign] = await Promise.all([
    prisma.creditPackage.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.user.findUnique({
      where: { email: session.user?.email ?? '' },
      select: { stripeCustomerId: true },
    }),
    campaignId
      ? prisma.promoCampaign.findUnique({
          where: { id: campaignId },
          select: { id: true, title: true, discountPercent: true, status: true, offerId: true },
        })
      : null,
  ]);

  // User has payment method if they have a Stripe Customer ID
  const hasPaymentMethod = !!user?.stripeCustomerId;

  // Only apply discount if campaign is active and has a discount
  const activeCampaign =
    campaign && campaign.status === 'ACTIVE' && campaign.discountPercent
      ? campaign
      : null;
  const discountPercent = activeCampaign?.discountPercent ?? 0;

  // O pacote "popular" é o segundo (Pro) — sortOrder=1
  const popularIndex = 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-xl bg-solar-500/10 p-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2L14.09 8.26L20.18 8.27L15.18 12.14L16.82 18.27L12 14.77L7.18 18.27L8.82 12.14L3.82 8.27L9.91 8.26L12 2Z"
                fill="#f59e0b"
                opacity="0.9"
              />
            </svg>
          </div>
        </div>
        <h1 className="mb-2 text-3xl font-bold text-solar-300">Comprar Créditos</h1>
        <p className="text-foreground-muted">
          Escolha o pacote ideal para você. Os créditos não expiram.
        </p>
        {activeCampaign && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-green-500/15 px-4 py-1.5 text-sm font-semibold text-green-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            {activeCampaign.discountPercent}% OFF — {activeCampaign.title}
          </div>
        )}
        {hasPaymentMethod && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-solar-400/80">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Compra com 1 clique disponível — cartão salvo
          </p>
        )}
      </div>

      {/* Pricing Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {packages.map((pkg, index) => {
          const isPopular = index === popularIndex;
          const hasDiscount = discountPercent > 0;
          const discountedPrice = hasDiscount
            ? Math.round(pkg.priceBrl * (1 - discountPercent / 100))
            : pkg.priceBrl;

          return (
            <div
              key={pkg.id}
              className={`relative rounded-2xl p-6 flex flex-col gap-4 transition-all ${
                isPopular
                  ? 'border-2 border-solar-500/60 bg-background-secondary shadow-lg shadow-solar-500/10 scale-[1.02]'
                  : 'border border-solar-800/20 bg-background-secondary hover:border-solar-500/30'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-solar-500 px-4 py-1 text-xs font-bold uppercase tracking-wider text-background">
                  Mais popular
                </div>
              )}

              {hasDiscount && (
                <div className="absolute -top-3 right-4 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white">
                  -{discountPercent}%
                </div>
              )}

              <div>
                <h2 className="mb-1 text-xl font-bold text-foreground">{pkg.name}</h2>
                <p className="text-sm text-foreground-muted">{pkg.description}</p>
              </div>

              <div>
                {hasDiscount ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-green-400">{formatPrice(discountedPrice)}</span>
                    <span className="text-lg text-foreground-muted/50 line-through">{formatPrice(pkg.priceBrl)}</span>
                  </div>
                ) : (
                  <span className="text-3xl font-bold text-solar-300">{formatPrice(pkg.priceBrl)}</span>
                )}
              </div>

              <ul className="flex-1 space-y-3">
                <li className="flex items-center gap-2 text-sm text-foreground-muted">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-solar-400">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {pkg.credits} créditos
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground-muted">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-solar-400">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Pagamento via cartão de crédito
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground-muted">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-solar-400">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Créditos sem prazo de expiração
                </li>
              </ul>

              <BuyButton
                packageId={pkg.id}
                hasPaymentMethod={hasPaymentMethod}
                campaignId={activeCampaign?.id}
              />
            </div>
          );
        })}
      </div>

      {/* Stripe Disclaimer */}
      <div className="mt-10 flex items-center justify-center gap-2 text-center text-xs text-foreground-muted/60">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>Pagamento processado com segurança pelo Stripe.</span>
      </div>
    </div>
  );
}
