import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  date: z.string().optional(), // ISO date string — if provided, returns merged view for that date
  week: z.string().optional(), // ISO date string — if provided, returns merged view for the full week
})

/**
 * Determine student lab group from studentId last digit
 */
function getStudentGroup(studentId: string | null | undefined): 'ODD' | 'EVEN' | null {
  if (!studentId) return null
  const lastDigit = parseInt(studentId.slice(-1), 10)
  if (isNaN(lastDigit)) return null
  return lastDigit % 2 === 0 ? 'EVEN' : 'ODD'
}

/**
 * Get the Monday of the week for a given date
 */
function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * Get the day name from a Date
 */
function getDayName(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long' })
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
      const monday = week ? getMonday(targetDate) : targetDate

      // Determine date range
      const startDate = new Date(monday)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(monday)
      if (week) {
        endDate.setDate(endDate.getDate() + 4) // Monday to Friday
      }
      endDate.setHours(23, 59, 59, 999)

      // Get days to query
      const days: string[] = []
      if (week) {
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        days.push(...dayNames)
      } else {
        days.push(getDayName(targetDate))
      }

      // Fetch base routines for the relevant days
      const baseRoutines = await prisma.baseRoutine.findMany({
        where: {
          dayOfWeek: { in: days },
          targetGroup: { in: groupFilter },
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      })

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
      const merged = baseRoutines.map((base) => {
        const override = overrides.find(
          (o) => o.baseRoutineId === base.id &&
                 (o.type === 'CANCELLED' || o.type === 'ROOM_CHANGE' || o.type === 'TIME_CHANGE')
        )

        if (override?.type === 'CANCELLED') {
          return {
            ...base,
            status: 'CANCELLED' as const,
            reason: override.reason,
            overrideId: override.id,
          }
        }

        if (override?.type === 'ROOM_CHANGE') {
          return {
            ...base,
            room: override.room || base.room,
            status: 'ROOM_CHANGED' as const,
            originalRoom: base.room,
            reason: override.reason,
            overrideId: override.id,
          }
        }

        if (override?.type === 'TIME_CHANGE') {
          return {
            ...base,
            startTime: override.startTime || base.startTime,
            endTime: override.endTime || base.endTime,
            room: override.room || base.room,
            status: 'TIME_CHANGED' as const,
            originalStartTime: base.startTime,
            originalEndTime: base.endTime,
            reason: override.reason,
            overrideId: override.id,
          }
        }

        return { ...base, status: 'NORMAL' as const }
      })

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
