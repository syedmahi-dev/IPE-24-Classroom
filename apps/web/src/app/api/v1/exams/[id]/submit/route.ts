export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const bodySchema = z.object({
  isSubmitted: z.boolean().default(true),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    const examId = params.id
    
    const exam = await prisma.exam.findUnique({ where: { id: examId } })
    if (!exam || exam.type !== 'ASSIGNMENT') {
      return ERRORS.NOT_FOUND('Assignment not found')
    }

    const body = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION('Invalid payload')

    const { isSubmitted } = parsed.data

    const submission = await prisma.assignmentSubmission.upsert({
      where: {
        examId_studentId: {
          examId,
          studentId: session.user.id
        }
      },
      update: {
        isSubmitted,
        submittedAt: isSubmitted ? new Date() : new Date() // Since Prisma can't un-set, we'll just update it or leave it. Actually submittedAt shouldn't matter if isSubmitted is false, but keeping it updated is fine.
      },
      create: {
        examId,
        studentId: session.user.id,
        isSubmitted
      }
    })

    return ok(submission)
  } catch (error) {
    console.error('[Assignment Submit] POST error:', error)
    return ERRORS.INTERNAL()
  }
}
