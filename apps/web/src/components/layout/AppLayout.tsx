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
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { balanceCents: true },
    });
    initialCredits = user?.balanceCents ?? 0;
  }

  return (
    <CreditsProvider initialCredits={initialCredits}>
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute inset-0 z-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-solar-500/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-0 z-0 opacity-10 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-solar-600/20 via-transparent to-transparent" />

        {session?.user?.email && (
          <header className="fixed left-0 right-0 top-4 z-50 mx-auto flex h-14 w-[calc(100%-2rem)] max-w-5xl items-center justify-between rounded-full border border-solar-800/30 bg-background-secondary/70 px-4 backdrop-blur-xl md:px-6">
            {/* Left spacer */}
            <div className="flex-1" />

            {/* Centered Logo */}
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
              <Link href="/dashboard" className="flex items-center gap-2 text-solar-300 transition-all hover:opacity-80">
                <Logo size={32} />
                <LogoWithText height={18} className="hidden sm:block" />
              </Link>
            </div>

            {/* Right actions */}
            <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
              <CreditsBadge />
              <Link
                href="/credits/buy"
                className="hidden rounded-full bg-solar-500/10 px-3 py-1.5 text-xs font-medium text-solar-300 transition-all hover:bg-solar-500/20 md:inline-flex"
              >
                Comprar créditos
              </Link>
              <LogoutButton />
            </div>
          </header>
        )}

        <main className="relative z-10 flex-1 pt-20">{children}</main>
      </div>
    </CreditsProvider>
  );
}
