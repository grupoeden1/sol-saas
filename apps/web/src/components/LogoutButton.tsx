'use client';

import { signOut } from '@/lib/auth';

export default function LogoutButton() {
  const handleLogout = async () => {
    await signOut();
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
