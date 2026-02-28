import Link from 'next/link';
import { formatBalance } from '@/lib/format-balance';

interface CreditSummaryProps {
  balanceCents: number;
}

export default function CreditSummary({ balanceCents }: CreditSummaryProps) {
  const showBuyPrompt = balanceCents < 1000; // < 10 créditos
  const hasCredits = balanceCents > 0;

  return (
    <div className="rounded-2xl border border-solar-800/20 bg-background-secondary p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-foreground-muted">Seu saldo</p>
          <p className={`mt-1 text-3xl font-bold ${hasCredits ? 'text-solar-300' : 'text-red-400'}`}>
            {formatBalance(balanceCents)}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${hasCredits ? 'bg-solar-500/10' : 'bg-red-500/10'}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2L14.09 8.26L20.18 8.27L15.18 12.14L16.82 18.27L12 14.77L7.18 18.27L8.82 12.14L3.82 8.27L9.91 8.26L12 2Z"
              fill="currentColor"
              className={hasCredits ? 'text-solar-400' : 'text-red-400'}
              opacity="0.9"
            />
          </svg>
        </div>
      </div>

      {showBuyPrompt && (
        <Link
          href="/credits/buy"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-solar-500 px-4 py-3 text-sm font-semibold text-background transition-all hover:bg-solar-600 hover:shadow-lg hover:shadow-solar-500/25"
        >
          Comprar mais créditos
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      )}
    </div>
  );
}
