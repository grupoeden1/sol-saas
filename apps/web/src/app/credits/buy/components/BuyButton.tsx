'use client';

import { useState } from 'react';

interface BuyButtonProps {
  packageId: string;
}

export default function BuyButton({ packageId }: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
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

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleBuy}
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
      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
