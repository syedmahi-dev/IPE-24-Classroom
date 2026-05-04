export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'

/**
 * GET /api/v1/announcements/[id]
 * Fetch a single published announcement by ID
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return ERRORS.UNAUTHORIZED()

  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: params.id, isPublished: true },
      include: {
        author: { select: { name: true, avatarUrl: true, role: true } },
        courses: { include: { course: { select: { id: true, code: true, name: true, courseType: true } } } },
      },
    })

    if (!announcement) {
      return new Response(JSON.stringify({ success: false, error: { message: 'Not found' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return ok(announcement)
  } catch (error) {
    console.error('[Announcements] GET [id] error:', error)
    return ERRORS.INTERNAL()
  }
}
