import { requireInternalSecret } from '@/lib/api-guards'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { broadcastPushNotification } from '@/lib/fcm'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { NextRequest } from 'next/server'

const bodySchema = z.object({
  title: z.string().min(1).max(60),
  body: z.string().min(1).max(50000),
  type: z.enum(['general', 'exam', 'file_update', 'routine_update', 'urgent', 'event']).default('general'),
  source: z.enum(['telegram', 'discord', 'web']).nullable().optional(),
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

  const { title, body: htmlBody, type, source } = parsed.data

  // Get system user ID (the super_admin who "owns" automated posts)
  const authorId = await getSystemUserId()

  const announcement = await prisma.announcement.create({
    data: {
      title,
      body: htmlBody,
      type,
      source: source ?? null,
      isPublished: true,
      publishedAt: new Date(),
      authorId,
    },
  })

  // Fire FCM push notification (non-blocking)
  await broadcastPushNotification(
    title,
    `New announcement: ${title}`,
    `/announcements`
  ).catch((err) => console.error('[internal/announcements] FCM push failed:', err))

  // Create in-app notifications for all students
  try {
    const students = await prisma.user.findMany({
      where: { role: 'student' },
      select: { id: true },
    })
    if (students.length > 0) {
      await prisma.notification.createMany({
        data: students.map((s) => ({
          userId: s.id,
          title,
          body: `New ${type} announcement`,
          link: `/announcements`,
        })),
      })
    }
  } catch (err) {
    console.error('[internal/announcements] Notification creation failed:', err)
  }

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
    where: { role: 'super_admin' },
    select: { id: true },
  })
  if (!admin) {
    throw new Error('No super_admin found to use as system author. Set SYSTEM_USER_ID env var.')
  }
  _systemUserId = admin.id
  return _systemUserId
}
