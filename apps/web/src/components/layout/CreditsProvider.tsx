'use client';

import { createContext, useContext, useState, useCallback } from 'react';

// ─── Format balance for display ────────────────────────────────────────────

/**
 * Converte balanceCents para exibição amigável em "créditos".
 * Aluno nunca vê centavos, reais ou dólares — apenas "créditos".
 */
export function formatBalance(balanceCents: number): string {
  if (balanceCents <= 0) return '0 créditos';
  const credits = Math.floor(balanceCents / 100);
  if (credits === 0) return '< 1 crédito';
  return `${credits} crédito${credits !== 1 ? 's' : ''}`;
}

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
