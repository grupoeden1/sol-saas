import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma, addCredits, getExchangeRate } from '@sol/db';

const BodySchema = z.object({
  userEmail: z.string().email(),
  amountBRL: z.number().positive(),
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

  const { userEmail, amountBRL, reason } = body;
  const adminEmail = session.user.email;

  // 3. Buscar usuário alvo
  const targetUser = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true, email: true, balanceCents: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 4. Converter BRL para centavos e buscar cotação
  const amountCents = Math.round(amountBRL * 100);
  const exchangeRate = await getExchangeRate('USD-BRL');

  // 5. Adicionar créditos como ajuste manual
  const { balanceCents: newBalanceCents } = await addCredits(
    targetUser.id,
    amountCents,
    {
      type: 'adjustment',
      exchangeRate,
      adminEmail,
      description: reason,
    },
  );

  console.log(
    `[Admin] addCredits adjustment: admin=${adminEmail} user=${userEmail} amountCents=${amountCents}`,
  );

  return NextResponse.json({
    success: true,
    userEmail,
    addedCents: amountCents,
    newBalanceCents,
  });
}
