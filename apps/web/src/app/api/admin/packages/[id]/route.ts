import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';

const UpdatePackageSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  credits: z.number().int().positive().optional(),
  priceBrl: z.number().int().positive().optional(),
  description: z.string().max(200).nullish(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// PUT /api/admin/packages/[id] — atualizar pacote existente
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  let body: z.infer<typeof UpdatePackageSchema>;
  try {
    body = UpdatePackageSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const existing = await prisma.creditPackage.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 });
  }

  const updated = await prisma.creditPackage.update({
    where: { id },
    data: body,
  });

  console.log(`[Admin] Package updated by ${session.user.email}: ${updated.name}`);

  return NextResponse.json(updated);
}
