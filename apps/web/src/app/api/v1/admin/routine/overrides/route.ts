export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { notifyAll } from '@/lib/notifications'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  type: z.enum(['CANCELLED', 'MAKEUP', 'ROOM_CHANGE', 'TIME_CHANGE']).optional(),
  from: z.string().optional(), // ISO date
  to: z.string().optional(),   // ISO date
})

/**
 * GET /api/v1/admin/routine/overrides
 * List all routine overrides
 */
export async function GET(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) return ERRORS.VALIDATION('Invalid query parameters')

    const { page, limit, type, from, to } = parsed.data
    const skip = (page - 1) * limit

    const where: any = {
      ...(type ? { type } : {}),
      ...(from || to ? {
        date: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      } : {}),
    }

    const [items, total] = await prisma.$transaction([
      prisma.routineOverride.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: {
          baseRoutine: {
            select: { id: true, courseCode: true, courseName: true, dayOfWeek: true, startTime: true, endTime: true, room: true },
          },
        },
      }),
      prisma.routineOverride.count({ where }),
    ])

    return ok(items, { page, limit, total, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('[Admin Overrides] GET error:', error)
    return ERRORS.INTERNAL()
  }
}

const createSchema = z.object({
  date: z.string().min(1), // ISO date string
  type: z.enum(['CANCELLED', 'MAKEUP', 'ROOM_CHANGE', 'TIME_CHANGE']),
  baseRoutineId: z.string().optional(),
  courseCode: z.string().max(20).optional(),
  courseName: z.string().max(200).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format').optional(),
  room: z.string().max(50).optional(),
  teacher: z.string().max(100).optional(),
  targetGroup: z.enum(['ALL', 'ODD', 'EVEN']).default('ALL'),
  reason: z.string().max(500).optional(),
})

/**
 * POST /api/v1/admin/routine/overrides
 * Create a routine override (cancel, makeup, room/time change)
 */
export async function POST(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION(parsed.error.errors[0]?.message || 'Invalid data')

    // Validate base routine exists if linking
    if (parsed.data.baseRoutineId) {
      const base = await prisma.baseRoutine.findUnique({ where: { id: parsed.data.baseRoutineId } })
      if (!base) return ERRORS.NOT_FOUND('Base routine entry')
    }

    // For MAKEUP type, courseCode is required
    if (parsed.data.type === 'MAKEUP' && !parsed.data.courseCode) {
      return ERRORS.VALIDATION('Course code is required for makeup classes')
    }

    const override = await prisma.routineOverride.create({
      data: {
        date: new Date(parsed.data.date),
        type: parsed.data.type,
        baseRoutineId: parsed.data.baseRoutineId || null,
        courseCode: parsed.data.courseCode || null,
        courseName: parsed.data.courseName || null,
        startTime: parsed.data.startTime || null,
        endTime: parsed.data.endTime || null,
        room: parsed.data.room || null,
        teacher: parsed.data.teacher || null,
        targetGroup: parsed.data.targetGroup,
        reason: parsed.data.reason || null,
        createdById: session.user.id,
      },
      include: {
        baseRoutine: {
          select: { id: true, courseCode: true, courseName: true, dayOfWeek: true },
        },
      },
    })

    await logAudit(session.user.id, 'CREATE', 'routine_override', override.id, {
      type: parsed.data.type,
      date: parsed.data.date,
      courseCode: parsed.data.courseCode,
      reason: parsed.data.reason,
    })

    // Persist notification records + push broadcast (non-blocking)
    const overrideDate = new Date(parsed.data.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
    const courseLabel = parsed.data.courseCode || parsed.data.courseName || 'a class'
    const notifyBodyMap: Record<string, string> = {
      CANCELLED: `${courseLabel} is CANCELLED on ${overrideDate}.`,
      MAKEUP: `Makeup class for ${courseLabel} on ${overrideDate}${parsed.data.startTime ? ' at ' + parsed.data.startTime : ''}.`,
      TIME_CHANGE: `${courseLabel} time changed on ${overrideDate}${parsed.data.startTime ? ' to ' + parsed.data.startTime : ''}.`,
      ROOM_CHANGE: `${courseLabel} room changed on ${overrideDate}${parsed.data.room ? ' to ' + parsed.data.room : ''}.`,
    }
    notifyAll({
      title: 'Schedule Change',
      body: notifyBodyMap[parsed.data.type] ?? `Routine update for ${overrideDate}.`,
      link: '/routine',
    }).catch((err) => console.error('[Notify] Override broadcast failed:', err))

    return ok(override)
  } catch (error) {
    console.error('[Admin Overrides] POST error:', error)
    return ERRORS.INTERNAL()
  }
}
