import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import Logo from '@/components/Logo';
import LogoWithText from '@/components/LogoWithText';
import LogoutButton from '@/components/LogoutButton';

// -- Mock Data for Admin --
const metrics = [
  { label: 'Total de Usuários', value: '1,248', increase: '+12% esse mês' },
  { label: 'Receita Mensal', value: 'R$ 14.520', increase: '+8% esse mês' },
  { label: 'Scripts Gerados', value: '45,820', increase: '+24% esse mês' },
];

const users = [
  { id: 1, name: 'João Silva', email: 'joao@example.com', balanceCents: 150, plan: 'Pro' },
  { id: 2, name: 'Maria Santos', email: 'maria@example.com', balanceCents: 42, plan: 'Starter' },
  { id: 3, name: 'Pedro Almeida', email: 'pedro@example.com', balanceCents: 750, plan: 'Max' },
  { id: 4, name: 'Ana Costa', email: 'ana@example.com', balanceCents: 0, plan: 'Free' },
  { id: 5, name: 'Lucas Ferreira', email: 'lucas@example.com', balanceCents: 210, plan: 'Pro' },
];

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
      {/* Subtle Glow Behind */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-solar-500/30 via-transparent to-transparent" />

      {/* Floating Admin Header */}
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

      {/* Main Content */}
      <main className="relative z-10 flex-1 px-4 pb-12 pt-28 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Painel de Controle</h1>
              <p className="mt-1 text-sm text-foreground-muted">Gerencie usuários, planos e métricas do SOL.</p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric, i) => (
              <div
                key={i}
                className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-5 backdrop-blur-md transition-all hover:border-solar-500/30 hover:bg-background-secondary/60"
              >
                <p className="text-sm font-medium text-foreground-muted">{metric.label}</p>
                <p className="mt-2 text-3xl font-bold text-solar-300">{metric.value}</p>
                <p className="mt-2 text-xs text-green-400">{metric.increase}</p>
              </div>
            ))}
          </div>

          {/* Users Table Area */}
          <div className="overflow-hidden rounded-2xl border border-solar-800/20 bg-background-secondary/40 backdrop-blur-md">
            <div className="border-b border-solar-800/20 px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Usuários Recentes</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-solar-500/5 text-xs uppercase text-foreground-muted">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-semibold">Nome</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Email</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Plano</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Créditos</th>
                    <th scope="col" className="px-6 py-4 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-solar-800/20">
                  {users.map((user) => (
                    <tr key={user.id} className="transition-all hover:bg-solar-500/5">
                      <td className="px-6 py-4 font-medium text-foreground">{user.name}</td>
                      <td className="px-6 py-4 text-foreground-muted">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.plan === 'Free' ? 'bg-foreground-muted/10 text-foreground-muted' : 'bg-solar-500/20 text-solar-300'
                        }`}>
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-foreground">{user.balanceCents}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="font-medium text-solar-400 hover:text-solar-300 hover:underline">
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Placeholder */}
            <div className="border-t border-solar-800/20 px-6 py-4 flex items-center justify-between">
              <span className="text-xs text-foreground-muted">Mostrando 1 a 5 de 1,248 resultados</span>
              <div className="flex items-center gap-2 text-sm">
                <button className="rounded bg-background-secondary px-3 py-1.5 text-foreground-muted hover:text-foreground disabled:opacity-50" disabled>Anterior</button>
                <button className="rounded bg-solar-500/10 px-3 py-1.5 text-solar-300 hover:bg-solar-500/20">Próxima</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
