export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { 
  getStudentGroup, 
  getMonday, 
  getDayName, 
  getEffectiveWeekParity, 
  matchesWeekParity, 
  mergeRoutines 
} from '@/lib/routine-logic'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  date: z.string().optional(), // ISO date string — if provided, returns merged view for that date
  week: z.string().optional(), // ISO date string — if provided, returns merged view for the full week
})

/**
 * Look up the current week type (A or B) from the RoutineWeek table.
 * Falls back to ISO-week parity if no record exists yet.
 */
async function getWeekType(monday: Date): Promise<{ weekType: 'A' | 'B'; workingWeekNumber: number | null; isSkipped: boolean }> {
  const routineWeek = await prisma.routineWeek.findUnique({
    where: { calendarWeekStart: monday },
  })

  if (routineWeek) {
    if (routineWeek.isSkipped) {
      return { weekType: 'A', workingWeekNumber: null, isSkipped: true }
    }
    return {
      weekType: (routineWeek.weekType as 'A' | 'B') || 'A',
      workingWeekNumber: routineWeek.workingWeekNumber,
      isSkipped: false,
    }
  }

  // Fallback: auto-create the week record
  const priorWeeks = await prisma.routineWeek.count({
    where: { calendarWeekStart: { lt: monday }, isSkipped: false },
  })
  const workingWeekNumber = priorWeeks + 1
  const weekType = workingWeekNumber % 2 === 1 ? 'A' : 'B'

  await prisma.routineWeek.create({
    data: {
      calendarWeekStart: monday,
      workingWeekNumber,
      weekType,
      isSkipped: false,
    },
  })

  return { weekType: weekType as 'A' | 'B', workingWeekNumber, isSkipped: false }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth() as any
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) return ERRORS.VALIDATION('Invalid query')

    const { page, limit, date, week } = parsed.data
    const studentGroup = getStudentGroup(session.user.studentId)
    const groupFilter = studentGroup ? ['ALL', studentGroup] : ['ALL']

    // If a specific date or week is requested, return merged view
    if (date || week) {
      const targetDate = new Date(date || week || new Date().toISOString())
      const monday = week ? getMonday(targetDate) : getMonday(targetDate)

      // Determine date range
      const startDate = week ? new Date(monday) : new Date(targetDate)
      startDate.setUTCHours(0, 0, 0, 0)
      const endDate = week ? new Date(monday) : new Date(targetDate)
      if (week) {
        endDate.setDate(endDate.getDate() + 4) // Monday to Friday
      }
      endDate.setUTCHours(23, 59, 59, 999)

      // Get days to query
      const days: string[] = []
      if (week) {
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        days.push(...dayNames)
      } else {
        days.push(getDayName(targetDate))
      }

      // Look up working-week type from RoutineWeek table
      const weekInfo = await getWeekType(monday)
      const effectiveParity = getEffectiveWeekParity(weekInfo.weekType, studentGroup)

      // Fetch base routines for the relevant days
      const baseRoutines = await prisma.baseRoutine.findMany({
        where: {
          dayOfWeek: { in: days },
          targetGroup: { in: groupFilter },
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      })

      // Filter biweekly labs using the working-week derived parity
      const filteredRoutines = baseRoutines.filter(
        (r) => matchesWeekParity(r, effectiveParity)
      )

      // Fetch overrides for the date range
      const overrides = await prisma.routineOverride.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          targetGroup: { in: groupFilter },
        },
        include: {
          baseRoutine: { select: { id: true, courseCode: true, courseName: true } },
        },
      })

      // Merge: build the final schedule
      const merged = mergeRoutines(filteredRoutines, overrides)

      // Add makeup classes
      const makeups = overrides
        .filter((o) => o.type === 'MAKEUP')
        .map((o) => ({
          id: o.id,
          courseCode: o.courseCode || 'MAKEUP',
          courseName: o.courseName || 'Makeup Class',
          dayOfWeek: getDayName(new Date(o.date)),
          startTime: o.startTime || '00:00',
          endTime: o.endTime || '00:00',
          room: o.room || 'TBD',
          teacher: o.teacher,
          targetGroup: o.targetGroup,
          isLab: false,
          semester: null,
          createdAt: o.createdAt,
          status: 'MAKEUP' as const,
          reason: o.reason,
          overrideId: o.id,
        }))

      const finalSchedule = [...merged, ...makeups].sort((a, b) => {
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        const dayDiff = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek)
        if (dayDiff !== 0) return dayDiff
        return a.startTime.localeCompare(b.startTime)
      })

      return ok(finalSchedule, {
        studentGroup,
        weekType: weekInfo.weekType,
        workingWeekNumber: weekInfo.workingWeekNumber,
        isSkippedWeek: weekInfo.isSkipped,
        dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
      })
    }

    // Default: return raw base routines (paginated)
    const skip = (page - 1) * limit
    const [items, total] = await prisma.$transaction([
      prisma.baseRoutine.findMany({
        where: { targetGroup: { in: groupFilter } },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.baseRoutine.count({ where: { targetGroup: { in: groupFilter } } }),
    ])

    // Add status field for consistency
    const itemsWithStatus = items.map((item) => ({
      ...item,
      status: 'NORMAL' as const,
    }))

    return ok(itemsWithStatus, {
      page, limit, total,
      totalPages: Math.ceil(total / Math.max(limit, 1)),
      studentGroup,
    })
  } catch (error) {
    console.error('[Routine] GET error:', error)
    return ERRORS.INTERNAL()
  }
}
