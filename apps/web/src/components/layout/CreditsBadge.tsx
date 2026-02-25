'use client';

export default function CreditsBadge({ credits }: { credits: number }) {
  const isLow = credits === 0;

  return (
    <div
      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
        isLow
          ? 'bg-red-500/20 text-red-400 border border-red-500/50'
          : 'bg-solar-500/20 text-solar-300 border border-solar-500/50'
      }`}
    >
      🌟 {credits} {credits === 1 ? 'crédito' : 'créditos'}
    </div>
  );
}
