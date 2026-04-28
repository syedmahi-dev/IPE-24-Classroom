import { prisma } from './prisma'

export interface SearchResult {
  id: string
  content: string
  document_id: string
  title: string
  source_type: string
  course_code: string | null
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
      kc.document_id,
      kd.title,
      kd.source_type,
      kd.course_code,
      1 - (kc.embedding <=> ${queryEmbedding}::vector) AS similarity
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kc.document_id = kd.id
    WHERE kc.embedding IS NOT NULL
    ORDER BY kc.embedding <=> ${queryEmbedding}::vector
    LIMIT ${topK}
  `
  // Filter by relevance threshold — 0.45 is lower than before (0.55)
  // because Gemini embeddings have different distribution than MiniLM
  return results.filter((r) => r.similarity > 0.45)
}
