'use client';

import { useState } from 'react';

interface OneClickBuyButtonProps {
  packageId: string;
  packageName: string;
  credits: number;
  price: number; // centavos BRL
  discountPercent?: number;
  campaignId?: string;
  hasPaymentMethod: boolean;
}

type PurchaseState = 'idle' | 'loading' | 'success' | 'error';

interface OneClickResponse {
  success?: boolean;
  credits?: number;
  newBalance?: number;
  error?: string;
  fallbackUrl?: string;
  message?: string;
}

export default function OneClickBuyButton({
  packageId,
  packageName,
  credits,
  price,
  discountPercent,
  campaignId,
  hasPaymentMethod,
}: OneClickBuyButtonProps) {
  const [state, setState] = useState<PurchaseState>('idle');
  const [feedback, setFeedback] = useState<string>('');

  const effectivePrice = discountPercent
    ? Math.round(price * (1 - discountPercent / 100))
    : price;

  const formattedPrice = (effectivePrice / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  async function handleOneClickBuy() {
    setState('loading');
    setFeedback('');

    try {
      const res = await fetch('/api/payments/one-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          ...(campaignId ? { campaignId } : {}),
        }),
      });

      const data: OneClickResponse = await res.json();

      if (data.error === 'no_payment_method' && data.fallbackUrl) {
        window.location.href = data.fallbackUrl;
        return;
      }

      if (data.error === 'authentication_required' && data.fallbackUrl) {
        setFeedback('Autenticacao necessaria. Redirecionando...');
        setState('error');
        setTimeout(() => {
          window.location.href = data.fallbackUrl!;
        }, 1500);
        return;
      }

      if (data.error) {
        setFeedback(data.message ?? 'Falha no pagamento. Tente novamente.');
        setState('error');
        return;
      }

      if (data.success) {
        setFeedback(
          `${credits} creditos adicionados! Novo saldo: ${data.newBalance ?? '—'}`,
        );
        setState('success');
      }
    } catch {
      setFeedback('Erro inesperado. Tente novamente.');
      setState('error');
    }
  }

  async function handleRegularCheckout() {
    setState('loading');
    setFeedback('');

    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });

      const data = (await res.json()) as { sessionUrl?: string; error?: string };

      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
        return;
      }

      setFeedback(data.error ?? 'Falha ao iniciar checkout.');
      setState('error');
    } catch {
      setFeedback('Erro inesperado. Tente novamente.');
      setState('error');
    }
  }

  const isDisabled = state === 'loading' || state === 'success';

  if (!hasPaymentMethod) {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleRegularCheckout}
          disabled={isDisabled}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-solar-500 px-6 py-3 text-sm font-semibold text-background transition-all hover:bg-solar-600 hover:shadow-lg hover:shadow-solar-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state === 'loading' ? (
            <LoadingSpinner />
          ) : (
            <>
              Comprar {packageName} — {formattedPrice}
            </>
          )}
        </button>
        {feedback && <FeedbackMessage state={state} message={feedback} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleOneClickBuy}
        disabled={isDisabled}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-solar-500 px-6 py-3 text-sm font-semibold text-background transition-all hover:bg-solar-600 hover:shadow-lg hover:shadow-solar-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state === 'loading' ? (
          <LoadingSpinner />
        ) : state === 'success' ? (
          <>
            <CheckIcon />
            Compra realizada!
          </>
        ) : (
          <>
            <BoltIcon />
            Comprar com 1 clique — {formattedPrice}
            {discountPercent ? (
              <span className="ml-1 rounded bg-solar-600/30 px-1.5 py-0.5 text-xs">
                -{discountPercent}%
              </span>
            ) : null}
          </>
        )}
      </button>
      {feedback && <FeedbackMessage state={state} message={feedback} />}
    </div>
  );
}

function FeedbackMessage({ state, message }: { state: PurchaseState; message: string }) {
  const colorClass = state === 'success' ? 'text-green-400' : 'text-red-400';
  return <p className={`text-xs ${colorClass}`}>{message}</p>;
}

function LoadingSpinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
