'use client';

import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <button
      onClick={handleLogout}
      className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20 focus-solar"
    >
      Sair
    </button>
  );
}
