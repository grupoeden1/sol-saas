import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';

const features = [
  {
    title: 'Chat com IA',
    description: 'Converse com sua mentora de criativos e receba scripts personalizados em segundos.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    href: '/chat',
  },
  {
    title: 'Sistema de Créditos',
    description: 'Cada mensagem usa 1 crédito. Compre pacotes conforme sua necessidade.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L14.09 8.26L20.18 8.27L15.18 12.14L16.82 18.27L12 14.77L7.18 18.27L8.82 12.14L3.82 8.27L9.91 8.26L12 2Z" />
      </svg>
    ),
    href: '/credits/buy',
  },
  {
    title: 'Histórico de Conversas',
    description: 'Acesse todas as suas conversas e scripts gerados a qualquer momento.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    href: '/chat',
  },
];

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      {/* Welcome Card */}
      <div className="mb-8 rounded-2xl border border-solar-800/20 bg-background-secondary p-8 solar-glow">
        <div className="flex items-start gap-4">
          <div className="hidden rounded-xl bg-solar-500/10 p-3 sm:block">
            <Logo size={32} />
          </div>
          <div>
            <h1 className="mb-1 text-2xl font-bold text-solar-300 md:text-3xl">
              Bem-vindo ao SOL!
            </h1>
            <p className="text-foreground-muted">
              Você está autenticado como:{' '}
              <strong className="text-foreground">{session.user?.email}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">O que você pode fazer</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((feature, i) => (
            <Link
              key={i}
              href={feature.href}
              className="group rounded-xl border border-solar-800/20 bg-background-secondary p-6 transition-all hover:border-solar-500/30 hover:bg-solar-500/5"
            >
              <div className="mb-3 inline-flex rounded-lg bg-solar-500/10 p-2.5 text-solar-400 transition-all group-hover:bg-solar-500/20">
                {feature.icon}
              </div>
              <h3 className="mb-1 font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-foreground-muted">{feature.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Main CTA */}
      <div className="text-center">
        <Link
          href="/chat"
          className="group inline-flex items-center gap-2 rounded-xl bg-solar-500 px-8 py-3.5 text-base font-semibold text-background transition-all hover:bg-solar-600 hover:shadow-lg hover:shadow-solar-500/25"
        >
          Ir para o chat
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
