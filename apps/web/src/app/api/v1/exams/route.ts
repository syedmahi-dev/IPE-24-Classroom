export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  type: z.enum(['EXAM', 'ASSIGNMENT']).optional(),
})

/**
 * GET /api/v1/exams
 * Fetches the list of upcoming and past exams
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) {
      return ERRORS.VALIDATION('Invalid query parameters')
    }

    const { page, limit, type } = parsed.data
    const skip = (page - 1) * limit

    const where = { isActive: true, ...(type ? { type } : {}) }

    const [items, total] = await prisma.$transaction([
      prisma.exam.findMany({
        where,
        include: {
          course: {
            select: { code: true, name: true }
          },
          submissions: {
            where: { studentId: session.user.id }
          }
        },
        orderBy: { examDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.exam.count({ where })
    ])

    return ok(items, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('[Exams] GET error:', error)
    return ERRORS.INTERNAL()
  }
}
