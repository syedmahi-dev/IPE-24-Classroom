import { Message, TextChannel, GuildMember } from 'discord.js'
import { getChannelConfig, ChannelConfig } from '../config'
import { claimMessage } from '../lib/redis'
import { classifyMessage } from '../services/classifier'
import { uploadUrlToDrive, DriveUploadResult } from '../services/drive'
import { publishAnnouncement } from '../services/publisher'
import { buildPreviewEmbed } from '../services/preview'
import { awaitCRApproval } from './reaction'
import { logger } from '../lib/logger'

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
])
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB — matches website limit

export async function handleMessage(message: Message): Promise<void> {
  // Ignore bot messages — critical for loop prevention
  if (message.author.bot) return

  // Ignore DMs — only process guild messages
  if (!message.guild) return

  // Check if channel is configured
  const channelConfig = getChannelConfig(message.channel.id)
  if (!channelConfig) return

  // Check if author is authorized
  if (!isAuthorized(message, channelConfig)) return

  // Deduplication — prevent double-processing on restart
  const claimed = await claimMessage(message.id)
  if (!claimed) {
    logger.warn('handler', 'duplicate message skipped', { messageId: message.id })
    return
  }

  const channelName = (message.channel as TextChannel).name ?? message.channel.id
  logger.info('handler', 'processing message', {
    messageId: message.id,
    channel: channelName,
    mode: channelConfig.mode,
    author: message.author.username,
  })

  try {
    // Show processing indicator
    await message.react('⏳').catch(() => {})

    // --- 1. Classify message content ---
    const messageText = message.content || '(no text — file attachment only)'
    const classification = channelConfig.defaultAnnouncementType
      ? {
          type: channelConfig.defaultAnnouncementType,
          title: messageText.split(/[.\n]/)[0].slice(0, 60) || 'Class Announcement',
          body: messageText,
          urgency: 'medium' as const,
        }
      : await classifyMessage(messageText)

    logger.info('handler', 'classified', {
      type: classification.type,
      title: classification.title,
      urgency: classification.urgency,
    })

    // --- 2. Upload file attachments to Google Drive ---
    const files: DriveUploadResult[] = []
    for (const attachment of message.attachments.values()) {
      if (!ALLOWED_MIME_TYPES.has(attachment.contentType ?? '')) {
        logger.warn('handler', 'skipping disallowed file type', {
          name: attachment.name,
          type: attachment.contentType,
        })
        continue
      }
      if (attachment.size > MAX_FILE_SIZE) {
        logger.warn('handler', 'skipping oversized file', {
          name: attachment.name,
          sizeBytes: attachment.size,
        })
        continue
      }
      try {
        const result = await uploadUrlToDrive(
          attachment.url,
          attachment.name ?? 'attachment',
          attachment.contentType ?? 'application/octet-stream',
          attachment.size
        )
        files.push(result)
      } catch (err) {
        logger.error('handler', 'file upload failed', { name: attachment.name, error: String(err) })
      }
    }

    // --- 3. Remove ⏳ reaction ---
    await message.reactions.cache.get('⏳')?.users.remove().catch(() => {})

    // --- 4. Dispatch by mode ---
    if (channelConfig.mode === 'AUTO_PUBLISH') {
      await handleAutoPublish(message, channelConfig, classification, files)
    } else {
      await handleReviewGate(message, channelConfig, classification, files, channelName)
    }
  } catch (err) {
    logger.error('handler', 'unhandled error in message handler', { error: String(err) })
    await message.react('💥').catch(() => {})
  }
}

async function handleAutoPublish(
  message: Message,
  _config: ChannelConfig,
  classification: ReturnType<typeof classifyMessage> extends Promise<infer T> ? T : never,
  files: DriveUploadResult[]
): Promise<void> {
  const result = await publishAnnouncement(classification, files, message.url)
  await message.react('✅').catch(() => {})

  if (result.errors.length > 0) {
    await message.reply({
      content: `⚠️ Published with warnings:\n${result.errors.map((e) => `• ${e}`).join('\n')}`,
    }).catch(() => {})
  }
}

async function handleReviewGate(
  message: Message,
  channelConfig: ChannelConfig,
  classification: ReturnType<typeof classifyMessage> extends Promise<infer T> ? T : never,
  files: DriveUploadResult[],
  sourceChannelName: string
): Promise<void> {
  if (!channelConfig.reviewChannelId) {
    logger.error('handler', 'REVIEW_GATE mode but no reviewChannelId configured', {
      channelId: channelConfig.channelId,
    })
    await message.react('❓').catch(() => {})
    return
  }

  const reviewChannel = message.guild?.channels.cache.get(channelConfig.reviewChannelId) as
    | TextChannel
    | undefined

  if (!reviewChannel) {
    logger.error('handler', 'review channel not found', {
      reviewChannelId: channelConfig.reviewChannelId,
    })
    await message.react('❓').catch(() => {})
    return
  }

  const previewEmbed = buildPreviewEmbed(classification, files, sourceChannelName)
  const previewMessage = await reviewChannel.send({ embeds: [previewEmbed] })

  // Delegate to reaction handler — this awaits CR approval
  await awaitCRApproval({
    previewMessage,
    originalMessage: message,
    channelConfig,
    classification,
    files,
  })
}

function isAuthorized(message: Message, config: ChannelConfig): boolean {
  // Check by user ID
  if (config.authorizedUserIds.includes(message.author.id)) return true

  // Check by role
  if (config.authorizedRoleIds && config.authorizedRoleIds.length > 0) {
    const member = message.member as GuildMember | null
    if (member) {
      return config.authorizedRoleIds.some((roleId) => member.roles.cache.has(roleId))
    }
  }

  return false
}
