import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import { z } from 'zod';

const createProfileSchema = z.object({
  name: z.string().min(1, 'Nome do perfil é obrigatório').max(100),
  answers: z.object({
    O1: z.string().min(1, 'O1 é obrigatório'),
    O2: z.string().min(1, 'O2 é obrigatório'),
    O3: z.string().min(1, 'O3 é obrigatório'),
    O4: z.string().min(1, 'O4 é obrigatório'),
    O5: z.string().min(1, 'O5 é obrigatório'),
    O6: z.string().min(1, 'O6 é obrigatório'),
    O7: z.string().min(1, 'O7 é obrigatório'),
    O8: z.string().min(1, 'O8 é obrigatório'),
    O9: z.string().min(1, 'O9 é obrigatório'),
  }),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return new Response('User not found', { status: 404 });
  }

  const profiles = await prisma.onboardingProfile.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      answers: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return Response.json(profiles);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return new Response('User not found', { status: 404 });
  }

  const body = await req.json();
  const parsed = createProfileSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 },
    );
  }

  const profile = await prisma.onboardingProfile.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      answers: parsed.data.answers,
    },
    select: {
      id: true,
      name: true,
      answers: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return Response.json(profile, { status: 201 });
}
