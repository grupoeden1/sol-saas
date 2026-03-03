'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { formatBalance } from '@/lib/format-balance';

// ─── Context ───────────────────────────────────────────────────────────────

interface CreditsContextValue {
  credits: number;
  updateCredits: (newCredits: number) => void;
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
  const [credits, setCredits] = useState(initialCredits);
  const formatted = formatBalance(credits);

  const updateCredits = useCallback((newCredits: number) => {
    setCredits(newCredits);
  }, []);

  return (
    <CreditsContext.Provider value={{ credits, updateCredits, formatted }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits(): CreditsContextValue {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error('useCredits must be used within CreditsProvider');
  return ctx;
}
