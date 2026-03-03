import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  answers: z.object({
    O1: z.string().min(1),
    O2: z.string().min(1),
    O3: z.string().min(1),
    O4: z.string().min(1),
    O5: z.string().min(1),
    O6: z.string().min(1),
    O7: z.string().min(1),
    O8: z.string().min(1),
    O9: z.string().min(1),
  }).optional(),
});

async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.email) return null;

  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;

  const profile = await prisma.onboardingProfile.findFirst({
    where: { id, userId: user.id },
  });

  if (!profile) {
    return Response.json({ error: 'Perfil não encontrado' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 },
    );
  }

  const updated = await prisma.onboardingProfile.update({
    where: { id },
    data: {
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.answers && { answers: parsed.data.answers }),
    },
    select: {
      id: true,
      name: true,
      answers: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return Response.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;

  const profile = await prisma.onboardingProfile.findFirst({
    where: { id, userId: user.id },
    include: {
      quizSessions: {
        where: { status: 'IN_PROGRESS' },
        select: { id: true },
      },
    },
  });

  if (!profile) {
    return Response.json({ error: 'Perfil não encontrado' }, { status: 404 });
  }

  if (profile.quizSessions.length > 0) {
    return Response.json(
      { error: 'Perfil possui quiz sessions ativas. Conclua ou abandone antes de deletar.' },
      { status: 409 },
    );
  }

  await prisma.onboardingProfile.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
