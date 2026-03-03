import { formatBalance } from '@/lib/format-balance';
import Pagination from '@/components/dashboard/Pagination';

interface UserRow {
  id: string;
  email: string;
  role: string;
  credits: number;
  totalMessages: number;
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
                    <th scope="col" className="px-6 py-4 font-semibold">Saldo</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Mensagens</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-solar-800/20">
                  {users.map((user) => (
                    <tr key={user.id} className="transition-all hover:bg-solar-500/5">
                      <td className="px-6 py-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {user.email}
                          {user.role === 'ADMIN' && (
                            <span className="inline-flex rounded-full bg-solar-500/20 px-2 py-0.5 text-xs font-medium text-solar-300">
                              ADMIN
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-foreground">{formatBalance(user.credits)}</td>
                      <td className="px-6 py-4 text-foreground-muted">{user.totalMessages}</td>
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
                  {user.role === 'ADMIN' && (
                    <span className="inline-flex rounded-full bg-solar-500/20 px-2.5 py-0.5 text-xs font-medium text-solar-300">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="mt-2 flex gap-4 text-xs text-foreground-muted">
                  <span>{formatBalance(user.credits)}</span>
                  <span>{user.totalMessages} mensagens</span>
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
