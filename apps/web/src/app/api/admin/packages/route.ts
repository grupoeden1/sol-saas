import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';

// GET /api/admin/packages — listar todos os pacotes
export async function GET() {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const packages = await prisma.creditPackage.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json(packages);
}

// POST /api/admin/packages — criar novo pacote
const CreatePackageSchema = z.object({
  name: z.string().min(1).max(50),
  credits: z.number().int().positive(),
  priceBrl: z.number().int().positive(),
  description: z.string().max(200).nullish(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof CreatePackageSchema>;
  try {
    body = CreatePackageSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const pkg = await prisma.creditPackage.create({
    data: {
      name: body.name,
      credits: body.credits,
      priceBrl: body.priceBrl,
      description: body.description ?? null,
      active: body.active,
      sortOrder: body.sortOrder,
    },
  });

  console.log(`[Admin] Package created by ${session.user.email}: ${pkg.name}`);

  return NextResponse.json(pkg, { status: 201 });
}
