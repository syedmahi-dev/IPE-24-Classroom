import { prisma } from './prisma'

export interface SearchResult {
  id: string
  content: string
  documentId: string
  title: string
  sourceType: string
  courseCode: string | null
  similarity: number
}

/**
 * Search the knowledge base using cosine similarity on 768-dim Gemini embeddings.
 * Returns top-K chunks above the relevance threshold.
 */
export async function searchKnowledge(queryEmbedding: number[], topK = 5): Promise<SearchResult[]> {
  const results = await prisma.$queryRaw<SearchResult[]>`
    SELECT
      kc.id,
      kc.content,
      kc."documentId",
      kd.title,
      kd."sourceType",
      kd."courseCode",
      1 - (kc.embedding <=> ${queryEmbedding}::vector) AS similarity
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kc."documentId" = kd.id
    WHERE kc.embedding IS NOT NULL
    ORDER BY kc.embedding <=> ${queryEmbedding}::vector
    LIMIT ${topK}
  `
  // Filter by relevance threshold — 0.45 is lower than before (0.55)
  // because Gemini embeddings have different distribution than MiniLM
  return results.filter((r) => r.similarity > 0.45)
}
