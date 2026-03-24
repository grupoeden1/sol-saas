'use client';

import { useState, useEffect } from 'react';

interface BuyButtonProps {
  packageId: string;
  hasPaymentMethod?: boolean;
  campaignId?: string;
}

export default function BuyButton({ packageId, hasPaymentMethod: initialHasPM, campaignId }: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(initialHasPM ?? false);

  useEffect(() => {
    if (initialHasPM !== undefined) {
      setHasPaymentMethod(initialHasPM);
    }
  }, [initialHasPM]);

  const handleOneClick = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/payments/one-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, ...(campaignId ? { campaignId } : {}) }),
      });

      const data = await res.json() as {
        success?: boolean;
        credits?: number;
        newBalance?: number;
        error?: string;
        fallbackUrl?: string;
        message?: string;
      };

      if (data.error === 'no_payment_method' || data.error === 'authentication_required') {
        setHasPaymentMethod(false);
        await handleCheckout();
        return;
      }

      if (!res.ok || !data.success) {
        setError(data.message ?? data.error ?? 'Erro no pagamento');
        return;
      }

      setSuccess(true);
      window.location.href = '/dashboard?payment=success';
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, ...(campaignId ? { campaignId } : {}) }),
      });

      const data = await res.json() as { sessionUrl?: string; error?: string };

      if (!res.ok || !data.sessionUrl) {
        setError(data.error ?? 'Erro ao iniciar pagamento. Tente novamente.');
        return;
      }

      window.location.href = data.sessionUrl;
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-green-500/10 py-2.5 text-sm font-semibold text-green-400">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17L4 12" />
        </svg>
        Compra realizada!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {hasPaymentMethod ? (
        <button
          onClick={handleOneClick}
          disabled={loading}
          className="w-full rounded-lg bg-solar-500 py-2.5 text-sm font-semibold text-background transition-all hover:bg-solar-600 hover:shadow-lg hover:shadow-solar-500/25 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              <span>Processando...</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              Comprar com 1 clique
            </>
          )}
        </button>
      ) : (
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full rounded-lg bg-solar-500 py-2.5 text-sm font-semibold text-background transition-all hover:bg-solar-600 hover:shadow-lg hover:shadow-solar-500/25 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              <span>Aguarde...</span>
            </>
          ) : (
            'Comprar'
          )}
        </button>
      )}
      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
