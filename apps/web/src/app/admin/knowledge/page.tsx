import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import Logo from '@/components/Logo';
import LogoWithText from '@/components/LogoWithText';
import LogoutButton from '@/components/LogoutButton';
import KnowledgeManager from '@/components/admin/KnowledgeManager';

export default async function AdminKnowledgePage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/roteiros');
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-solar-500/30 via-transparent to-transparent" />

      <header className="fixed left-0 right-0 top-4 z-50 mx-auto flex h-14 w-[calc(100%-2rem)] max-w-6xl items-center justify-between rounded-full border border-solar-800/30 bg-background-secondary/70 px-4 backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-4">
          <Link href="/roteiros" className="flex items-center gap-2 text-solar-300 transition-all hover:opacity-80">
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
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Base de Conhecimento</h1>
              <p className="mt-1 text-sm text-foreground-muted">
                Gerencie colecoes de documentos e videos para alimentar a IA via RAG
              </p>
            </div>
            <Link
              href="/admin"
              className="rounded-xl bg-solar-500/10 px-4 py-2.5 text-sm font-medium text-solar-300 transition-all hover:bg-solar-500/20"
            >
              Voltar ao Painel
            </Link>
          </div>

          <KnowledgeManager />
        </div>
      </main>
    </div>
  );
}
