'use client';

import { useEffect, useState, useCallback } from 'react';

interface PromoCampaign {
  id: string;
  title: string;
  message: string;
  offerType: string;
  offerId: string | null;
  discountPercent: number | null;
}

interface PromoPopupProps {
  isStreaming?: boolean;
}

export default function PromoPopup({ isStreaming = false }: PromoPopupProps) {
  const [campaign, setCampaign] = useState<PromoCampaign | null>(null);
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(false); // max 1 per session

  useEffect(() => {
    if (shown || isStreaming) return;

    const fetchPromo = async () => {
      try {
        const res = await fetch('/api/promos/active');
        if (!res.ok) return;
        const data = await res.json();
        if (data.campaign) {
          setCampaign(data.campaign);
          setVisible(true);
          setShown(true);
          // Track viewed
          fetch('/api/promos/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId: data.campaign.id, event: 'viewed' }),
          }).catch(() => {});
        }
      } catch {
        // Silently fail — promo popup is not critical
      }
    };

    // Delay popup slightly to not interrupt initial page load
    const timer = setTimeout(fetchPromo, 2000);
    return () => clearTimeout(timer);
  }, [shown, isStreaming]);

  const handleClick = useCallback(() => {
    if (!campaign) return;
    fetch('/api/promos/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: campaign.id, event: 'clicked' }),
    }).catch(() => {});

    // Navigate to purchase with campaign ID for discount
    const params = new URLSearchParams();
    params.set('campaign', campaign.id);
    if (campaign.offerId) {
      params.set('offer', campaign.offerId);
    }
    window.location.href = `/credits/buy?${params.toString()}`;
  }, [campaign]);

  const handleDismiss = useCallback(() => {
    if (!campaign) return;
    fetch('/api/promos/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: campaign.id, event: 'dismissed' }),
    }).catch(() => {});
    setVisible(false);
  }, [campaign]);

  if (!visible || !campaign || isStreaming) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-solar-800/30 bg-background-secondary p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-background-tertiary hover:text-foreground"
          aria-label="Fechar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Discount badge */}
        {campaign.discountPercent && campaign.discountPercent > 0 && (
          <div className="mb-4 inline-flex rounded-full bg-solar-500/20 px-3 py-1 text-xs font-bold text-solar-400">
            {campaign.discountPercent}% OFF
          </div>
        )}

        <h3 className="mb-2 text-lg font-bold text-foreground">
          {campaign.title}
        </h3>

        <p className="mb-6 text-sm leading-relaxed text-foreground-muted">
          {campaign.message}
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleClick}
            className="flex-1 rounded-xl bg-solar-500 px-4 py-2.5 text-sm font-semibold text-background transition-all hover:bg-solar-600"
          >
            Aproveitar Oferta
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-xl border border-border-subtle px-4 py-2.5 text-sm font-medium text-foreground-muted transition-all hover:bg-background-tertiary"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
