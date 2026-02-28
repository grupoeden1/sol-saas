'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { formatBalance } from '@/lib/format-balance';

// ─── Context ───────────────────────────────────────────────────────────────

interface CreditsContextValue {
  balanceCents: number;
  updateCredits: (newBalanceCents: number) => void;
  formatted: string;
}

const CreditsContext = createContext<CreditsContextValue | null>(null);

export function CreditsProvider({
  initialCredits,
  children,
}: {
  initialCredits: number;
  children: React.ReactNode;
}) {
  const [balanceCents, setBalanceCents] = useState(initialCredits);
  const formatted = formatBalance(balanceCents);

  const updateCredits = useCallback((newBalanceCents: number) => {
    setBalanceCents(newBalanceCents);
  }, []);

  return (
    <CreditsContext.Provider value={{ balanceCents, updateCredits, formatted }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits(): CreditsContextValue {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error('useCredits must be used within CreditsProvider');
  return ctx;
}
