import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const PAGE_SIZE = 20

const PATH_LABELS: Record<string, string> = {
  AD: 'Anúncio',
  ORGANIC: 'Orgânico',
  MODELED: 'Modelado',
  FROM_SCRATCH: 'Do Zero',
}

interface RoteirosPageProps {
  searchParams: Promise<{ page?: string; filter?: string }>
}

export default async function RoteirosPage({ searchParams }: RoteirosPageProps) {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })

  if (!user) {
    redirect('/login')
  }

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const filter = params.filter ?? 'all' // 'all' | 'roteiros' | 'chats'

  const where: Record<string, unknown> = { userId: user.id }
  if (filter === 'roteiros') {
    where.quizSessionId = { not: null }
  } else if (filter === 'chats') {
    where.quizSessionId = null
  }

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        quizSessionId: true,
        createdAt: true,
        quizSession: {
          select: {
            path1: true,
            path2: true,
            status: true,
          },
        },
      },
    }),
    prisma.conversation.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meus Roteiros</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'roteiro' : 'roteiros'} no total
          </p>
        </div>
        <Link
          href="/quiz"
          className="rounded-lg bg-solar-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-solar-400"
        >
          + Novo Roteiro
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-background-secondary p-1">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'roteiros', label: 'Roteiros' },
          { key: 'chats', label: 'Chats Livres' },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={`/roteiros?filter=${tab.key}`}
            className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-solar-500/20 text-solar-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* List */}
      {conversations.length === 0 ? (
        <div className="rounded-xl border border-solar-800/30 bg-background-secondary p-12 text-center">
          <p className="mb-2 text-sm text-muted-foreground">
            Nenhum roteiro encontrado.
          </p>
          <Link href="/quiz" className="text-sm text-solar-400 hover:underline">
            Criar meu primeiro roteiro →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {conversations.map((conv) => {
            const isQuiz = conv.quizSessionId !== null
            const pathLabel = isQuiz && conv.quizSession
              ? [
                  conv.quizSession.path1 ? PATH_LABELS[conv.quizSession.path1] : null,
                  conv.quizSession.path2 ? PATH_LABELS[conv.quizSession.path2] : null,
                ].filter(Boolean).join(' + ')
              : null

            return (
              <Link
                key={conv.id}
                href={`/roteiros/${conv.id}`}
                className="flex items-center gap-4 rounded-xl border border-solar-800/20 bg-background-secondary p-4 transition-colors hover:border-solar-800/40 hover:bg-background-secondary/80"
              >
                {/* Icon */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isQuiz
                      ? 'bg-solar-500/10 text-solar-400'
                      : 'bg-blue-500/10 text-blue-400'
                  }`}
                >
                  <span className="text-lg">{isQuiz ? '📝' : '💬'}</span>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {conv.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {new Date(conv.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                    {pathLabel && (
                      <>
                        <span className="text-solar-800/40">·</span>
                        <span className="text-solar-400/80">{pathLabel}</span>
                      </>
                    )}
                  </div>
                </div>

                <span className="text-xs text-muted-foreground">→</span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/roteiros?page=${page - 1}&filter=${filter}`}
              className="rounded-lg border border-solar-800/30 px-3 py-1.5 text-sm text-muted-foreground hover:bg-background-secondary"
            >
              ← Anterior
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/roteiros?page=${page + 1}&filter=${filter}`}
              className="rounded-lg border border-solar-800/30 px-3 py-1.5 text-sm text-muted-foreground hover:bg-background-secondary"
            >
              Próxima →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
