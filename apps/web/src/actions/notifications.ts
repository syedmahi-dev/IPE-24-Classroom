'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function markAsRead(id: string) {
  const session = await auth()
  const user = session?.user
  if (!user) return

  await prisma.notification.update({
    where: { id, userId: user.id },
    data: { isRead: true },
  })

  revalidatePath('/notifications')
}

export async function markAllAsRead() {
  const session = await auth()
  const user = session?.user
  if (!user) return

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  })

  revalidatePath('/notifications')
}

export async function clearAllNotifications() {
  const session = await auth()
  const user = session?.user
  if (!user) return

  await prisma.notification.deleteMany({
    where: { userId: user.id },
  })

  revalidatePath('/notifications')
}

export async function getUnreadCount() {
  const session = await auth()
  const user = session?.user
  if (!user) return 0

  return await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  })
}
