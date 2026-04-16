import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  day: z.string().optional(),
  targetGroup: z.enum(['ALL', 'ODD', 'EVEN']).optional(),
})

/**
 * GET /api/v1/admin/routine
 * List all base routines (semester schedule)
 */
export async function GET(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) return ERRORS.VALIDATION('Invalid query parameters')

    const { page, limit, day, targetGroup } = parsed.data
    const skip = (page - 1) * limit

    const where: any = {
      ...(day ? { dayOfWeek: day } : {}),
      ...(targetGroup ? { targetGroup } : {}),
    }

    const [items, total] = await prisma.$transaction([
      prisma.baseRoutine.findMany({
        where,
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' },
        ],
        skip,
        take: limit,
      }),
      prisma.baseRoutine.count({ where }),
    ])

    return ok(items, { page, limit, total, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('[Admin Routine] GET error:', error)
    return ERRORS.INTERNAL()
  }
}

const createSchema = z.object({
  courseCode: z.string().min(1).max(20),
  courseName: z.string().max(200).optional(),
  dayOfWeek: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  room: z.string().min(1).max(50),
  teacher: z.string().max(100).optional(),
  targetGroup: z.enum(['ALL', 'ODD', 'EVEN']).default('ALL'),
  isLab: z.boolean().default(false),
  semester: z.string().max(50).optional(),
})

/**
 * POST /api/v1/admin/routine
 * Create a new base routine entry
 */
export async function POST(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION(parsed.error.errors[0]?.message || 'Invalid data')

    const routine = await prisma.baseRoutine.create({
      data: {
        courseCode: parsed.data.courseCode,
        courseName: parsed.data.courseName || null,
        dayOfWeek: parsed.data.dayOfWeek,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        room: parsed.data.room,
        teacher: parsed.data.teacher || null,
        targetGroup: parsed.data.targetGroup,
        isLab: parsed.data.isLab,
        semester: parsed.data.semester || null,
      },
    })

    await logAudit(session.user.id, 'CREATE', 'base_routine', routine.id, {
      courseCode: parsed.data.courseCode,
      dayOfWeek: parsed.data.dayOfWeek,
      targetGroup: parsed.data.targetGroup,
    })

    return ok(routine)
  } catch (error) {
    console.error('[Admin Routine] POST error:', error)
    return ERRORS.INTERNAL()
  }
}
