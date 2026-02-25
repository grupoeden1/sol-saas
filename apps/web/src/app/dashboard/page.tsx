import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div className="bg-background-secondary border border-solar-800/30 rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-8">
          <h2 className="text-2xl font-bold text-solar-300 mb-4">
            Bem-vindo ao SOL! ☀️
          </h2>
          <p className="text-foreground-muted mb-2">
            Você está autenticado como: <strong className="text-foreground">{session.user?.email}</strong>
          </p>
          <p className="text-foreground-muted">
            Esta é uma página protegida. Apenas usuários autenticados podem acessá-la.
          </p>
        </div>
      </div>

      <div className="bg-background-secondary border border-solar-800/30 rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-8">
          <h3 className="text-xl font-semibold text-foreground mb-4">
            Próximos passos
          </h3>
          <ul className="space-y-2 text-foreground-muted">
            <li className="flex items-start gap-2">
              <span className="text-solar-300">•</span>
              <span>Chat com IA para geração de ofertas (Em breve - Epic 2)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-solar-300">•</span>
              <span>Sistema de créditos e pagamentos (Em breve - Epic 3)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-solar-300">•</span>
              <span>Histórico de conversas e transações</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
