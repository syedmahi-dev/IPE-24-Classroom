export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { indexDocument } from '@/lib/knowledge-indexer'
import { z } from 'zod'

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || ''

const ingestSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1).max(50000),
  sourceType: z.string().min(1).max(50),
  sourceId: z.string().min(1).max(100),
  sourceChannel: z.string().max(100).optional(),
  courseCode: z.string().max(20).optional(),
})

/**
 * POST /api/v1/internal/knowledge
 * 
 * Called by the discord-listener to auto-ingest messages into the RAG knowledge base.
 * Authenticated via x-internal-secret header.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!secret || secret !== INTERNAL_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = ingestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid data' },
        { status: 400 }
      )
    }

    const { title, content, sourceType, sourceId, sourceChannel, courseCode } = parsed.data

    // Manual find + create/update (avoids Prisma compound unique constraint issues)
    const existing = await prisma.knowledgeDocument.findFirst({
      where: { sourceType, sourceId },
    })

    let doc
    if (existing) {
      doc = await prisma.knowledgeDocument.update({
        where: { id: existing.id },
        data: {
          title,
          content,
          sourceChannel: sourceChannel || null,
          courseCode: courseCode || null,
        },
      })
    } else {
      doc = await prisma.knowledgeDocument.create({
        data: {
          title,
          content,
          sourceType,
          sourceId,
          sourceChannel: sourceChannel || null,
          courseCode: courseCode || null,
        },
      })
    }

    // Auto-index: chunk and embed
    let chunkCount = 0
    try {
      chunkCount = await indexDocument(doc.id)
    } catch (err) {
      console.error('[Internal Knowledge] Indexing failed (document saved without embeddings):', err)
    }

    return NextResponse.json({
      success: true,
      data: { documentId: doc.id, chunkCount },
    })
  } catch (error) {
    console.error('[Internal Knowledge] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
