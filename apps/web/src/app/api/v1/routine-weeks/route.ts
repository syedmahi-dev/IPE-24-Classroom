export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'

// ── Helpers ──────────────────────────────────────────────

/** Get Monday 00:00:00 UTC for a given date */
function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setUTCHours(0, 0, 0, 0)
  return date
}

/** Derive weekType from workingWeekNumber: odd → A, even → B */
function deriveWeekType(n: number | null): 'A' | 'B' | null {
  if (n === null) return null
  return n % 2 === 1 ? 'A' : 'B'
}

// ── Validation ───────────────────────────────────────────

const querySchema = z.object({
  from: z.string().optional(),  // ISO date — start of range
  to: z.string().optional(),    // ISO date — end of range
  current: z.coerce.boolean().optional(), // if true, return only the current week
})

const skipWeekSchema = z.object({
  calendarWeekStart: z.string().refine((s) => !isNaN(Date.parse(s)), 'Invalid date'),
  skippedReason: z.string().min(1).max(200).optional(),
})

const unskipWeekSchema = z.object({
  calendarWeekStart: z.string().refine((s) => !isNaN(Date.parse(s)), 'Invalid date'),
})

// ── GET: Fetch routine weeks ─────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await auth() as any
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) return ERRORS.VALIDATION('Invalid query parameters')

    const { from, to, current } = parsed.data

    // Current week shortcut
    if (current) {
      const monday = getMonday(new Date())
      const week = await prisma.routineWeek.findUnique({
        where: { calendarWeekStart: monday },
      })

      if (!week) {
        // Auto-create current week if it doesn't exist
        const created = await autoCreateWeek(monday)
        return ok(created)
      }
      return ok(week)
    }

    // Range query
    const where: any = {}
    if (from) where.calendarWeekStart = { ...where.calendarWeekStart, gte: new Date(from) }
    if (to) where.calendarWeekStart = { ...where.calendarWeekStart, lte: new Date(to) }

    const weeks = await prisma.routineWeek.findMany({
      where,
      orderBy: { calendarWeekStart: 'asc' },
    })

    return ok(weeks)
  } catch (error) {
    console.error('[RoutineWeeks] GET error:', error)
    return ERRORS.INTERNAL()
  }
}

// ── POST: Skip or unskip a week ─────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth() as any
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    // admin, super_admin, and CR can manage week skips
    const role = session.user.role as string
    if (role !== 'admin' && role !== 'super_admin' && role !== 'cr') {
      return ERRORS.FORBIDDEN()
    }

    const body = await req.json()
    const action = body.action as string

    if (action === 'skip') {
      const parsed = skipWeekSchema.safeParse(body)
      if (!parsed.success) return ERRORS.VALIDATION('Invalid skip data')

      const monday = getMonday(new Date(parsed.data.calendarWeekStart))

      // Upsert the week as skipped
      const week = await prisma.routineWeek.upsert({
        where: { calendarWeekStart: monday },
        update: {
          isSkipped: true,
          skippedReason: parsed.data.skippedReason || null,
          workingWeekNumber: null,
          weekType: null,
          markedById: session.user.id,
          markedAt: new Date(),
        },
        create: {
          calendarWeekStart: monday,
          isSkipped: true,
          skippedReason: parsed.data.skippedReason || null,
          workingWeekNumber: null,
          weekType: null,
          markedById: session.user.id,
          markedAt: new Date(),
        },
      })

      // Recalculate all subsequent working weeks
      await recalculateWorkingWeeks()

      // Return updated week
      const updated = await prisma.routineWeek.findUnique({
        where: { id: week.id },
      })
      return ok(updated)
    }

    if (action === 'unskip') {
      const parsed = unskipWeekSchema.safeParse(body)
      if (!parsed.success) return ERRORS.VALIDATION('Invalid unskip data')

      const monday = getMonday(new Date(parsed.data.calendarWeekStart))

      const existing = await prisma.routineWeek.findUnique({
        where: { calendarWeekStart: monday },
      })

      if (!existing) return ERRORS.NOT_FOUND('RoutineWeek')

      await prisma.routineWeek.update({
        where: { id: existing.id },
        data: {
          isSkipped: false,
          skippedReason: null,
          markedById: session.user.id,
          markedAt: new Date(),
        },
      })

      // Recalculate all working weeks
      await recalculateWorkingWeeks()

      const updated = await prisma.routineWeek.findUnique({
        where: { id: existing.id },
      })
      return ok(updated)
    }

    return ERRORS.VALIDATION('Invalid action. Use "skip" or "unskip".')
  } catch (error) {
    console.error('[RoutineWeeks] POST error:', error)
    return ERRORS.INTERNAL()
  }
}

// ── Internal: Auto-create a week record ──────────────────

async function autoCreateWeek(monday: Date) {
  // Count existing non-skipped weeks before this one to determine workingWeekNumber
  const priorWeeks = await prisma.routineWeek.count({
    where: {
      calendarWeekStart: { lt: monday },
      isSkipped: false,
    },
  })

  const workingWeekNumber = priorWeeks + 1
  const weekType = deriveWeekType(workingWeekNumber)

  return prisma.routineWeek.create({
    data: {
      calendarWeekStart: monday,
      workingWeekNumber,
      weekType,
      isSkipped: false,
    },
  })
}

// ── Internal: Recalculate all working week numbers ───────

async function recalculateWorkingWeeks() {
  const allWeeks = await prisma.routineWeek.findMany({
    orderBy: { calendarWeekStart: 'asc' },
  })

  let counter = 0
  for (const week of allWeeks) {
    if (week.isSkipped) {
      await prisma.routineWeek.update({
        where: { id: week.id },
        data: { workingWeekNumber: null, weekType: null },
      })
    } else {
      counter++
      const weekType = deriveWeekType(counter)
      await prisma.routineWeek.update({
        where: { id: week.id },
        data: { workingWeekNumber: counter, weekType },
      })
    }
  }
}
