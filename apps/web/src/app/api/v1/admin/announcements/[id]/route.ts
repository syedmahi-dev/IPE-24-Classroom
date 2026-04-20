export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { notifyAll } from '@/lib/notifications'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
  type: z.enum(['general', 'exam', 'file_update', 'routine_update', 'urgent', 'event']).optional(),
  isPublished: z.boolean().optional(),
})

/**
 * PATCH /api/v1/admin/announcements/[id]
 * Update an announcement (own only, or super_admin for all)
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const existing = await prisma.announcement.findUnique({ where: { id: params.id } })
    if (!existing) return ERRORS.NOT_FOUND('Announcement')

    // Only author or super_admin can edit
    if (existing.authorId !== session.user.id && session.user.role !== 'super_admin') {
      return ERRORS.FORBIDDEN()
    }

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION(parsed.error.errors[0]?.message || 'Invalid data')

    const updateData: any = { ...parsed.data }
    if (parsed.data.isPublished === true && !existing.publishedAt) {
      updateData.publishedAt = new Date()
    }

    const updated = await prisma.announcement.update({
      where: { id: params.id },
      data: updateData,
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, role: true } },
        courses: { include: { course: true } },
      },
    })

    await logAudit(session.user.id, 'UPDATE', 'announcement', params.id, parsed.data)

    // If this update is publishing a previously-unpublished announcement, notify all users
    const isFirstPublish = parsed.data.isPublished === true && !existing.isPublished
    if (isFirstPublish) {
      notifyAll({
        title: updated.title,
        body: updated.body.length > 120 ? updated.body.slice(0, 120) + '…' : updated.body,
        link: '/announcements',
      }).catch((err) => console.error('[Notify] Publish-toggle broadcast failed:', err))
    }

    return ok(updated)
  } catch (error) {
    console.error('[Admin Announcements] PATCH error:', error)
    return ERRORS.INTERNAL()
  }
}

/**
 * DELETE /api/v1/admin/announcements/[id]
 * Delete an announcement (own only, or super_admin for all)
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const existing = await prisma.announcement.findUnique({ where: { id: params.id } })
    if (!existing) return ERRORS.NOT_FOUND('Announcement')

    if (existing.authorId !== session.user.id && session.user.role !== 'super_admin') {
      return ERRORS.FORBIDDEN()
    }

    await prisma.announcement.delete({ where: { id: params.id } })
    await logAudit(session.user.id, 'DELETE', 'announcement', params.id, { title: existing.title })

    return ok({ deleted: true })
  } catch (error) {
    console.error('[Admin Announcements] DELETE error:', error)
    return ERRORS.INTERNAL()
  }
}
