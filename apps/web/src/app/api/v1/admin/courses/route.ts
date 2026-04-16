import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export async function GET(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) return ERRORS.VALIDATION('Invalid query parameters')

    const { page, limit } = parsed.data
    const skip = (page - 1) * limit

    const [items, total] = await prisma.$transaction([
      prisma.course.findMany({
        orderBy: { code: 'asc' },
        skip,
        take: limit,
      }),
      prisma.course.count(),
    ])

    return ok(items, { page, limit, total, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('[Admin Courses] GET error:', error)
    return ERRORS.INTERNAL()
  }
}

const createSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  creditHours: z.number().min(0).max(10),
  teacherName: z.string().max(100).optional(),
  semester: z.number().int().min(1).max(12),
})

export async function POST(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION(parsed.error.errors[0]?.message || 'Invalid data')

    // Check if course code already exists
    const existing = await prisma.course.findUnique({ where: { code: parsed.data.code } })
    if (existing) return ERRORS.VALIDATION('Course code already exists')

    const course = await prisma.course.create({
      data: parsed.data,
    })

    await logAudit(session.user.id, 'CREATE', 'course', course.id, { code: course.code, name: course.name })

    return ok(course)
  } catch (error) {
    console.error('[Admin Courses] POST error:', error)
    return ERRORS.INTERNAL()
  }
}
