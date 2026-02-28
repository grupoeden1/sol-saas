import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CreditSummary from '@/components/dashboard/CreditSummary';
import TransactionHistory from '@/components/dashboard/TransactionHistory';
import ConversationList from '@/components/dashboard/ConversationList';

const PAGE_SIZE = 20;

interface DashboardPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, balanceCents: true },
  });

  if (!user) {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const page = Math.max(1, Number(resolvedParams?.page) || 1);

  // Parallel queries for transactions count, transactions page, and conversations
  const [totalCount, transactions, conversations] = await Promise.all([
    prisma.creditTransaction.count({ where: { userId: user.id } }),
    prisma.creditTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Painel</h1>
        <Link
          href="/chat"
          className="group inline-flex items-center gap-2 rounded-xl bg-solar-500 px-5 py-2.5 text-sm font-semibold text-background transition-all hover:bg-solar-600 hover:shadow-lg hover:shadow-solar-500/25"
        >
          Ir para o chat
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>

      {/* Credit Summary */}
      <div className="mb-6">
        <CreditSummary balanceCents={user.balanceCents} />
      </div>

      {/* Two-column layout on desktop */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Transactions — takes 2 cols */}
        <div className="lg:col-span-2">
          <TransactionHistory
            transactions={transactions}
            currentPage={page}
            totalPages={totalPages}
          />
        </div>

        {/* Conversations — takes 1 col */}
        <div className="lg:col-span-1">
          <ConversationList conversations={conversations} />
        </div>
      </div>
    </div>
  );
}
