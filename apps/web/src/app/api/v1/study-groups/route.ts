import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  targetGroup: z.enum(['ALL', 'ODD', 'EVEN']).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) return ERRORS.VALIDATION('Invalid parameters')

    const { page, limit, targetGroup } = parsed.data
    const skip = (page - 1) * limit
    const userId = session.user.id

    const where: any = targetGroup ? { targetGroup } : {}

    const [items, total] = await prisma.$transaction([
      prisma.studyGroup.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { members: true } },
          members: { where: { userId }, select: { userId: true, isLeader: true } }
        }
      }),
      prisma.studyGroup.count({ where })
    ])

    const transformed = items.map(group => ({
      ...group,
      name: group.title,
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
  groupId: z.string().optional(),
  action: z.enum(['join', 'leave', 'create']),
  title: z.string().optional(),
  description: z.string().optional(),
  meetTime: z.string().optional(),
  location: z.string().optional(),
  maxMembers: z.number().int().min(2).max(50).optional(),
  targetGroup: z.enum(['ALL', 'ODD', 'EVEN']).optional(),
  courseCode: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    const body = await req.json()
    const parsed = actionSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION('Invalid action')

    const { groupId, action, title, description, meetTime, location, maxMembers, targetGroup, courseCode } = parsed.data
    const userId = session.user.id

    if (action === 'create') {
      if (!title) return ERRORS.VALIDATION('Title is required')
      
      const newGroup = await prisma.studyGroup.create({
        data: {
          title,
          description,
          meetTime,
          location,
          maxMembers: maxMembers || 5,
          targetGroup: targetGroup || 'ALL',
          courseCode,
          members: {
            create: {
              userId,
              isLeader: true
            }
          }
        }
      })
      return ok({ message: 'Group created successfully', groupId: newGroup.id })
    }

    if (!groupId) return ERRORS.VALIDATION('Group ID is required for join/leave')

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
    } else if (action === 'leave') {
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
