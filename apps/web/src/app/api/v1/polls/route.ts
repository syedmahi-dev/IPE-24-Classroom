export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

/**
 * GET /api/v1/polls
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) return ERRORS.VALIDATION('Invalid query parameters')

    const { page, limit } = parsed.data
    const skip = (page - 1) * limit
    const userId = session.user.id

    const [items, total] = await prisma.$transaction([
      prisma.poll.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          votes: { select: { userId: true, optionIndex: true } }
        }
      }),
      prisma.poll.count()
    ])

    const transformed = items.map((poll) => {
      const options = JSON.parse(poll.options as string)
      const voteCounts = new Array(options.length).fill(0)
      
      poll.votes.forEach((vote) => {
        if (vote.optionIndex < voteCounts.length) {
          voteCounts[vote.optionIndex]++
        }
      })

      const userVote = poll.votes.find((v) => v.userId === userId)

      return {
        ...poll,
        options,
        voteCounts,
        totalVotes: poll.votes.length,
        userHasVoted: !!userVote,
        userVoteIndex: userVote?.optionIndex ?? null,
        votes: undefined, // Don't leak all voter IDs
      }
    })

    return ok(transformed, {
      page, limit, total, totalPages: Math.ceil(total / Math.max(1, limit))
    })
  } catch (error) {
    console.error('[Polls] GET error:', error)
    return ERRORS.INTERNAL()
  }
}

/**
 * POST /api/v1/polls
 */
const voteSchema = z.object({
  pollId: z.string(),
  optionIndex: z.number().int().min(0),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    const body = await req.json()
    const parsed = voteSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION('Invalid vote data')

    const { pollId, optionIndex } = parsed.data
    const userId = session.user.id

    const poll = await prisma.poll.findUnique({ where: { id: pollId } })
    if (!poll) return ERRORS.NOT_FOUND('Poll')
    if (poll.isClosed || (poll.closesAt && new Date(poll.closesAt) < new Date())) {
      return ERRORS.VALIDATION('Poll is closed')
    }

    const options = JSON.parse(poll.options as string)
    if (optionIndex >= options.length) return ERRORS.VALIDATION('Invalid option')

    await prisma.pollVote.upsert({
      where: { pollId_userId: { pollId, userId } },
      update: { optionIndex },
      create: { pollId, userId, optionIndex },
    })

    return ok({ message: 'Vote recorded' })
  } catch (error) {
    console.error('[Polls] POST error:', error)
    return ERRORS.INTERNAL()
  }
}
