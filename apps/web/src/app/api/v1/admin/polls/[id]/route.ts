export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'

/**
 * PATCH /api/v1/admin/polls/[id]
 * Close a poll, admin only
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const existing = await prisma.poll.findUnique({ where: { id: params.id } })
    if (!existing) return ERRORS.NOT_FOUND('Poll')

    const updated = await prisma.poll.update({
      where: { id: params.id },
      data: { isClosed: true },
    })

    await logAudit(session.user.id, 'CLOSE', 'poll', params.id, { question: existing.question })

    return ok(updated)
  } catch (error) {
    console.error('[Admin Polls] PATCH error:', error)
    return ERRORS.INTERNAL()
  }
}

/**
 * DELETE /api/v1/admin/polls/[id]
 * Delete a poll, super_admin only
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (session.user.role !== 'super_admin') return ERRORS.FORBIDDEN()

  try {
    const existing = await prisma.poll.findUnique({ where: { id: params.id } })
    if (!existing) return ERRORS.NOT_FOUND('Poll')

    await prisma.poll.delete({ where: { id: params.id } })
    await logAudit(session.user.id, 'DELETE', 'poll', params.id, { question: existing.question })

    return ok({ deleted: true })
  } catch (error) {
    console.error('[Admin Polls] DELETE error:', error)
    return ERRORS.INTERNAL()
  }
}
