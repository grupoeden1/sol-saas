import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import Link from 'next/link';
import LogoutButton from '../LogoutButton';
import CreditsBadge from './CreditsBadge';
import { CreditsProvider } from './CreditsProvider';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Buscar créditos apenas quando a sessão tem email válido
  let initialCredits = 0;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { credits: true },
    });
    initialCredits = user?.credits ?? 0;
  }

  // CreditsProvider sempre presente — chat/page.tsx (Client Component) depende do contexto
  return (
    <CreditsProvider initialCredits={initialCredits}>
      <div className="min-h-screen bg-background">
        {session?.user?.email && (
          <header className="h-16 bg-background-secondary shadow-lg border-b border-solar-800/30">
            <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
              <Link
                href="/dashboard"
                className="text-2xl font-bold text-solar-300 hover:text-solar-400 transition-colors flex items-center gap-2"
              >
                <span className="text-3xl">☀️</span>
                <span>SOL</span>
              </Link>

              <div className="flex items-center space-x-4">
                <CreditsBadge />
                <Link
                  href="/credits/buy"
                  className="text-sm text-foreground-muted hover:text-solar-300 transition-colors font-medium"
                >
                  Comprar créditos
                </Link>
                <LogoutButton />
              </div>
            </div>
          </header>
        )}

        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </div>
    </CreditsProvider>
  );
}
