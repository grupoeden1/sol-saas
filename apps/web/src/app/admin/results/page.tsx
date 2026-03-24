import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { ResultsDashboard } from '@/components/admin/ResultsDashboard'

export default async function AdminResultsPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/roteiros')

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-sm text-solar-400 hover:underline mb-2 inline-block">
              &larr; Voltar ao painel
            </Link>
            <h1 className="text-2xl font-bold">Resultados de Performance</h1>
            <p className="text-gray-400 text-sm mt-1">
              Distribuicao de classificacao, performance por nicho e modulo, gap de execucao
            </p>
          </div>
        </div>
        <ResultsDashboard />
      </div>
    </main>
  )
}
