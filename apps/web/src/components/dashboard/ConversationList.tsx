import Link from 'next/link';

interface ConversationItem {
  id: string;
  title: string;
  createdAt: Date;
}

interface ConversationListProps {
  conversations: ConversationItem[];
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export default function ConversationList({ conversations }: ConversationListProps) {
  return (
    <div className="rounded-2xl border border-solar-800/20 bg-background-secondary">
      <div className="border-b border-solar-800/20 px-6 py-4">
        <h2 className="text-lg font-semibold text-foreground">Meus Roteiros</h2>
      </div>

      {conversations.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-foreground-muted">Nenhum roteiro ainda</p>
          <Link
            href="/quiz"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-solar-300 transition-all hover:text-solar-200"
          >
            Criar meu primeiro roteiro
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-solar-800/10">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/roteiros/${conv.id}`}
              className="flex items-center justify-between px-6 py-4 transition-all hover:bg-solar-500/5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{conv.title}</p>
                <p className="mt-0.5 text-xs text-foreground-muted">{formatDate(conv.createdAt)}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-3 shrink-0 text-foreground-muted">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
