import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma, invalidatePricingCache } from '@sol/db';

// GET /api/admin/pricing — retorna config + pacotes
export async function GET() {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [configRows, packages] = await Promise.all([
    prisma.pricingConfig.findMany(),
    prisma.creditPackage.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);

  const config = {
    creditsPerMInput: configRows.find((r) => r.key === 'CREDITS_PER_M_INPUT')?.value ?? 500,
    creditsPerMOutput: configRows.find((r) => r.key === 'CREDITS_PER_M_OUTPUT')?.value ?? 2000,
    maxOutputTokens: configRows.find((r) => r.key === 'MAX_OUTPUT_TOKENS')?.value ?? 8192,
  };

  return NextResponse.json({ config, packages });
}

// PUT /api/admin/pricing — atualiza config de pricing
const PricingUpdateSchema = z.object({
  creditsPerMInput: z.number().int().positive(),
  creditsPerMOutput: z.number().int().positive(),
  maxOutputTokens: z.number().int().min(256).max(32768),
});

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof PricingUpdateSchema>;
  try {
    body = PricingUpdateSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const updates = [
    { key: 'CREDITS_PER_M_INPUT', value: body.creditsPerMInput },
    { key: 'CREDITS_PER_M_OUTPUT', value: body.creditsPerMOutput },
    { key: 'MAX_OUTPUT_TOKENS', value: body.maxOutputTokens },
  ];

  await prisma.$transaction(
    updates.map((u) =>
      prisma.pricingConfig.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      }),
    ),
  );

  // Invalidar cache in-memory
  invalidatePricingCache();

  console.log(`[Admin] Pricing config updated by ${session.user.email}:`, body);

  return NextResponse.json({ success: true, config: body });
}
