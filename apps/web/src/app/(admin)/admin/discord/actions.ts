'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

export async function getDiscordConfigs() {
  const session = await auth()
  if (session?.user?.role !== 'super_admin') {
    throw new Error('Unauthorized')
  }

  return await prisma.botChannelConfig.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function upsertDiscordConfig(data: any) {
  const session = await auth()
  if (session?.user?.role !== 'super_admin') {
    throw new Error('Unauthorized')
  }

  // Ensure JSON strings
  const authorizedUserIds = Array.isArray(data.authorizedUserIds) 
    ? JSON.stringify(data.authorizedUserIds) 
    : data.authorizedUserIds
    
  const authorizedRoleIds = Array.isArray(data.authorizedRoleIds) 
    ? JSON.stringify(data.authorizedRoleIds) 
    : data.authorizedRoleIds

  const allowedCourseCodes = Array.isArray(data.allowedCourseCodes)
    ? JSON.stringify(data.allowedCourseCodes)
    : data.allowedCourseCodes

  const config = await prisma.botChannelConfig.upsert({
    where: { channelId: data.channelId },
    update: {
      mode: data.mode,
      authorizedUserIds,
      authorizedRoleIds: authorizedRoleIds || null,
      allowedCourseCodes: allowedCourseCodes || null,
      defaultAnnouncementType: data.defaultAnnouncementType || null,
      label: data.label || null,
      courseCode: data.courseCode || null,
      isActive: data.isActive ?? true,
    },
    create: {
      channelId: data.channelId,
      mode: data.mode,
      authorizedUserIds,
      authorizedRoleIds: authorizedRoleIds || null,
      allowedCourseCodes: allowedCourseCodes || null,
      defaultAnnouncementType: data.defaultAnnouncementType || null,
      label: data.label || null,
      courseCode: data.courseCode || null,
      isActive: data.isActive ?? true,
    }
  })

  await logAudit(session.user.id, 'UPSERT', 'bot_channel_config', config.id, {
    channelId: config.channelId,
    mode: config.mode
  })

  revalidatePath('/admin/discord')
  return config
}

export async function deleteDiscordConfig(id: string) {
  const session = await auth()
  if (session?.user?.role !== 'super_admin') {
    throw new Error('Unauthorized')
  }

  const config = await prisma.botChannelConfig.delete({
    where: { id }
  })

  await logAudit(session.user.id, 'DELETE', 'bot_channel_config', config.id, {
    channelId: config.channelId
  })

  revalidatePath('/admin/discord')
  return config
}
