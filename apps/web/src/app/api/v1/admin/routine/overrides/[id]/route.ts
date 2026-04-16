import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'

/**
 * DELETE /api/v1/admin/routine/overrides/[id]
 * Remove a routine override (un-cancel a class, etc.)
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const existing = await prisma.routineOverride.findUnique({ where: { id: params.id } })
    if (!existing) return ERRORS.NOT_FOUND('Routine override')

    await prisma.routineOverride.delete({ where: { id: params.id } })
    await logAudit(session.user.id, 'DELETE', 'routine_override', params.id, {
      type: existing.type,
      date: existing.date,
      courseCode: existing.courseCode,
    })

    return ok({ deleted: true })
  } catch (error) {
    console.error('[Admin Overrides] DELETE error:', error)
    return ERRORS.INTERNAL()
  }
}
