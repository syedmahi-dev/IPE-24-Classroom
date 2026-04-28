import { prisma } from './src/lib/prisma';
import { searchKnowledge } from './src/lib/vector-search';
import { getEmbedding } from './src/lib/embeddings';

async function main() {
  const q = "What is my routine tomorrow?";
  const e = await getEmbedding(q);
  const chunks = await searchKnowledge(e, 5);
  console.log(`FOUND ${chunks.length} chunks for: ${q}`);
  for (const c of chunks) {
    console.log(`- [${c.similarity}] ${c.title}`);
  }
  await prisma.$disconnect();
}
main();
