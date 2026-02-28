import { formatBalance } from '@/lib/format-balance';
import Pagination from './Pagination';

interface Transaction {
  id: string;
  amount: number;
  type: 'purchase' | 'consumption';
  description: string | null;
  createdAt: Date;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  currentPage: number;
  totalPages: number;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function TransactionHistory({
  transactions,
  currentPage,
  totalPages,
}: TransactionHistoryProps) {
  return (
    <div className="rounded-2xl border border-solar-800/20 bg-background-secondary">
      <div className="border-b border-solar-800/20 px-6 py-4">
        <h2 className="text-lg font-semibold text-foreground">Histórico de Transações</h2>
      </div>

      {transactions.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-foreground-muted">Nenhuma transação ainda</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-solar-800/10 text-left text-xs text-foreground-muted">
                  <th className="px-6 py-3 font-medium">Tipo</th>
                  <th className="px-6 py-3 font-medium">Descrição</th>
                  <th className="px-6 py-3 text-right font-medium">Valor</th>
                  <th className="px-6 py-3 text-right font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-solar-800/10 last:border-0">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        tx.type === 'purchase'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-foreground-muted/10 text-foreground-muted'
                      }`}>
                        {tx.type === 'purchase' ? 'Compra' : 'Uso'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {tx.description ?? (tx.type === 'purchase' ? 'Compra de créditos' : 'Uso do chat')}
                    </td>
                    <td className={`px-6 py-4 text-right text-sm font-medium ${
                      tx.amount > 0 ? 'text-green-400' : 'text-foreground-muted'
                    }`}>
                      {tx.amount > 0 ? '+' : ''}{formatBalance(Math.abs(tx.amount))}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-foreground-muted">
                      {formatDate(tx.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-px md:hidden">
            {transactions.map((tx) => (
              <div key={tx.id} className="border-b border-solar-800/10 px-6 py-4 last:border-0">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    tx.type === 'purchase'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-foreground-muted/10 text-foreground-muted'
                  }`}>
                    {tx.type === 'purchase' ? 'Compra' : 'Uso'}
                  </span>
                  <span className={`text-sm font-medium ${
                    tx.amount > 0 ? 'text-green-400' : 'text-foreground-muted'
                  }`}>
                    {tx.amount > 0 ? '+' : ''}{formatBalance(Math.abs(tx.amount))}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground">
                  {tx.description ?? (tx.type === 'purchase' ? 'Compra de créditos' : 'Uso do chat')}
                </p>
                <p className="mt-1 text-xs text-foreground-muted">{formatDate(tx.createdAt)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-solar-800/20 px-6 py-4">
            <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/dashboard" />
          </div>
        </>
      )}
    </div>
  );
}
