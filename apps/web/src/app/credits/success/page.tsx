import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function CreditsSuccessPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="max-w-lg mx-auto py-8">
      <div className="bg-background-secondary border border-solar-800/30 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-10 text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h1 className="text-2xl font-bold text-solar-300">Pagamento confirmado!</h1>
          <p className="text-foreground-muted">
            Seus créditos serão adicionados à sua conta em instantes.
          </p>
          <p className="text-sm text-foreground-muted">
            Se os créditos não aparecerem em até 1 minuto, recarregue a página ou entre em contato com o suporte.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/chat"
              className="inline-flex items-center justify-center px-6 py-3 bg-solar-500/10 border border-solar-500/50 text-solar-300 rounded-lg font-semibold hover:bg-solar-500/20 transition-colors"
            >
              ☀️ Ir para o chat
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 border border-solar-800/30 text-foreground-muted rounded-lg hover:border-solar-800/50 transition-colors"
            >
              Ver meu saldo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
