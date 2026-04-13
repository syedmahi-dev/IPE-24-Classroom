import { prisma } from './prisma'
import { getEmbedding } from './embeddings'

const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 80

function chunkText(text: string): string[] {
  // Prefer splitting at sentence boundaries
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) ?? [text]
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if ((current + sentence).length > CHUNK_SIZE) {
      if (current.trim()) chunks.push(current.trim())
      current = current.slice(-CHUNK_OVERLAP) + sentence
    } else {
      current += sentence
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.filter((c) => c.length > 50)
}

export async function indexDocument(documentId: string): Promise<number> {
  const doc = await prisma.knowledgeDocument.findUnique({ where: { id: documentId } })
  if (!doc) throw new Error('Document not found')

  // Remove old chunks
  await prisma.knowledgeChunk.deleteMany({ where: { documentId } })

  const textChunks = chunkText(doc.content)

  for (let i = 0; i < textChunks.length; i++) {
    const embedding = await getEmbedding(textChunks[i])

    await prisma.$executeRaw`
      INSERT INTO knowledge_chunks (id, document_id, chunk_index, content, embedding, created_at)
      VALUES (uuid_generate_v4(), ${documentId}::uuid, ${i}, ${textChunks[i]}, ${embedding}::vector, NOW())
    `
  }

  return textChunks.length
}

export async function reindexAllDocuments(): Promise<{ total: number; chunks: number }> {
  const docs = await prisma.knowledgeDocument.findMany({ select: { id: true } })
  let totalChunks = 0

  for (const doc of docs) {
    totalChunks += await indexDocument(doc.id)
  }

  return { total: docs.length, chunks: totalChunks }
}
