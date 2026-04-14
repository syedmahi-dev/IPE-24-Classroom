import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({where: {email: 'syedmahi@iut-dhaka.edu'}});
  console.log(user);
}

main().finally(() => prisma.$disconnect());
