export const dynamic = 'force-dynamic'
import { requireInternalSecret } from '@/lib/api-guards'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { ok, ERRORS } from '@/lib/api-response'
import { notifyAll } from '@/lib/notifications'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { NextRequest } from 'next/server'

const overrideSchema = z.object({
  type: z.enum(['CANCELLED', 'MAKEUP', 'ROOM_CHANGE', 'TIME_CHANGE']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  courseCode: z.string().min(1).max(20),
  courseName: z.string().max(200).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format').optional(),
  room: z.string().max(50).optional(),
  teacher: z.string().max(100).optional(),
  targetGroup: z.enum(['ALL', 'ODD', 'EVEN']).default('ALL'),
  weekParity: z.enum(['ALL', 'WEEK_A', 'WEEK_B']).default('ALL'),
  reason: z.string().max(500).optional(),
})

const bodySchema = z.object({
  overrides: z.array(overrideSchema).min(1).max(10),
})

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * POST /api/v1/internal/routine/overrides
 * Creates routine overrides from the discord-listener bot (via Gemini extraction).
 * Auto-links each override to the matching BaseRoutine by courseCode + dayOfWeek.
 */
export async function POST(req: NextRequest) {
  const { error } = requireInternalSecret(req)
  if (error) return error

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return ERRORS.VALIDATION('Invalid JSON body')
  }

  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) return ERRORS.VALIDATION(parsed.error.errors[0]?.message || 'Invalid data')

  const systemUserId = await getSystemUserId()
  const created: string[] = []
  const errors: string[] = []

  for (const ov of parsed.data.overrides) {
    try {
      // Calculate day of week from date
      const dateObj = new Date(ov.date + 'T00:00:00')
      const dayOfWeek = DAY_NAMES[dateObj.getDay()]

      // Normalize course code for matching
      const normalizedCode = ov.courseCode.toUpperCase().replace(/\s+/g, '')

      // Try to find matching BaseRoutine
      const baseRoutine = await prisma.baseRoutine.findFirst({
        where: {
          courseCode: {
            equals: normalizedCode,
            mode: 'insensitive',
          },
          dayOfWeek,
          archivedAt: null,
        },
        select: { id: true, courseCode: true, courseName: true },
      })

      const override = await prisma.routineOverride.create({
        data: {
          date: dateObj,
          type: ov.type,
          baseRoutineId: baseRoutine?.id || null,
          courseCode: normalizedCode,
          courseName: ov.courseName || baseRoutine?.courseName || null,
          startTime: ov.startTime || null,
          endTime: ov.endTime || null,
          room: ov.room || null,
          teacher: ov.teacher || null,
          targetGroup: ov.targetGroup,
          weekParity: ov.weekParity,
          reason: ov.reason || null,
          createdById: systemUserId,
        },
      })

      created.push(override.id)

      // Audit log
      await logAudit(systemUserId, 'CREATE', 'routine_override', override.id, {
        type: ov.type,
        date: ov.date,
        courseCode: normalizedCode,
        reason: ov.reason,
        source: 'discord-bot',
        autoLinked: !!baseRoutine,
      })

      // Push notification
      const dateStr = dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
      const courseLabel = ov.courseName || normalizedCode
      const notifyBodyMap: Record<string, string> = {
        CANCELLED: `${courseLabel} is CANCELLED on ${dateStr}.`,
        MAKEUP: `Makeup class for ${courseLabel} on ${dateStr}${ov.startTime ? ' at ' + ov.startTime : ''}.`,
        TIME_CHANGE: `${courseLabel} time changed on ${dateStr}${ov.startTime ? ' to ' + ov.startTime : ''}.`,
        ROOM_CHANGE: `${courseLabel} room changed on ${dateStr}${ov.room ? ' to ' + ov.room : ''}.`,
      }

      notifyAll({
        title: 'Schedule Change',
        body: notifyBodyMap[ov.type] ?? `Routine update for ${dateStr}.`,
        link: '/routine',
      }).catch((err) => console.error('[Internal Overrides] notifyAll failed:', err))

    } catch (err) {
      const msg = `Failed to create override ${ov.type} ${ov.courseCode} ${ov.date}: ${String(err)}`
      errors.push(msg)
      console.error('[Internal Overrides]', msg)
    }
  }

  return ok({ created: created.length, ids: created, errors })
}

// Lazy-loaded system user ID — same pattern as internal/announcements
let _systemUserId: string | null = null
async function getSystemUserId(): Promise<string> {
  if (process.env.SYSTEM_USER_ID) return process.env.SYSTEM_USER_ID
  if (_systemUserId) return _systemUserId

  const admin = await prisma.user.findFirst({
    where: { role: Role.super_admin },
    select: { id: true },
  })
  if (!admin) {
    throw new Error('No super_admin found to use as system author. Set SYSTEM_USER_ID env var.')
  }
  _systemUserId = admin.id
  return _systemUserId
}
