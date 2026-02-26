import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function CreditsErrorPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="max-w-lg mx-auto py-8">
      <div className="bg-background-secondary border border-solar-800/30 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-10 text-center space-y-4">
          <div className="text-6xl">⚠️</div>
          <h1 className="text-2xl font-bold text-foreground">Pagamento não concluído</h1>
          <p className="text-foreground-muted">
            O pagamento foi cancelado ou não pôde ser processado. Nenhum valor foi cobrado.
          </p>
          <p className="text-sm text-foreground-muted">
            Se acredita que houve um erro, tente novamente ou entre em contato com o suporte.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/credits/buy"
              className="inline-flex items-center justify-center px-6 py-3 bg-solar-500/10 border border-solar-500/50 text-solar-300 rounded-lg font-semibold hover:bg-solar-500/20 transition-colors"
            >
              Tentar novamente →
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center px-6 py-3 border border-solar-800/30 text-foreground-muted rounded-lg hover:border-solar-800/50 transition-colors"
            >
              ← Ir para o chat
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
