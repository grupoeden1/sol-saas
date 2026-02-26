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
        className="w-full px-6 py-3 bg-solar-500/10 border border-solar-500/50 text-solar-300 rounded-lg font-semibold hover:bg-solar-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-solar-300/30 border-t-solar-300 rounded-full animate-spin" />
            <span>Aguarde...</span>
          </>
        ) : (
          'Comprar →'
        )}
      </button>
      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
