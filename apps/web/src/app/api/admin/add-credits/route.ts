import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma, addCredits } from '@sol/db';

const BodySchema = z.object({
  userEmail: z.string().email(),
  credits: z.number().int().positive(),
  reason: z.string().min(3),
});

export async function POST(req: NextRequest) {
  // 1. Autenticação e autorização
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Validação do body
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { userEmail, credits, reason } = body;
  const adminEmail = session.user.email;

  // 3. Buscar usuário alvo
  const targetUser = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true, email: true, credits: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 4. Adicionar créditos como ajuste manual
  const result = await addCredits(
    targetUser.id,
    credits,
    {
      type: 'adjustment',
      adminEmail,
      description: reason,
    },
  );

  console.log(
    `[Admin] addCredits adjustment: admin=${adminEmail} user=${userEmail} credits=${credits}`,
  );

  return NextResponse.json({
    success: true,
    userEmail,
    addedCredits: credits,
    newCredits: result.credits,
  });
}
