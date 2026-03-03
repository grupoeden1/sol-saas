import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import {
  getUserMetrics,
  getUsageMetrics,
  getFinancialMetrics,
  getUsersList,
} from '@sol/db';
import Logo from '@/components/Logo';
import LogoWithText from '@/components/LogoWithText';
import LogoutButton from '@/components/LogoutButton';
import MetricCard from '@/components/admin/MetricCard';
import UsersTable from '@/components/admin/UsersTable';
import AddCreditsForm from '@/components/admin/AddCreditsForm';

const PAGE_SIZE = 20;

interface AdminPageProps {
  searchParams: Promise<{ page?: string }>;
}

function formatBRL(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function formatTokensShort(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return String(tokens);
}

function calcChange(current: number, previous: number): string | null {
  if (previous === 0) return current > 0 ? '+100% vs mês anterior' : null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct}% vs mês anterior`;
}

export default async function AdminDashboardPage({ searchParams }: AdminPageProps) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/chat');
  }

  const resolvedParams = await searchParams;
  const page = Math.max(1, Number(resolvedParams?.page) || 1);

  const [userMetrics, usageMetrics, financialMetrics, userListResult] =
    await Promise.all([
      getUserMetrics(),
      getUsageMetrics(),
      getFinancialMetrics(),
      getUsersList(page, PAGE_SIZE),
    ]);

  const totalPages = Math.ceil(userListResult.total / PAGE_SIZE);

  const userCards = [
    {
      label: 'Total de Usuários',
      value: String(userMetrics.totalUsers),
      change: calcChange(userMetrics.newUsersThisMonth, userMetrics.newUsersLastMonth),
    },
    {
      label: 'Ativos (7 dias)',
      value: String(userMetrics.activeUsers7d),
      change: null,
    },
    {
      label: 'Saldo Baixo',
      value: String(userMetrics.lowBalanceUsers),
      change: null,
      variant: 'amber' as const,
    },
  ];

  const usageCards = [
    {
      label: 'Total de Mensagens',
      value: String(usageMetrics.totalMessages),
      change: null,
    },
    {
      label: 'Tokens Consumidos',
      value: formatTokensShort(usageMetrics.totalTokens),
      change: calcChange(usageMetrics.tokensThisMonth, usageMetrics.tokensLastMonth),
    },
    {
      label: 'Input / Output',
      value: `${formatTokensShort(usageMetrics.totalInputTokens)} / ${formatTokensShort(usageMetrics.totalOutputTokens)}`,
      change: null,
    },
  ];

  const financialCards = [
    {
      label: 'Receita Bruta Total',
      value: formatBRL(financialMetrics.totalRevenueCents),
      change: calcChange(
        financialMetrics.revenueThisMonthCents,
        financialMetrics.revenueLastMonthCents,
      ),
      variant: 'default' as const,
    },
    {
      label: 'Receita Este Mês',
      value: formatBRL(financialMetrics.revenueThisMonthCents),
      change: null,
    },
    {
      label: 'Créditos Consumidos',
      value: String(financialMetrics.totalCreditsConsumed),
      change: null,
    },
    {
      label: 'Ajustes Manuais',
      value: String(financialMetrics.totalAdjustmentCredits),
      change: null,
    },
    {
      label: 'Custo OpenAI (est.)',
      value: `US$ ${financialMetrics.estimatedOpenAICostUsd.toFixed(2)}`,
      change: null,
    },
  ];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-solar-500/30 via-transparent to-transparent" />

      <header className="fixed left-0 right-0 top-4 z-50 mx-auto flex h-14 w-[calc(100%-2rem)] max-w-6xl items-center justify-between rounded-full border border-solar-800/30 bg-background-secondary/70 px-4 backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-4">
          <Link href="/chat" className="flex items-center gap-2 text-solar-300 transition-all hover:opacity-80">
            <Logo size={24} />
            <LogoWithText height={14} className="hidden sm:block" />
          </Link>
          <span className="hidden h-5 w-px bg-solar-800/50 sm:block" />
          <span className="text-xs font-semibold uppercase tracking-widest text-solar-400">Admin</span>
        </div>

        <div className="flex items-center gap-3">
          <LogoutButton />
        </div>
      </header>

      <main className="relative z-10 flex-1 px-4 pb-12 pt-28 md:px-8">
        <div className="mx-auto max-w-6xl space-y-10">

          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Painel de Controle</h1>
              <p className="mt-1 text-sm text-foreground-muted">
                {userMetrics.totalUsers} usuário{userMetrics.totalUsers !== 1 ? 's' : ''} cadastrado{userMetrics.totalUsers !== 1 ? 's' : ''}
              </p>
            </div>
            <Link
              href="/admin/pricing"
              className="rounded-xl bg-solar-500/10 px-4 py-2.5 text-sm font-medium text-solar-300 transition-all hover:bg-solar-500/20"
            >
              Simulador de Pricing
            </Link>
          </div>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-foreground-muted">
              Usuários
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {userCards.map((card, i) => (
                <MetricCard
                  key={i}
                  label={card.label}
                  value={card.value}
                  change={card.change}
                  variant={card.variant}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-foreground-muted">
              Uso
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {usageCards.map((card, i) => (
                <MetricCard key={i} label={card.label} value={card.value} change={card.change} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-foreground-muted">
              Financeiro
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {financialCards.map((card, i) => (
                <MetricCard
                  key={i}
                  label={card.label}
                  value={card.value}
                  change={card.change}
                  variant={card.variant}
                />
              ))}
            </div>
          </section>

          <UsersTable
            users={userListResult.users}
            currentPage={page}
            totalPages={totalPages}
          />

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-foreground-muted">
              Créditos Manuais
            </h2>
            <AddCreditsForm />
          </section>

        </div>
      </main>
    </div>
  );
}
