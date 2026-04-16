import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

export async function GET(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()

  try {
    const config = await prisma.systemConfig.findMany()
    const configMap = config.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {})
    return ok(configMap)
  } catch (error) {
    console.error('[Admin Settings] GET error:', error)
    return ERRORS.INTERNAL()
  }
}

const updateSchema = z.object({
  currentSemester: z.string().min(1).max(50),
})

export async function POST(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN() // ONLY SUPER ADMIN CAN CHANGE SEMESTERS

  try {
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION(parsed.error.errors[0]?.message || 'Invalid data')

    const newSemester = parsed.data.currentSemester

    // Start a massive transaction to update settings and archive old records
    await prisma.$transaction(async (tx) => {
      // 1. Update the setting
      await tx.systemConfig.upsert({
        where: { key: 'currentSemester' },
        update: { value: newSemester },
        create: { key: 'currentSemester', value: newSemester },
      })

      // 2. Archive Routines that belong to the PREVIOUS semester 
      // (This is simple: anything currently not archived gets archived)
      const now = new Date()

      await tx.baseRoutine.updateMany({
        where: { archivedAt: null },
        data: { archivedAt: now }
      })

      await tx.routineOverride.updateMany({
        where: { archivedAt: null },
        data: { archivedAt: now }
      })

      await tx.exam.updateMany({
        where: { archivedAt: null },
        data: { archivedAt: now }
      })

      await tx.studyGroup.updateMany({
        where: { archivedAt: null },
        data: { archivedAt: now }
      })
    })

    await logAudit(session.user.id, 'UPDATE', 'system_config', 'semester_switch', { newSemester })

    return ok({ message: 'Semester switched and previous data archived safely' })
  } catch (error) {
    console.error('[Admin Settings] POST error:', error)
    return ERRORS.INTERNAL()
  }
}
