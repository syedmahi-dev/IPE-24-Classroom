import { prisma } from './src/lib/prisma';
async function main() {
  try {
    const e = new Array(768).fill(0.1);
    const res = await prisma.$queryRaw`SELECT 1 - (embedding <=> ${e}::vector) AS similarity FROM knowledge_chunks LIMIT 1`;
    console.log('OK', res);
  } catch(err) {
    console.error('FAIL', err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
