import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) return ERRORS.VALIDATION('Invalid parameters')

    const { page, limit } = parsed.data
    const skip = (page - 1) * limit
    const userId = session.user.id

    const [items, total] = await prisma.$transaction([
      prisma.studyGroup.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { members: true } },
          members: { where: { userId }, select: { userId: true, isLeader: true } }
        }
      }),
      prisma.studyGroup.count()
    ])

    const transformed = items.map(group => ({
      ...group,
      memberCount: group._count.members,
      isMember: group.members.length > 0,
      isLeader: group.members[0]?.isLeader || false,
      members: undefined,
      _count: undefined,
    }))

    return ok(transformed, { page, limit, total, totalPages: Math.ceil(total / Math.max(limit, 1)) })
  } catch (error) {
    console.error('[StudyGroups] GET error:', error)
    return ERRORS.INTERNAL()
  }
}

const actionSchema = z.object({
  groupId: z.string(),
  action: z.enum(['join', 'leave']),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    const body = await req.json()
    const parsed = actionSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION('Invalid action')

    const { groupId, action } = parsed.data
    const userId = session.user.id

    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: { _count: { select: { members: true } } }
    })

    if (!group) return ERRORS.NOT_FOUND('Group')

    if (action === 'join') {
      if (group._count.members >= group.maxMembers) return ERRORS.VALIDATION('Group is full')
      if (!group.isOpen) return ERRORS.VALIDATION('Group is closed')

      await prisma.studyGroupMember.create({
        data: { groupId, userId, isLeader: false }
      })
    } else {
      await prisma.studyGroupMember.delete({
        where: { groupId_userId: { groupId, userId } }
      })

      const remaining = await prisma.studyGroupMember.count({ where: { groupId } })
      if (remaining === 0) {
        await prisma.studyGroup.delete({ where: { id: groupId } })
      }
    }

    return ok({ message: 'Success' })
  } catch (error) {
    console.error('[StudyGroups] POST error:', error)
    return ERRORS.INTERNAL()
  }
}
