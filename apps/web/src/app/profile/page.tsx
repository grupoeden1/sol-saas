import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ExpertProfileForm } from '@/components/profile/ExpertProfileForm'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Perfil do Expert</h1>
        <p className="text-gray-400 mb-8">
          Complete seu perfil para roteiros mais personalizados e autenticos.
        </p>
        <ExpertProfileForm />
      </div>
    </main>
  )
}
