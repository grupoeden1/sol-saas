import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const devEmail = 'dev@sol.local';

  const existing = await prisma.user.findUnique({
    where: { email: devEmail },
  });

  if (existing) {
    console.log('✓ Dev user already exists');
    return;
  }

  const passwordHash = await bcrypt.hash('dev12345', 10);

  await prisma.user.create({
    data: {
      email: devEmail,
      passwordHash,
      credits: 50,
    },
  });

  console.log('✓ Dev user created: dev@sol.local');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
