import { NextResponse } from 'next/server';
import { prisma, Prisma } from '@sol/db';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(128),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Hash da senha com 12 rounds (OWASP recommendation)
    const passwordHash = await bcrypt.hash(password, 12);

    // Tenta criar usuário — se email já existe, retorna mesma resposta
    // para não revelar existência de contas (PRD Story 1.3 AC7)
    try {
      await prisma.user.create({
        data: {
          email,
          passwordHash,
          credits: 0,
        }
      });
    } catch (error) {
      // Unique constraint violation = email already exists
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Return same success response to prevent email enumeration
        return NextResponse.json(
          { message: 'Verifique seu email para continuar' },
          { status: 201 }
        );
      }
      throw error;
    }

    return NextResponse.json(
      { message: 'Verifique seu email para continuar' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Register] Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
