export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(50),
  courseId: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  folderType: z.enum(['course', 'category']).optional(),
})

/**
 * GET /api/v1/files
 * Fetch resources/files with folder-aware filtering
 *
 * Folder filtering:
 *   - ?folderType=course&courseId=xxx  → files within a course folder
 *   - ?folderType=category&category=lecture_notes → files in a doc-type folder (no course)
 *   - No folderType → all files (backwards compatible)
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

    const { page, limit, courseId, category, search, folderType } = parsed.data
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (folderType === 'course' && courseId) {
      where.courseId = courseId
    } else if (folderType === 'category' && category) {
      where.courseId = null
      where.category = category
    } else {
      // Legacy/unfiltered: apply individual filters if provided
      if (courseId) where.courseId = courseId
      if (category) where.category = category
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const [items, total] = await prisma.$transaction([
      prisma.fileUpload.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          course: { select: { id: true, code: true, name: true } },
          uploadedBy: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
      }),
      prisma.fileUpload.count({ where })
    ])

    return ok(items, {
      page, limit, total, totalPages: Math.ceil(total / Math.max(1, limit))
    })
  } catch (error) {
    console.error('[Files] GET error:', error)
    return ERRORS.INTERNAL()
  }
}
