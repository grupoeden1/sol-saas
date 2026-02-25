'use client';

import { createContext, useContext, useState } from 'react';

interface CreditsContextValue {
  credits: number;
  updateCredits: (newCredits: number) => void;
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

  return (
    <CreditsContext.Provider value={{ credits, updateCredits: setCredits }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits(): CreditsContextValue {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error('useCredits must be used within CreditsProvider');
  return ctx;
}
