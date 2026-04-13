import { prisma } from './prisma'

export async function searchKnowledge(queryEmbedding: number[], topK = 5) {
  const results = await prisma.$queryRaw<
    Array<{
      id: string
      content: string
      document_id: string
      title: string
      source_type: string
      course_code: string | null
      similarity: number
    }>
  >`
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
  return results.filter((r) => r.similarity > 0.55)
}
