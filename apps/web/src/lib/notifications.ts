import { prisma } from './prisma'
import { broadcastPushNotification } from './fcm'

export interface NotifyAllOptions {
  title: string
  body: string
  link?: string
  /** Pass specific user IDs to target a subset; omit to notify ALL users. */
  targetUserIds?: string[]
}

/**
 * Persists a notification record for every target user AND broadcasts
 * a push notification via FCM.  Always call non-blocking (fire & forget).
 *
 * @example
 * notifyAll({ title: 'New Exam', body: 'IPE-4501 — 5 May 2026', link: '/exams' })
 *   .catch(err => console.error('[notifyAll]', err))
 */
export async function notifyAll({ title, body, link, targetUserIds }: NotifyAllOptions) {
  // Resolve the target user list
  let userIds: string[]

  if (targetUserIds && targetUserIds.length > 0) {
    userIds = targetUserIds
  } else {
    const users = await prisma.user.findMany({ select: { id: true } })
    userIds = users.map((u) => u.id)
  }

  if (userIds.length === 0) return

  const records = userIds.map((userId) => ({
    userId,
    title,
    body,
    link: link ?? null,
  }))

  // Fast path: bulk insert notifications.
  // Fallback keeps delivery working if createMany fails due DB/provider quirks.
  try {
    await prisma.notification.createMany({ data: records })
  } catch (err) {
    console.error('[notifyAll] createMany failed, falling back to per-user creates:', err)

    for (const record of records) {
      try {
        await prisma.notification.create({ data: record })
      } catch (innerErr) {
        console.error('[notifyAll] per-user notification create failed:', {
          userId: record.userId,
          error: String(innerErr),
        })
      }
    }
  }

  // Also broadcast a real-time push notification
  broadcastPushNotification(title, body, link).catch((err) =>
    console.error('[notifyAll] Push broadcast failed:', err)
  )
}
