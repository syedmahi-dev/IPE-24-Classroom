export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { notifyAll } from '@/lib/notifications'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  type: z.enum(['general', 'exam', 'file_update', 'routine_update', 'urgent', 'event', 'course_update']).optional(),
  search: z.string().optional(),
})

/**
 * GET /api/v1/admin/announcements
 * List all announcements (including unpublished), admin only
 */
export async function GET(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) return ERRORS.VALIDATION('Invalid query parameters')

    const { page, limit, type, search } = parsed.data
    const skip = (page - 1) * limit

    const where: any = {
      ...(type ? { type } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { body: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    }

    const [items, total] = await prisma.$transaction([
      prisma.announcement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          author: { select: { id: true, name: true, avatarUrl: true, role: true } },
          courses: { include: { course: { select: { id: true, code: true, name: true } } } },
        },
      }),
      prisma.announcement.count({ where }),
    ])

    return ok(items, { page, limit, total, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('[Admin Announcements] GET error:', error)
    return ERRORS.INTERNAL()
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  type: z.enum(['general', 'exam', 'file_update', 'routine_update', 'urgent', 'event', 'course_update']).default('general'),
  isPublished: z.boolean().default(true),
  courseIds: z.array(z.string()).optional(),
})

/**
 * POST /api/v1/admin/announcements
 * Create a new announcement, admin only
 */
export async function POST(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION(parsed.error.errors[0]?.message || 'Invalid data')

    const { title, body: content, type: manualType, isPublished, courseIds: manualCourseIds } = parsed.data

    // AI Categorization Logic
    let finalType = manualType
    let finalCourseIds = manualCourseIds || []

    // Only run Gemini if type is general or if it's a new announcement
    // to avoid overriding intentional manual categorization
    const { categorizeAnnouncement } = await import('@/lib/gemini')
    const aiResult = await categorizeAnnouncement(title, content)

    if (aiResult) {
      if (manualType === 'general' && aiResult.category !== 'general') {
        finalType = aiResult.category as any
      }

      // Automatically link courses if courseCodes are found and not manually specified
      if (finalCourseIds.length === 0 && aiResult.courseCodes.length > 0) {
        const matchingCourses = await prisma.course.findMany({
          where: {
            OR: aiResult.courseCodes.map(code => ({
              code: { contains: code, mode: 'insensitive' }
            }))
          },
          select: { id: true }
        })
        finalCourseIds = matchingCourses.map(c => c.id)
      }
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        body: content,
        type: finalType,
        authorId: session.user.id,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        courses: finalCourseIds.length
          ? { create: finalCourseIds.map((courseId) => ({ courseId })) }
          : undefined,
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, role: true } },
        courses: { include: { course: true } },
      },
    })

    await logAudit(session.user.id, 'CREATE', 'announcement', announcement.id, { title, type })

    // Persist notification records + push broadcast (non-blocking)
    if (isPublished) {
      notifyAll({
        title,
        body: content.length > 120 ? content.slice(0, 120) + '…' : content,
        link: '/announcements',
      }).catch((err) => console.error('[Notify] Announcement broadcast failed:', err))
    }

    return ok(announcement)
  } catch (error) {
    console.error('[Admin Announcements] POST error:', error)
    return ERRORS.INTERNAL()
  }
}
