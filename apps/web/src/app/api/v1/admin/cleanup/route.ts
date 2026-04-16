export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // Basic protection: requires either Super Admin or a CRON_SECRET auth header
    const authHeader = req.headers.get('authorization')
    const isCronTrigger = authHeader === `Bearer ${process.env.CRON_SECRET}`

    if (!isCronTrigger) {
      const session = await auth()
      if (!session?.user || session.user.role !== 'super_admin') {
        return ERRORS.UNAUTHORIZED()
      }
    }

    // Records created before this threshold will be deleted
    const thresholdDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

    const whereClause = {
      archivedAt: {
        not: null,
        lt: thresholdDate
      }
    }

    // Execute bulk deletes
    const [routinesResult, overridesResult, examsResult, studyGroupsResult] = await prisma.$transaction([
      prisma.baseRoutine.deleteMany({ where: whereClause }),
      prisma.routineOverride.deleteMany({ where: whereClause }),
      prisma.exam.deleteMany({ where: whereClause }),
      // Also study group members will be cascade deleted if member relations are correctly configured,
      // but let's assume Prisma handles cascade on delete or we just delete groups directly:
      prisma.studyGroup.deleteMany({ where: whereClause })
    ])

    return ok({
      message: 'Archive cleanup successful',
      deleted: {
        routines: routinesResult.count,
        overrides: overridesResult.count,
        exams: examsResult.count,
        studyGroups: studyGroupsResult.count
      },
      thresholdDate: thresholdDate.toISOString()
    })

  } catch (error: any) {
    console.error('[Cleanup API] Error:', error)
    return ERRORS.INTERNAL()
  }
}
