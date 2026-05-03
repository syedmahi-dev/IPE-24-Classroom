import { requireInternalSecret } from '@/lib/api-guards'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { ok, ERRORS } from '@/lib/api-response'
import { notifyAll } from '@/lib/notifications'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { NextRequest } from 'next/server'

const bodySchema = z.object({
  title: z.string().min(1).max(60),
  body: z.string().min(1).max(50000),
  type: z.enum(['general', 'exam', 'file_update', 'routine_update', 'urgent', 'event', 'course_update']).default('general'),
  source: z.enum(['telegram', 'discord', 'web']).nullable().optional(),
  courseCode: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const { error } = requireInternalSecret(req)
  if (error) return error

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return ERRORS.VALIDATION('Invalid JSON body')
  }

  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) return ERRORS.VALIDATION(parsed.error.message)

  const { title, body: htmlBody, type, source, courseCode } = parsed.data

  // Get system user ID (the super_admin who "owns" automated posts)
  const authorId = await getSystemUserId()

  // Resolve courseCode -> courseId
  let courseId: string | null = null
  if (courseCode) {
    const course = await prisma.course.findUnique({
      where: { code: courseCode.toUpperCase() },
      select: { id: true },
    })
    if (course) {
      courseId = course.id
    }
  }

  const announcement = await prisma.announcement.create({
    data: {
      title,
      body: htmlBody,
      type,
      source: source ?? null,
      isPublished: true,
      publishedAt: new Date(),
      authorId,
      // Link to course if resolved
      ...(courseId ? {
        courses: {
          create: {
            courseId
          }
        }
      } : {})
    },
  })

  // Create in-app notifications + FCM push for ALL users
  await notifyAll({
    title,
    body: `New ${type} announcement`,
    link: '/announcements',
  }).catch((err) =>
    console.error('[internal/announcements] notifyAll failed:', err)
  )

  // Audit log
  await logAudit(authorId, 'CREATE', 'announcement', announcement.id, {
    title,
    source: source ?? 'internal',
  })

  return ok(announcement)
}

// Lazy-loaded system user ID — cached after first call
let _systemUserId: string | null = null
async function getSystemUserId(): Promise<string> {
  // Prefer explicit env var
  if (process.env.SYSTEM_USER_ID) return process.env.SYSTEM_USER_ID
  if (_systemUserId) return _systemUserId

  // Fall back to the first super_admin in the database
  const admin = await prisma.user.findFirst({
    where: { role: Role.super_admin },
    select: { id: true },
  })
  if (!admin) {
    throw new Error('No super_admin found to use as system author. Set SYSTEM_USER_ID env var.')
  }
  _systemUserId = admin.id
  return _systemUserId
}
