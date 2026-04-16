export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { broadcastPushNotification } from '@/lib/fcm'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  courseId: z.string().optional(),
})

/**
 * GET /api/v1/admin/exams
 * List all exams, admin only
 */
export async function GET(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) return ERRORS.VALIDATION('Invalid query parameters')

    const { page, limit, courseId } = parsed.data
    const skip = (page - 1) * limit

    const where: any = {
      ...(courseId ? { courseId } : {}),
    }

    const [items, total] = await prisma.$transaction([
      prisma.exam.findMany({
        where,
        orderBy: { examDate: 'desc' },
        skip,
        take: limit,
        include: {
          course: { select: { id: true, code: true, name: true } },
        },
      }),
      prisma.exam.count({ where }),
    ])

    return ok(items, { page, limit, total, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('[Admin Exams] GET error:', error)
    return ERRORS.INTERNAL()
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  courseId: z.string().min(1),
  examDate: z.string().min(1), // ISO date string
  duration: z.number().int().min(1).optional(),
  room: z.string().max(100).optional(),
  syllabus: z.string().max(2000).optional(),
})

/**
 * POST /api/v1/admin/exams
 * Create an exam, admin only
 */
export async function POST(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION(parsed.error.errors[0]?.message || 'Invalid data')

    const { title, description, courseId, examDate, duration, room, syllabus } = parsed.data

    // Verify course exists
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) return ERRORS.NOT_FOUND('Course')

    const exam = await prisma.exam.create({
      data: {
        title,
        description: description || null,
        courseId,
        examDate: new Date(examDate),
        duration: duration || null,
        room: room || null,
        syllabus: syllabus || null,
      },
      include: {
        course: { select: { id: true, code: true, name: true } },
      },
    })

    await logAudit(session.user.id, 'CREATE', 'exam', exam.id, { title, courseId })

    // Send push notification (non-blocking)
    broadcastPushNotification(
      `New Exam: ${title}`,
      `${course.code} — ${new Date(examDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      '/exams'
    ).catch((err) => console.error('[Push] Broadcast failed:', err))

    return ok(exam)
  } catch (error) {
    console.error('[Admin Exams] POST error:', error)
    return ERRORS.INTERNAL()
  }
}
