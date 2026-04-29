import { requireInternalSecret } from '@/lib/api-guards'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { error } = requireInternalSecret(req)
  if (error) return error

  try {
    const configs = await prisma.botChannelConfig.findMany({
      where: { isActive: true }
    })

    const formattedConfigs = configs.map(config => {
      let authorizedUserIds = []
      let authorizedRoleIds = []

      try {
        authorizedUserIds = JSON.parse(config.authorizedUserIds)
      } catch (e) {
        console.error('Invalid JSON in authorizedUserIds for channel', config.channelId)
      }

      if (config.authorizedRoleIds) {
        try {
          authorizedRoleIds = JSON.parse(config.authorizedRoleIds)
        } catch (e) {
          console.error('Invalid JSON in authorizedRoleIds for channel', config.channelId)
        }
      }

      return {
        channelId: config.channelId,
        mode: config.mode,
        authorizedUserIds,
        authorizedRoleIds,
        defaultAnnouncementType: config.defaultAnnouncementType || undefined,
        label: config.label || undefined,
        courseCode: config.courseCode || undefined,
      }
    })

    return NextResponse.json(formattedConfigs)
  } catch (err) {
    console.error('[internal/bot-config] failed to fetch configs', err)
    return NextResponse.json(
      { success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch bot configs' } },
      { status: 500 }
    )
  }
}
