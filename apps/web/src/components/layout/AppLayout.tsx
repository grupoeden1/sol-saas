import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import Link from 'next/link';
import Logo from '../Logo';
import LogoWithText from '../LogoWithText';
import LogoutButton from '../LogoutButton';
import CreditsBadge from './CreditsBadge';
import { CreditsProvider } from './CreditsProvider';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  let initialCredits = 0;
  let isAdmin = false;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { credits: true, role: true },
    });
    initialCredits = user?.credits ?? 0;
    isAdmin = user?.role === 'ADMIN';
  }

  return (
    <CreditsProvider initialCredits={initialCredits}>
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute inset-0 z-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-solar-500/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-0 z-0 opacity-10 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-solar-600/20 via-transparent to-transparent" />

        {session?.user?.email && (
          <header className="fixed left-0 right-0 top-4 z-50 mx-auto flex h-14 w-[calc(100%-2rem)] max-w-5xl items-center justify-between rounded-full border border-solar-800/30 bg-background-secondary/70 px-4 backdrop-blur-xl md:px-6">
            {/* Logo — always visible on the left */}
            <Link href="/dashboard" className="flex shrink-0 items-center gap-2 text-solar-300 transition-all hover:opacity-80">
              <Logo size={28} />
              <LogoWithText height={16} className="hidden sm:block" />
            </Link>

            {/* Center nav links */}
            <nav className="hidden items-center gap-1 md:flex">
              <Link
                href="/roteiros"
                className="rounded-full px-3 py-1.5 text-xs font-medium text-solar-300/70 transition-all hover:bg-solar-500/10 hover:text-solar-300"
              >
                Meus Roteiros
              </Link>
              <Link
                href="/quiz"
                className="rounded-full px-3 py-1.5 text-xs font-medium text-solar-300/70 transition-all hover:bg-solar-500/10 hover:text-solar-300"
              >
                Novo Roteiro
              </Link>
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <CreditsBadge />
              <Link
                href="/credits/buy"
                className="hidden rounded-full bg-solar-500/10 px-3 py-1.5 text-xs font-medium text-solar-300 transition-all hover:bg-solar-500/20 md:inline-flex"
              >
                Comprar créditos
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="hidden rounded-full border border-solar-500/30 px-3 py-1.5 text-xs font-medium text-solar-400 transition-all hover:bg-solar-500/10 md:inline-flex"
                >
                  Admin
                </Link>
              )}
              <LogoutButton />
            </div>
          </header>
        )}

        <main className="relative z-10 flex-1 pt-20">{children}</main>
      </div>
    </CreditsProvider>
  );
}
