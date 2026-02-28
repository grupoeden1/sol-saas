import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function CreditsSuccessPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Success Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 pulse-glow">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-green-400">
              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className="mb-2 text-3xl font-bold text-foreground">Pagamento confirmado!</h1>
        <p className="mb-8 text-foreground-muted">
          Seus créditos foram adicionados à sua conta. Agora você pode voltar a criar criativos incríveis.
        </p>

        {/* Action Links */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/chat"
            className="group inline-flex items-center gap-2 rounded-xl bg-solar-500 px-6 py-3 text-sm font-semibold text-background transition-all hover:bg-solar-600 hover:shadow-lg hover:shadow-solar-500/25"
          >
            Ir para o chat
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-solar-800/30 px-6 py-3 text-sm font-medium text-foreground-muted transition-all hover:border-solar-500/30 hover:text-foreground"
          >
            Ir para o dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
