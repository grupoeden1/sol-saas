import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import Logo from '@/components/Logo';
import LogoWithText from '@/components/LogoWithText';
import LogoutButton from '@/components/LogoutButton';
import MetricCard from '@/components/admin/MetricCard';
import UsersTable from '@/components/admin/UsersTable';

const PAGE_SIZE = 20;

interface AdminPageProps {
  searchParams: Promise<{ page?: string }>;
}

function formatRevenue(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function formatTokensShort(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return String(tokens);
}

function calcChange(current: number, previous: number): string | null {
  if (previous === 0) return current > 0 ? '+100% este mês' : null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct}% este mês`;
}

export default async function AdminDashboardPage({ searchParams }: AdminPageProps) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const resolvedParams = await searchParams;
  const page = Math.max(1, Number(resolvedParams?.page) || 1);

  // Date boundaries for month-over-month metrics
  const now = new Date();
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // All metrics in parallel
  const [
    totalUsers,
    usersThisMonth,
    usersLastMonth,
    revenueAll,
    revenueThisMonth,
    revenueLastMonth,
    tokensAll,
    tokensThisMonth,
    tokensLastMonth,
    userCount,
    usersPage,
  ] = await Promise.all([
    // Total users
    prisma.user.count(),
    // Users this month
    prisma.user.count({ where: { createdAt: { gte: firstDayThisMonth } } }),
    // Users last month
    prisma.user.count({
      where: { createdAt: { gte: firstDayLastMonth, lt: firstDayThisMonth } },
    }),
    // Total revenue (purchases)
    prisma.creditTransaction.aggregate({
      where: { type: 'purchase' },
      _sum: { amount: true },
    }),
    // Revenue this month
    prisma.creditTransaction.aggregate({
      where: { type: 'purchase', createdAt: { gte: firstDayThisMonth } },
      _sum: { amount: true },
    }),
    // Revenue last month
    prisma.creditTransaction.aggregate({
      where: {
        type: 'purchase',
        createdAt: { gte: firstDayLastMonth, lt: firstDayThisMonth },
      },
      _sum: { amount: true },
    }),
    // Total tokens consumed
    prisma.creditTransaction.aggregate({
      where: { type: 'consumption' },
      _sum: { inputTokens: true, outputTokens: true },
    }),
    // Tokens this month
    prisma.creditTransaction.aggregate({
      where: { type: 'consumption', createdAt: { gte: firstDayThisMonth } },
      _sum: { inputTokens: true, outputTokens: true },
    }),
    // Tokens last month
    prisma.creditTransaction.aggregate({
      where: {
        type: 'consumption',
        createdAt: { gte: firstDayLastMonth, lt: firstDayThisMonth },
      },
      _sum: { inputTokens: true, outputTokens: true },
    }),
    // Users count for pagination
    prisma.user.count(),
    // Users page with conversation count
    prisma.user.findMany({
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        balanceCents: true,
        createdAt: true,
        _count: { select: { conversations: true } },
      },
    }),
  ]);

  // Aggregate tokens per user (for users on this page)
  const userIds = usersPage.map((u) => u.id);
  const tokensByUser = userIds.length > 0
    ? await prisma.creditTransaction.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, type: 'consumption' },
        _sum: { inputTokens: true, outputTokens: true },
      })
    : [];

  const tokenMap = new Map(
    tokensByUser.map((t) => [
      t.userId,
      (t._sum.inputTokens ?? 0) + (t._sum.outputTokens ?? 0),
    ])
  );

  // Build user rows
  const userRows = usersPage.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role as 'USER' | 'ADMIN',
    balanceCents: u.balanceCents,
    totalTokens: tokenMap.get(u.id) ?? 0,
    conversationCount: u._count.conversations,
    createdAt: u.createdAt,
  }));

  const totalPages = Math.ceil(userCount / PAGE_SIZE);

  // Metrics values
  const totalRevenueCents = revenueAll._sum.amount ?? 0;
  const revenueThisMonthCents = revenueThisMonth._sum.amount ?? 0;
  const revenueLastMonthCents = revenueLastMonth._sum.amount ?? 0;

  const totalTokensConsumed =
    (tokensAll._sum.inputTokens ?? 0) + (tokensAll._sum.outputTokens ?? 0);
  const tokensThisMonthTotal =
    (tokensThisMonth._sum.inputTokens ?? 0) + (tokensThisMonth._sum.outputTokens ?? 0);
  const tokensLastMonthTotal =
    (tokensLastMonth._sum.inputTokens ?? 0) + (tokensLastMonth._sum.outputTokens ?? 0);

  const metrics = [
    {
      label: 'Total de Usuários',
      value: String(totalUsers),
      change: calcChange(usersThisMonth, usersLastMonth),
    },
    {
      label: 'Receita Total',
      value: formatRevenue(totalRevenueCents),
      change: calcChange(revenueThisMonthCents, revenueLastMonthCents),
    },
    {
      label: 'Tokens Consumidos',
      value: formatTokensShort(totalTokensConsumed),
      change: calcChange(tokensThisMonthTotal, tokensLastMonthTotal),
    },
  ];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-solar-500/30 via-transparent to-transparent" />

      <header className="fixed left-0 right-0 top-4 z-50 mx-auto flex h-14 w-[calc(100%-2rem)] max-w-6xl items-center justify-between rounded-full border border-solar-800/30 bg-background-secondary/70 px-4 backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-solar-300 transition-all hover:opacity-80">
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
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Painel de Controle</h1>
              <p className="mt-1 text-sm text-foreground-muted">
                {totalUsers} usuário{totalUsers !== 1 ? 's' : ''} cadastrado{totalUsers !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric, i) => (
              <MetricCard key={i} label={metric.label} value={metric.value} change={metric.change} />
            ))}
          </div>

          <UsersTable users={userRows} currentPage={page} totalPages={totalPages} />
        </div>
      </main>
    </div>
  );
}
