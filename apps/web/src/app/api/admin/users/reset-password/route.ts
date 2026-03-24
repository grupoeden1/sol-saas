import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@sol/db';
import { auth } from '@/lib/auth';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';

const resetSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(128),
});

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof resetSchema>;
  try {
    body = resetSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: body.userId },
    select: { id: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(body.password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  console.log(
    `[Admin] Password reset by ${session.user.email} for user ${user.email} (${user.id})`,
  );

  return NextResponse.json({ success: true });
}
