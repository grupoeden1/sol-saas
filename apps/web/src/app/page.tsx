'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import Logo from '@/components/Logo';
import LogoWithText from '@/components/LogoWithText';

const LottieLogo = dynamic(() => import('@/components/LottieLogo'), {
  ssr: false,
  loading: () => <Logo size={120} className="opacity-50" />,
});

const features = [
  {
    title: 'Scripts Personalizados',
    description: 'Criativos únicos gerados pela IA, baseados no seu produto, público e contexto específico.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    title: 'Streaming em Tempo Real',
    description: 'Veja a IA construir seu script token a token, como uma conversa ao vivo com seu mentor.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: 'Sem Criativos Genéricos',
    description: 'Diferêncie-se no mercado. Chega de copiar estruturas que centenas de alunos já usam.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="bg-gradient-animated min-h-screen">
      {/* Navigation */}
      <nav className="fixed left-0 right-0 top-4 z-50 mx-auto flex h-14 w-[calc(100%-2rem)] max-w-5xl items-center justify-between rounded-full border border-solar-800/30 bg-[#1a1a1a]/70 px-4 backdrop-blur-xl md:px-6">
        <div className="flex-1" />
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
          <div className="flex items-center gap-2 text-solar-300">
            <Logo size={32} />
            <LogoWithText height={18} className="hidden sm:block" />
          </div>
        </div>
        <div className="flex flex-1 justify-end">
          <Link href="/login" className="rounded-full bg-solar-500/10 px-4 py-1.5 text-xs font-medium text-solar-300 transition-all hover:bg-solar-500/20">
            Entrar
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pt-32 text-center md:pt-40">
        <div className="relative mb-8">
          <div className="absolute inset-0 -z-10 blur-3xl">
            <div className="mx-auto h-32 w-32 rounded-full bg-solar-500/20" />
          </div>
          <LottieLogo size={140} />
        </div>

        <h1 className="mb-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
          <span className="text-foreground">Seu mentor de</span>{' '}
          <span className="text-solar-gradient">criativos com IA</span>
        </h1>

        <p className="mb-10 max-w-xl text-lg leading-relaxed text-foreground-muted md:text-xl">
          Crie scripts de criativos personalizados para conteúdos orgânicos e pagos em minutos.
          Pare de competir com criativos genéricos.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Link href="/register" className="group relative inline-flex items-center gap-2 rounded-xl bg-solar-500 px-8 py-3.5 text-base font-semibold text-background transition-all hover:bg-solar-600 hover:shadow-lg hover:shadow-solar-500/25">
            Começar agora
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-solar-800/50 px-8 py-3.5 text-base font-medium text-foreground-muted transition-all hover:border-solar-500/30 hover:text-foreground">
            Já tenho conta
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-24 md:pt-32">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, i) => (
            <div key={i} className="glass-card group rounded-2xl p-6 transition-all hover:border-solar-500/30 hover:bg-solar-500/5">
              <div className="mb-4 inline-flex rounded-xl bg-solar-500/10 p-3 text-solar-400 transition-all group-hover:bg-solar-500/20">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-foreground-muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <section className="border-t border-solar-800/20 px-6 py-16 text-center">
        <p className="mb-6 text-foreground-muted">Usado por alunos do Space para criar criativos que convertem.</p>
        <div className="flex items-center justify-center gap-2 text-sm text-foreground-muted/50">
          <div className="flex items-center gap-1.5 opacity-40">
            <Logo size={16} />
            <LogoWithText height={10} />
          </div>
          <span>— Eden Corporate</span>
        </div>
      </section>
    </div>
  );
}
