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

  // Bulk-insert notification rows (one per user) — skip on conflict to be safe
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title,
      body,
      link: link ?? null,
    })),
    skipDuplicates: true,
  })

  // Also broadcast a real-time push notification
  broadcastPushNotification(title, body, link).catch((err) =>
    console.error('[notifyAll] Push broadcast failed:', err)
  )
}
