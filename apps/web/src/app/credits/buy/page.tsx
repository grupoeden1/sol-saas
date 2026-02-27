import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CREDIT_PACKAGES, formatPrice } from '@/lib/credits-config';
import BuyButton from './components/BuyButton';

export default async function BuyCreditsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

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
      </div>

      {/* Pricing Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {CREDIT_PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            className={`relative rounded-2xl p-6 flex flex-col gap-4 transition-all ${
              pkg.popular
                ? 'border-2 border-solar-500/60 bg-background-secondary shadow-lg shadow-solar-500/10 scale-[1.02]'
                : 'border border-solar-800/20 bg-background-secondary hover:border-solar-500/30'
            }`}
          >
            {/* Popular Badge */}
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-solar-500 px-4 py-1 text-xs font-bold uppercase tracking-wider text-background">
                Mais popular
              </div>
            )}

            {/* Package Name */}
            <div>
              <h2 className="mb-1 text-xl font-bold text-foreground">{pkg.label}</h2>
              <p className="text-sm text-foreground-muted">{pkg.description}</p>
            </div>

            {/* Price */}
            <div>
              <span className="text-3xl font-bold text-solar-300">{formatPrice(pkg.price)}</span>
            </div>

            {/* Features */}
            <ul className="flex-1 space-y-3">
              <li className="flex items-center gap-2 text-sm text-foreground-muted">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-solar-400">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Aproximadamente {pkg.scriptsEstimate}
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

            {/* Buy Button */}
            <BuyButton packageId={pkg.id} />
          </div>
        ))}
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
