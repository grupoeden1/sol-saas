'use client';

import { useCredits } from './CreditsProvider';

export default function CreditsBadge() {
  const { balanceCents, formatted } = useCredits();
  const hasCredits = balanceCents > 0;

  return (
    <div
      aria-label={`${formatted} restantes`}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-all ${
        hasCredits
          ? 'bg-solar-500/10 text-solar-300'
          : 'bg-red-500/20 text-red-400'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 2L14.09 8.26L20.18 8.27L15.18 12.14L16.82 18.27L12 14.77L7.18 18.27L8.82 12.14L3.82 8.27L9.91 8.26L12 2Z"
          fill="currentColor"
          opacity="0.9"
        />
      </svg>
      <span>{formatted}</span>
    </div>
  );
}
