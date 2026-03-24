import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@sol/db'

// ---------------------------------------------------------------------------
// DELETE — Remove a competitor profile (with ownership check)
// ---------------------------------------------------------------------------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  const { id } = await params

  // Verify ownership before deleting
  const profile = await prisma.competitorProfile.findUnique({
    where: { id },
    select: { userId: true },
  })

  if (!profile) {
    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
  }

  if (profile.userId !== user.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  await prisma.competitorProfile.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
