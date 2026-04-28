import { prisma } from './src/lib/prisma';
async function main() {
  const res = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'knowledge_chunks'`;
  console.log('COLUMNS:', res);
  await prisma.$disconnect();
}
main();
