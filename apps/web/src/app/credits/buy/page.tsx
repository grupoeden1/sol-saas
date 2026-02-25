import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function BuyCreditsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-background-secondary border border-solar-800/30 rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-8 text-center">
          <div className="text-6xl mb-4">🌟</div>
          <h2 className="text-2xl font-bold text-solar-300 mb-4">Comprar Créditos</h2>
          <p className="text-foreground-muted mb-6">
            O sistema de compra de créditos será implementado no <strong className="text-solar-300">Epic 3</strong>.
          </p>
          <p className="text-foreground-muted mb-8">
            Você poderá comprar pacotes de créditos via Stripe (cartão e PIX) em breve!
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 border border-solar-500/50 text-sm font-medium rounded-md text-solar-300 bg-solar-500/10 hover:bg-solar-500/20 transition-colors"
          >
            ← Voltar ao Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
