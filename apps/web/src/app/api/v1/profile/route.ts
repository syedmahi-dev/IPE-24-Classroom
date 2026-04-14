import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        _count: {
          select: { announcements: true, fileUploads: true, votes: true, studyGroups: true, }
        }
      }
    })

    if (!user) return ERRORS.NOT_FOUND('User')
    return ok(user)
  } catch (error) {
    console.error('[Profile] GET error:', error)
    return ERRORS.INTERNAL()
  }
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().max(500).optional().nullable(),
  phone: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  nickname: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  dob: z.string().optional().nullable(),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION('Invalid profile data')

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: parsed.data,
    })

    return ok(updatedUser)
  } catch (error) {
    console.error('[Profile] PATCH error:', error)
    return ERRORS.INTERNAL()
  }
}
