import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('✗ Seed script cannot run in production');
    process.exit(1);
  }

  const devEmail = 'dev@sol.local';

  const existing = await prisma.user.findUnique({
    where: { email: devEmail },
  });

  if (existing) {
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({
        where: { email: devEmail },
        data: { role: 'ADMIN' },
      });
      console.log('✓ Dev user promoted to ADMIN');
    } else {
      console.log('✓ Dev user already exists (role: ADMIN)');
    }
    return;
  }

  const passwordHash = await bcrypt.hash('dev12345', 12);

  await prisma.user.create({
    data: {
      email: devEmail,
      passwordHash,
      role: 'ADMIN',
      credits: 500, // 500 créditos iniciais
    },
  });

  console.log('✓ Dev user created: dev@sol.local (role: ADMIN)');

  // ─── Seed: PricingConfig ───────────────────────────────────────────────
  const pricingDefaults = [
    { key: 'CREDITS_PER_M_INPUT', value: 500 },
    { key: 'CREDITS_PER_M_OUTPUT', value: 2000 },
    { key: 'MAX_OUTPUT_TOKENS', value: 8192 },
  ];

  for (const cfg of pricingDefaults) {
    await prisma.pricingConfig.upsert({
      where: { key: cfg.key },
      update: { value: cfg.value },
      create: { key: cfg.key, value: cfg.value },
    });
  }
  console.log('✓ PricingConfig seeded');

  // ─── Seed: CreditPackages ─────────────────────────────────────────────
  const packages = [
    { name: 'Starter', credits: 100, priceBrl: 2990, description: '~30 scripts com a IA', sortOrder: 0 },
    { name: 'Pro', credits: 250, priceBrl: 6990, description: '~70 scripts com a IA', sortOrder: 1 },
    { name: 'Max', credits: 600, priceBrl: 14990, description: '~200 scripts com a IA', sortOrder: 2 },
  ];

  for (const pkg of packages) {
    const existing = await prisma.creditPackage.findFirst({ where: { name: pkg.name } });
    if (!existing) {
      await prisma.creditPackage.create({ data: pkg });
    }
  }
  console.log('✓ CreditPackages seeded');

  // ─── Seed: OnboardingProfile de teste ──────────────────────────────────
  const user = await prisma.user.findUnique({ where: { email: devEmail } });
  if (user) {
    const existingProfile = await prisma.onboardingProfile.findFirst({
      where: { userId: user.id },
    });

    if (!existingProfile) {
      const profile = await prisma.onboardingProfile.create({
        data: {
          userId: user.id,
          name: 'Curso de Marketing Digital',
          answers: {
            O1: 'Curso online de marketing digital para iniciantes',
            O2: 'Pessoas de 25-45 anos que querem empreender online',
            O3: 'R$ 497',
            O4: 'Redes sociais orgânicas e tráfego pago',
            O5: 'Baixo — estou começando',
            O6: 'Facebook Ads e Instagram Ads',
            O7: 'Sim, tenho uma página no Instagram com 2k seguidores',
            O8: 'Quero escalar meu negócio digital',
            O9: 'Marketing digital, infoprodutos, cursos online',
          },
        },
      });

      // ─── Seed: QuizSession completa de teste ─────────────────────────
      const session = await prisma.quizSession.create({
        data: {
          userId: user.id,
          onboardingProfileId: profile.id,
          path1: 'AD',
          path2: 'FROM_SCRATCH',
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      const sampleAnswers = [
        { section: 'INITIAL' as const, questionKey: 'Q1', answerType: 'SINGLE_SELECT' as const, answerValue: 'A' },
        { section: 'INITIAL' as const, questionKey: 'Q2', answerType: 'SINGLE_SELECT' as const, answerValue: 'B' },
        { section: 'INITIAL' as const, questionKey: 'Q3', answerType: 'SINGLE_SELECT' as const, answerValue: 'A' },
        { section: 'AD_CREATIVE' as const, questionKey: '1A.1', answerType: 'SINGLE_SELECT' as const, answerValue: 'Feed estático' },
        { section: 'AD_CREATIVE' as const, questionKey: '1A.2', answerType: 'TEXT' as const, answerValue: 'Dor principal: frustração com resultados' },
        { section: 'FROM_SCRATCH_VIDEO' as const, questionKey: '2B.1', answerType: 'TEXT' as const, answerValue: 'Linguagem informal e próxima' },
      ];

      await prisma.quizAnswer.createMany({
        data: sampleAnswers.map((a) => ({
          quizSessionId: session.id,
          ...a,
        })),
      });

      console.log('✓ OnboardingProfile + QuizSession seeded');
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
