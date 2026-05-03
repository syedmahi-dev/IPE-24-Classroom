export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  courseId: z.string().optional(),
  examDate: z.string().optional(),
  duration: z.number().int().min(1).optional(),
  room: z.string().max(100).optional(),
  syllabus: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
  type: z.enum(['EXAM', 'ASSIGNMENT']).optional(),
  submissionLink: z.string().max(2000).optional(),
  submissionMethod: z.string().max(200).optional(),
  instructions: z.string().max(5000).optional(),
})

/**
 * PATCH /api/v1/admin/exams/[id]
 * Update an exam, admin only
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const existing = await prisma.exam.findUnique({ where: { id: params.id } })
    if (!existing) return ERRORS.NOT_FOUND('Exam')

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION(parsed.error.errors[0]?.message || 'Invalid data')

    const updateData: any = { ...parsed.data }
    if (parsed.data.examDate) {
      updateData.examDate = new Date(parsed.data.examDate)
    }

    const updated = await prisma.exam.update({
      where: { id: params.id },
      data: updateData,
      include: {
        course: { select: { id: true, code: true, name: true } },
      },
    })

    await logAudit(session.user.id, 'UPDATE', 'exam', params.id, parsed.data)

    return ok(updated)
  } catch (error) {
    console.error('[Admin Exams] PATCH error:', error)
    return ERRORS.INTERNAL()
  }
}

/**
 * DELETE /api/v1/admin/exams/[id]
 * Delete an exam, admin only
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const existing = await prisma.exam.findUnique({ where: { id: params.id } })
    if (!existing) return ERRORS.NOT_FOUND('Exam')

    await prisma.exam.delete({ where: { id: params.id } })
    await logAudit(session.user.id, 'DELETE', 'exam', params.id, { title: existing.title })

    return ok({ deleted: true })
  } catch (error) {
    console.error('[Admin Exams] DELETE error:', error)
    return ERRORS.INTERNAL()
  }
}
