import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.baseRoutine.count();
  console.log('BaseRoutine Count:', count);
}

main().finally(() => prisma.$disconnect());
