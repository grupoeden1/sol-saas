'use client';

import { useState, useEffect, useRef } from 'react';
import { formatPrice } from '@/lib/credits-config';

interface UpsellData {
  campaign: {
    id: string;
    title: string;
    discountPercent: number | null;
  };
  package: {
    id: string;
    name: string;
    credits: number;
    priceBrl: number;
    discountedPrice: number;
  };
}

export default function UpsellBanner() {
  const [data, setData] = useState<UpsellData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/upsell/active');
        if (!res.ok) return;
        const json = await res.json();
        if (json.campaign) {
          setData(json);
        }
      } catch {
        // silent
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!data || dismissed) return null;

  const { campaign, package: pkg } = data;
  const hasDiscount = campaign.discountPercent && campaign.discountPercent > 0;

  async function handleBuy() {
    setPurchasing(true);
    setError(null);

    try {
      const res = await fetch('/api/payments/one-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: pkg.id,
          campaignId: campaign.id,
        }),
      });

      const result = await res.json() as {
        success?: boolean;
        error?: string;
        fallbackUrl?: string;
        message?: string;
      };

      // No saved payment method — fallback to checkout
      if (result.error === 'no_payment_method' || result.error === 'authentication_required') {
        window.location.href = `/credits/buy?campaign=${campaign.id}`;
        return;
      }

      if (!res.ok || !result.success) {
        setError(result.message ?? result.error ?? 'Erro no pagamento');
        return;
      }

      // Success — redirect to dashboard with success banner
      window.location.href = '/dashboard?payment=success';
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setPurchasing(false);
    }
  }

  function handleDismiss() {
    setDismissed(true);

    // Track dismissal via PromoDelivery
    fetch('/api/promos/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: campaign.id, event: 'dismissed' }),
    }).catch(() => {});
  }

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border border-solar-500/30 bg-gradient-to-r from-solar-500/10 to-amber-500/10 p-4">
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded-lg p-1 text-foreground-muted/60 transition-colors hover:text-foreground-muted"
        aria-label="Fechar"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-solar-500/20">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-solar-400">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {campaign.title}
          </p>
          <div className="mt-0.5 flex items-baseline gap-2">
            {hasDiscount ? (
              <>
                <span className="text-sm font-bold text-green-400">{formatPrice(pkg.discountedPrice)}</span>
                <span className="text-xs text-foreground-muted/50 line-through">{formatPrice(pkg.priceBrl)}</span>
                <span className="rounded-full bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-400">
                  -{campaign.discountPercent}%
                </span>
              </>
            ) : (
              <span className="text-sm font-bold text-solar-300">{formatPrice(pkg.priceBrl)}</span>
            )}
            <span className="text-xs text-foreground-muted">
              · {pkg.credits} créditos
            </span>
          </div>
          {error && (
            <p className="mt-1 text-xs text-red-400">{error}</p>
          )}
        </div>

        <button
          onClick={handleBuy}
          disabled={purchasing}
          className="shrink-0 rounded-lg bg-solar-500 px-4 py-2 text-xs font-semibold text-black transition-all hover:bg-solar-400 disabled:opacity-50 flex items-center gap-1.5"
        >
          {purchasing ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-black/30 border-t-black" />
              Processando...
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              Comprar agora
            </>
          )}
        </button>
      </div>
    </div>
  );
}
