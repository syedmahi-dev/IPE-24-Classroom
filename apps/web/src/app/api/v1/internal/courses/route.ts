
import { requireInternalSecret } from '@/lib/api-guards'
import { prisma } from '@/lib/prisma'
import { ok } from '@/lib/api-response'
import { NextRequest } from 'next/server'

/**
 * GET /api/v1/internal/courses
 * Returns a list of all active course codes for the discord-listener to use
 * for accurate matching and routing.
 */
export async function GET(req: NextRequest) {
  const { error } = requireInternalSecret(req)
  if (error) return error

  const courses = await prisma.course.findMany({
    where: { isActive: true },
    select: { code: true, name: true }
  })

  return ok(courses)
}
