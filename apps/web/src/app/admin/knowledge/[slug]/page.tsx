import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getKbCollection } from '@sol/db';
import Logo from '@/components/Logo';
import LogoWithText from '@/components/LogoWithText';
import LogoutButton from '@/components/LogoutButton';
import KnowledgeCollectionDetail from '@/components/admin/KnowledgeCollectionDetail';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminKnowledgeDetailPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/roteiros');
  }

  const { slug } = await params;
  const collection = await getKbCollection(slug);

  if (!collection) {
    notFound();
  }

  const serialized = {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    tags: collection.tags,
    isActive: collection.isActive,
    qdrantName: collection.qdrantName,
    documentCount: collection._count.documents,
    documents: collection.documents.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    })),
  };

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
              <h1 className="text-3xl font-bold text-foreground">{collection.name}</h1>
              <p className="mt-1 text-sm text-foreground-muted">
                {collection.description || 'Sem descricao'}
              </p>
            </div>
            <Link
              href="/admin/knowledge"
              className="rounded-xl bg-solar-500/10 px-4 py-2.5 text-sm font-medium text-solar-300 transition-all hover:bg-solar-500/20"
            >
              Voltar
            </Link>
          </div>

          <KnowledgeCollectionDetail collection={serialized} />
        </div>
      </main>
    </div>
  );
}
