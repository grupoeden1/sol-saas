import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CREDIT_PACKAGES, formatPrice } from '@/lib/credits-config';
import BuyButton from './components/BuyButton';

export default async function BuyCreditsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="text-center">
        <div className="text-5xl mb-3">🌟</div>
        <h1 className="text-3xl font-bold text-solar-300 mb-2">Comprar Créditos</h1>
        <p className="text-foreground-muted">
          Cada crédito equivale a uma mensagem com a IA. Escolha o pacote ideal para você.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CREDIT_PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            className={`relative bg-background-secondary border rounded-xl p-6 flex flex-col gap-4 transition-all ${
              pkg.popular
                ? 'border-solar-500/60 shadow-lg shadow-solar-500/10'
                : 'border-solar-800/30'
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 bg-solar-500 text-background text-xs font-bold rounded-full uppercase tracking-wide">
                  Mais popular
                </span>
              </div>
            )}

            <div>
              <h2 className="text-xl font-bold text-foreground">{pkg.label}</h2>
              <p className="text-sm text-foreground-muted mt-1">{pkg.description}</p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-solar-300">{formatPrice(pkg.price)}</span>
            </div>

            <ul className="flex-1 space-y-2 text-sm text-foreground-muted">
              <li className="flex items-center gap-2">
                <span className="text-solar-400">✓</span>
                <span>{pkg.credits} créditos</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-solar-400">✓</span>
                <span>Pagamento via cartão de crédito</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-solar-400">✓</span>
                <span>Créditos sem prazo de expiração</span>
              </li>
            </ul>

            <BuyButton packageId={pkg.id} />
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-foreground-muted">
        Pagamento processado com segurança pelo Stripe. Seus créditos são adicionados automaticamente após a confirmação.
      </p>
    </div>
  );
}
