import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): Date {
  const now = Date.now();
  const offset = Math.random() * daysAgo * 24 * 60 * 60 * 1000;
  return new Date(now - offset);
}

/** Weighted random date — more recent dates more likely */
function recentBiasedDate(maxDaysAgo: number): Date {
  const now = Date.now();
  // Quadratic bias towards recent dates
  const factor = Math.random() ** 2;
  const offset = factor * maxDaysAgo * 24 * 60 * 60 * 1000;
  return new Date(now - offset);
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

const MODELS = [
  { name: 'claude-haiku-4-5-20251001', weight: 0.6 },
  { name: 'claude-sonnet-4-5-20250929', weight: 0.4 },
];

function randomModel(): string {
  return Math.random() < MODELS[0]!.weight ? MODELS[0]!.name : MODELS[1]!.name;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('✗ Seed script cannot run in production');
    process.exit(1);
  }

  const SEED_MARKER = 'dashboard-seed-v1';

  // Idempotency check
  const marker = await prisma.pricingConfig.findUnique({
    where: { key: SEED_MARKER },
  });
  if (marker) {
    console.log('✓ Dashboard seed already applied (idempotent). Delete PricingConfig key "dashboard-seed-v1" to re-seed.');
    return;
  }

  console.log('→ Seeding dashboard data...');

  // ── Credit Packages ────────────────────────────────────────────────────

  const packageDefs = [
    { name: 'Starter', credits: 100, priceBrl: 2990, sortOrder: 1 },
    { name: 'Pro', credits: 500, priceBrl: 9990, sortOrder: 2 },
    { name: 'Max', credits: 1200, priceBrl: 19990, sortOrder: 3 },
  ];

  for (const pkg of packageDefs) {
    const existing = await prisma.creditPackage.findFirst({ where: { name: pkg.name } });
    if (!existing) {
      await prisma.creditPackage.create({
        data: { name: pkg.name, credits: pkg.credits, priceBrl: pkg.priceBrl, active: true, sortOrder: pkg.sortOrder },
      });
    }
  }
  console.log('  ✓ Credit packages ensured');

  // ── Users (~50) ────────────────────────────────────────────────────────

  const passwordHash = await bcrypt.hash('seed12345', 10);
  const userIds: string[] = [];

  for (let i = 0; i < 50; i++) {
    const email = `seed-user-${i}@sol.local`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash,
        credits: randomInt(0, 200),
        createdAt: recentBiasedDate(90),
      },
    });
    userIds.push(user.id);
  }
  console.log(`  ✓ ${userIds.length} seed users created`);

  // ── Conversations + Messages (~500) ─────────────────────────────────────

  let totalMessages = 0;
  for (const userId of userIds) {
    const convCount = randomInt(1, 3);
    for (let c = 0; c < convCount; c++) {
      const conv = await prisma.conversation.create({
        data: {
          userId,
          title: `Seed Conversation ${c + 1}`,
          createdAt: recentBiasedDate(85),
        },
      });

      const msgCount = randomInt(2, 8);
      const messages = [];
      for (let m = 0; m < msgCount; m++) {
        messages.push({
          conversationId: conv.id,
          role: m % 2 === 0 ? 'user' as const : 'assistant' as const,
          content: `Seed message ${m + 1} in conversation ${conv.title}`,
          createdAt: new Date(conv.createdAt.getTime() + m * 60_000),
        });
      }
      await prisma.message.createMany({ data: messages });
      totalMessages += messages.length;
    }
  }
  console.log(`  ✓ ${totalMessages} seed messages created`);

  // ── Credit Transactions (~200) ──────────────────────────────────────────

  const packages = await prisma.creditPackage.findMany({ where: { active: true } });
  let txCount = 0;

  // ~60 purchases
  for (let i = 0; i < 60; i++) {
    const pkg = randomElement(packages);
    if (!pkg) continue;
    const userId = randomElement(userIds)!;
    await prisma.creditTransaction.create({
      data: {
        userId,
        amount: pkg.credits,
        type: 'purchase',
        description: `Compra pacote ${pkg.name}`,
        stripePaymentId: `seed_pi_${Date.now()}_${i}`,
        createdAt: recentBiasedDate(90),
      },
    });
    txCount++;
  }

  // ~130 consumptions
  for (let i = 0; i < 130; i++) {
    const userId = randomElement(userIds)!;
    const model = randomModel();
    const inputTokens = randomInt(500, 5000);
    const outputTokens = randomInt(200, 4000);
    const creditsUsed = randomInt(1, 20);
    const hasAttachments = Math.random() < 0.15;

    await prisma.creditTransaction.create({
      data: {
        userId,
        amount: -creditsUsed,
        type: 'consumption',
        description: 'Consumo de mensagem',
        modelUsed: model,
        inputTokens,
        outputTokens,
        creditsPerMInput: 500,
        creditsPerMOutput: 2000,
        hasAttachments,
        attachmentTypes: hasAttachments ? ['image/png'] : [],
        createdAt: recentBiasedDate(90),
      },
    });
    txCount++;
  }

  // ~10 adjustments
  for (let i = 0; i < 10; i++) {
    const userId = randomElement(userIds)!;
    await prisma.creditTransaction.create({
      data: {
        userId,
        amount: randomInt(10, 100),
        type: 'adjustment',
        description: 'Ajuste manual - seed',
        adminEmail: 'admin@sol.com',
        createdAt: recentBiasedDate(90),
      },
    });
    txCount++;
  }
  console.log(`  ✓ ${txCount} seed transactions created`);

  // ── Idempotency marker ─────────────────────────────────────────────────

  await prisma.pricingConfig.create({
    data: { key: SEED_MARKER, value: 1 },
  });

  console.log('✓ Dashboard seed complete!');
}

main()
  .catch((e) => {
    console.error('✗ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
