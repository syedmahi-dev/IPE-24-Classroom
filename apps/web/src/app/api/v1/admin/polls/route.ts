export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { notifyAll } from '@/lib/notifications'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['active', 'closed']).optional(),
})

/**
 * GET /api/v1/admin/polls
 * List all polls with vote counts, admin only
 */
export async function GET(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) return ERRORS.VALIDATION('Invalid query parameters')

    const { page, limit, status } = parsed.data
    const skip = (page - 1) * limit

    const where: any = {}
    if (status === 'active') where.isClosed = false
    if (status === 'closed') where.isClosed = true

    const [items, total] = await prisma.$transaction([
      prisma.poll.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { votes: true } },
          votes: { select: { optionIndex: true } },
        },
      }),
      prisma.poll.count({ where }),
    ])

    // Compute vote distribution per poll
    const enriched = items.map((poll: any) => {
      const options = JSON.parse(poll.options) as string[]
      const distribution = options.map((_: string, idx: number) =>
        poll.votes.filter((v: any) => v.optionIndex === idx).length
      )
      return {
        ...poll,
        votes: undefined, // remove raw votes from response
        totalVotes: poll._count.votes,
        voteDistribution: distribution,
        optionsList: options,
      }
    })

    return ok(enriched, { page, limit, total, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('[Admin Polls] GET error:', error)
    return ERRORS.INTERNAL()
  }
}

const createSchema = z.object({
  question: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
  isAnonymous: z.boolean().default(true),
  closesAt: z.string().optional(),
})

/**
 * POST /api/v1/admin/polls
 * Create a new poll, admin only
 */
export async function POST(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION(parsed.error.errors[0]?.message || 'Invalid data')

    const { question, options, isAnonymous, closesAt } = parsed.data

    const poll = await prisma.poll.create({
      data: {
        question,
        options: JSON.stringify(options),
        isAnonymous,
        closesAt: closesAt ? new Date(closesAt) : null,
        createdById: session.user.id,
      },
    })

    await logAudit(session.user.id, 'CREATE', 'poll', poll.id, { question })

    // Persist notification records + push broadcast (non-blocking)
    notifyAll({
      title: 'New Poll — Vote Now!',
      body: question.length > 120 ? question.slice(0, 120) + '…' : question,
      link: '/polls',
    }).catch((err) => console.error('[Notify] Poll broadcast failed:', err))

    return ok({ ...poll, optionsList: options, totalVotes: 0, voteDistribution: options.map(() => 0) })
  } catch (error) {
    console.error('[Admin Polls] POST error:', error)
    return ERRORS.INTERNAL()
  }
}
