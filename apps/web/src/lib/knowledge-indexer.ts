import { prisma } from './prisma'
import { getEmbedding } from './embeddings'

const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 80
const MAX_TOTAL_CHUNKS = 5000 // Hard cap to protect Supabase free tier (500MB)

export function chunkText(text: string): string[] {
  // Prefer splitting at sentence boundaries
  let sentences: string[] = text.match(/[^.!?\n]+[.!?\n]+/g) ?? [text]
  
  // If no sentences found (no punctuation), force split by size
  if (sentences.length === 1 && sentences[0].length > CHUNK_SIZE) {
    const forced = []
    let temp = sentences[0]
    while (temp.length > 0) {
      forced.push(temp.slice(0, CHUNK_SIZE))
      temp = temp.slice(CHUNK_SIZE - CHUNK_OVERLAP)
      if (temp.length <= CHUNK_OVERLAP) break
    }
    sentences = forced
  }

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

/**
 * Enforce the global chunk cap (5,000 chunks) by deleting the oldest chunks
 * from the oldest documents. This protects Supabase free tier storage.
 */
async function enforceChunkCap(): Promise<void> {
  const totalChunks = await prisma.knowledgeChunk.count()
  if (totalChunks <= MAX_TOTAL_CHUNKS) return

  const excess = totalChunks - MAX_TOTAL_CHUNKS + 100 // Delete 100 extra for headroom
  
  // Find the oldest chunks to delete
  const oldestChunks = await prisma.knowledgeChunk.findMany({
    orderBy: { createdAt: 'asc' },
    take: excess,
    select: { id: true },
  })

  if (oldestChunks.length > 0) {
    await prisma.knowledgeChunk.deleteMany({
      where: { id: { in: oldestChunks.map((c) => c.id) } },
    })
    console.log(`[knowledge-indexer] Enforced chunk cap: deleted ${oldestChunks.length} oldest chunks`)
  }
}

export async function indexDocument(documentId: string): Promise<number> {
  const doc = await prisma.knowledgeDocument.findUnique({ where: { id: documentId } })
  if (!doc) throw new Error('Document not found')

  // Remove old chunks for this document
  await prisma.knowledgeChunk.deleteMany({ where: { documentId } })

  const textChunks = chunkText(doc.content)

  for (let i = 0; i < textChunks.length; i++) {
    let embedding: number[] | null = null
    try {
      embedding = await getEmbedding(textChunks[i])
    } catch (err) {
      console.warn(`[knowledge-indexer] Embedding failed for chunk ${i}, storing without vector:`, err)
    }

    if (embedding) {
      await prisma.$executeRaw`
        INSERT INTO knowledge_chunks (id, document_id, chunk_index, content, embedding, created_at)
        VALUES (gen_random_uuid(), ${documentId}::text, ${i}, ${textChunks[i]}, ${embedding}::vector, NOW())
      `
    } else {
      // Store chunk without embedding — can be re-indexed later
      await prisma.knowledgeChunk.create({
        data: {
          documentId,
          chunkIndex: i,
          content: textChunks[i],
        },
      })
    }
  }

  // Enforce storage cap after indexing
  await enforceChunkCap()

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
