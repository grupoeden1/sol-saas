import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@sol/db';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';

const resetSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(128),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof resetSchema>;
  try {
    body = resetSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase().trim() },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Email não encontrado' }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Reset Password] Error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Erro interno ao redefinir senha' }, { status: 500 });
  }
}
