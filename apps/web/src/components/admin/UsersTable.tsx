import { formatBalance } from '@/lib/format-balance';
import Pagination from '@/components/dashboard/Pagination';

interface UserRow {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  balanceCents: number;
  totalTokens: number;
  conversationCount: number;
  createdAt: Date;
}

interface UsersTableProps {
  users: UserRow[];
  currentPage: number;
  totalPages: number;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return String(tokens);
}

export default function UsersTable({ users, currentPage, totalPages }: UsersTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-solar-800/20 bg-background-secondary/40 backdrop-blur-md">
      <div className="border-b border-solar-800/20 px-6 py-4">
        <h2 className="text-lg font-semibold text-foreground">Usuários</h2>
      </div>

      {users.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-foreground-muted">Nenhum usuário cadastrado</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-solar-500/5 text-xs uppercase text-foreground-muted">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-semibold">Email</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Role</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Créditos</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Tokens</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Conversas</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-solar-800/20">
                  {users.map((user) => (
                    <tr key={user.id} className="transition-all hover:bg-solar-500/5">
                      <td className="px-6 py-4 font-medium text-foreground">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.role === 'ADMIN'
                            ? 'bg-solar-500/20 text-solar-300'
                            : 'bg-foreground-muted/10 text-foreground-muted'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-foreground">{formatBalance(user.balanceCents)}</td>
                      <td className="px-6 py-4 text-foreground-muted">{formatTokens(user.totalTokens)}</td>
                      <td className="px-6 py-4 text-foreground-muted">{user.conversationCount}</td>
                      <td className="px-6 py-4 text-foreground-muted">{formatDate(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-px md:hidden">
            {users.map((user) => (
              <div key={user.id} className="border-b border-solar-800/10 px-6 py-4 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{user.email}</span>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    user.role === 'ADMIN'
                      ? 'bg-solar-500/20 text-solar-300'
                      : 'bg-foreground-muted/10 text-foreground-muted'
                  }`}>
                    {user.role}
                  </span>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-foreground-muted">
                  <span>{formatBalance(user.balanceCents)}</span>
                  <span>{formatTokens(user.totalTokens)} tokens</span>
                  <span>{user.conversationCount} conversas</span>
                </div>
                <p className="mt-1 text-xs text-foreground-muted/60">{formatDate(user.createdAt)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-solar-800/20 px-6 py-4">
            <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/admin" />
          </div>
        </>
      )}
    </div>
  );
}
