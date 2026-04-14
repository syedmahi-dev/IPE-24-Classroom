import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().optional(),
})

/**
 * GET /api/v1/admin/knowledge
 * List knowledge documents with chunk counts, admin only
 */
export async function GET(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) return ERRORS.VALIDATION('Invalid query parameters')

    const { page, limit, search } = parsed.data
    const skip = (page - 1) * limit

    const where: any = search
      ? { title: { contains: search, mode: 'insensitive' } }
      : {}

    const [items, total] = await prisma.$transaction([
      prisma.knowledgeDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { chunks: true } },
        },
      }),
      prisma.knowledgeDocument.count({ where }),
    ])

    return ok(items, { page, limit, total, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('[Admin Knowledge] GET error:', error)
    return ERRORS.INTERNAL()
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(300),
  sourceType: z.enum(['pdf', 'notes', 'syllabus', 'other']).default('other'),
  courseCode: z.string().max(20).optional(),
  content: z.string().min(1).max(50000),
})

/**
 * POST /api/v1/admin/knowledge
 * Create a knowledge document, admin only
 */
export async function POST(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION(parsed.error.errors[0]?.message || 'Invalid data')

    const { title, sourceType, courseCode, content } = parsed.data

    const doc = await prisma.knowledgeDocument.create({
      data: {
        title,
        sourceType,
        courseCode: courseCode || null,
        content,
      },
      include: { _count: { select: { chunks: true } } },
    })

    await logAudit(session.user.id, 'CREATE', 'knowledge_document', doc.id, { title, sourceType })

    return ok(doc)
  } catch (error) {
    console.error('[Admin Knowledge] POST error:', error)
    return ERRORS.INTERNAL()
  }
}
