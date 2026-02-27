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
      balanceCents: 5000, // R$50,00 em centavos
    },
  });

  console.log('✓ Dev user created: dev@sol.local (role: ADMIN)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
