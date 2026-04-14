import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  type: z.enum(['general', 'exam', 'file_update', 'routine_update', 'urgent', 'event']).optional(),
})

/**
 * GET /api/v1/announcements
 * Fetch paginated announcements with optional type filtering
 * Requires auth (any authenticated user)
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return ERRORS.UNAUTHORIZED()

  try {
    // Parse and validate query parameters
    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) {
      return ERRORS.VALIDATION('Invalid query parameters')
    }

    const { page, limit, type } = parsed.data
    const skip = (page - 1) * limit

    // Fetch announcements with filtering
    const [items, total] = await prisma.$transaction([
      prisma.announcement.findMany({
        where: {
          isPublished: true,
          ...(type ? { type } : {}),
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
        include: {
          author: { select: { name: true, avatarUrl: true, role: true } },
          courses: { include: { course: true } },
        },
      }),
      prisma.announcement.count({
        where: {
          isPublished: true,
          ...(type ? { type } : {}),
        },
      }),
    ])

    return ok(items, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('[Announcements] GET error:', error)
    return ERRORS.INTERNAL()
  }
}

/**
 * POST /api/v1/announcements
 * Create a new announcement (admin only)
 */
const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  type: z.enum(['general', 'exam', 'file_update', 'routine_update', 'urgent', 'event']).default('general'),
  courseIds: z.array(z.string()).optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return ERRORS.UNAUTHORIZED()

  // Only admin and above can create announcements
  if (!['admin', 'super_admin'].includes(session.user.role)) {
    return ERRORS.FORBIDDEN()
  }

  try {
    const body = await req.json()
    const parsed = createAnnouncementSchema.safeParse(body)
    if (!parsed.success) {
      return ERRORS.VALIDATION(parsed.error.errors[0]?.message || 'Invalid announcement data')
    }

    const { title, body: content, type, courseIds } = parsed.data

    // Create announcement
    const announcement = await prisma.announcement.create({
      data: {
        title,
        body: content,
        type,
        authorId: session.user.id,
        isPublished: true,
        publishedAt: new Date(),
        courses: courseIds
          ? {
              create: courseIds.map((courseId) => ({
                courseId,
              })),
            }
          : undefined,
      },
      include: {
        author: { select: { name: true, avatarUrl: true, role: true } },
        courses: { include: { course: true } },
      },
    })

    // TODO: Publish to WhatsApp, Discord, push notifications
    // TODO: Log audit entry

    return ok(announcement)
  } catch (error) {
    console.error('[Announcements] POST error:', error)
    return ERRORS.INTERNAL()
  }
}
