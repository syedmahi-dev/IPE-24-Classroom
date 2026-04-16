import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const updateSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200).optional(),
  creditHours: z.number().min(0).max(10).optional(),
  teacherName: z.string().max(100).nullable().optional(),
  semester: z.number().int().min(1).max(12).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION(parsed.error.errors[0]?.message || 'Invalid data')

    const course = await prisma.course.update({
      where: { id: params.id },
      data: parsed.data,
    })

    await logAudit(session.user.id, 'UPDATE', 'course', course.id, parsed.data)

    return ok(course)
  } catch (error) {
    console.error('[Admin Courses] PATCH error:', error)
    return ERRORS.INTERNAL()
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    await prisma.course.delete({ where: { id: params.id } })
    await logAudit(session.user.id, 'DELETE', 'course', params.id, {})
    return ok({ success: true })
  } catch (error) {
    console.error('[Admin Courses] DELETE error:', error)
    return ERRORS.INTERNAL()
  }
}
