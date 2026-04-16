export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const updateSchema = z.object({
  courseCode: z.string().min(1).max(20).optional(),
  courseName: z.string().max(200).optional(),
  dayOfWeek: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format').optional(),
  room: z.string().min(1).max(50).optional(),
  teacher: z.string().max(100).optional(),
  targetGroup: z.enum(['ALL', 'ODD', 'EVEN']).optional(),
  isLab: z.boolean().optional(),
  semester: z.string().max(50).optional(),
})

/**
 * PUT /api/v1/admin/routine/[id]
 * Update a base routine entry
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const existing = await prisma.baseRoutine.findUnique({ where: { id: params.id } })
    if (!existing) return ERRORS.NOT_FOUND('Routine entry')

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION(parsed.error.errors[0]?.message || 'Invalid data')

    const updated = await prisma.baseRoutine.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.courseCode !== undefined ? { courseCode: parsed.data.courseCode } : {}),
        ...(parsed.data.courseName !== undefined ? { courseName: parsed.data.courseName || null } : {}),
        ...(parsed.data.dayOfWeek !== undefined ? { dayOfWeek: parsed.data.dayOfWeek } : {}),
        ...(parsed.data.startTime !== undefined ? { startTime: parsed.data.startTime } : {}),
        ...(parsed.data.endTime !== undefined ? { endTime: parsed.data.endTime } : {}),
        ...(parsed.data.room !== undefined ? { room: parsed.data.room } : {}),
        ...(parsed.data.teacher !== undefined ? { teacher: parsed.data.teacher || null } : {}),
        ...(parsed.data.targetGroup !== undefined ? { targetGroup: parsed.data.targetGroup } : {}),
        ...(parsed.data.isLab !== undefined ? { isLab: parsed.data.isLab } : {}),
        ...(parsed.data.semester !== undefined ? { semester: parsed.data.semester || null } : {}),
      },
    })

    await logAudit(session.user.id, 'UPDATE', 'base_routine', params.id, parsed.data)

    return ok(updated)
  } catch (error) {
    console.error('[Admin Routine] PUT error:', error)
    return ERRORS.INTERNAL()
  }
}

/**
 * DELETE /api/v1/admin/routine/[id]
 * Delete a base routine entry
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const existing = await prisma.baseRoutine.findUnique({ where: { id: params.id } })
    if (!existing) return ERRORS.NOT_FOUND('Routine entry')

    await prisma.baseRoutine.delete({ where: { id: params.id } })
    await logAudit(session.user.id, 'DELETE', 'base_routine', params.id, {
      courseCode: existing.courseCode,
      dayOfWeek: existing.dayOfWeek,
    })

    return ok({ deleted: true })
  } catch (error) {
    console.error('[Admin Routine] DELETE error:', error)
    return ERRORS.INTERNAL()
  }
}
