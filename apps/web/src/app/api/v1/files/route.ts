import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(50),
})

/**
 * GET /api/v1/files
 * Fetch resources/files correctly
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

    const { page, limit } = parsed.data
    const skip = (page - 1) * limit

    const [items, total] = await prisma.$transaction([
      prisma.fileUpload.findMany({
        orderBy: { createdAt: 'desc' },
        include: { course: true, uploadedBy: true },
        skip,
        take: limit,
      }),
      prisma.fileUpload.count()
    ])

    return ok(items, {
      page, limit, total, totalPages: Math.ceil(total / Math.max(1, limit))
    })
  } catch (error) {
    console.error('[Files] GET error:', error)
    return ERRORS.INTERNAL()
  }
}
