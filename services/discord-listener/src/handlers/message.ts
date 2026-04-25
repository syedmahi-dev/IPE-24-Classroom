import { Message, TextChannel, GuildMember } from 'discord.js'
import { getChannelConfig, ChannelConfig } from '../config'
import { claimMessage } from '../lib/redis'
import { classifyMessage, ClassificationResult, ImageInput } from '../services/classifier'
import fetch from 'node-fetch'
import { uploadUrlToDrive, DriveUploadResult, extractDriveLinks, getDriveFileMetadata, isFolderUrl, listDriveFolderFiles } from '../services/drive'
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
    const attachmentNames = [...message.attachments.values()].map((a) => a.name ?? 'file')

    const images: ImageInput[] = []
    let imageCount = 0
    for (const attachment of message.attachments.values()) {
      if (attachment.contentType?.startsWith('image/') && attachment.size <= 4 * 1024 * 1024 && imageCount < 3) {
        try {
          const res = await fetch(attachment.url)
          if (res.ok) {
            const buffer = await res.buffer()
            images.push({
              base64: buffer.toString('base64'),
              mimeType: attachment.contentType
            })
            imageCount++
          }
        } catch (err) {
          logger.warn('handler', 'failed to download image for AI', { url: attachment.url, error: String(err) })
        }
      }
    }

    const classification: ClassificationResult = channelConfig.defaultAnnouncementType
      ? {
          type: channelConfig.defaultAnnouncementType,
          title: messageText.split(/[.\n]/)[0].slice(0, 60) || 'Class Announcement',
          body: messageText,
          urgency: 'medium' as const,
          fileCategory: 'other' as const,
          detectedCourseCode: null,
        }
      : await classifyMessage(messageText, attachmentNames, images)

    logger.info('handler', 'classified', {
      type: classification.type,
      title: classification.title,
      urgency: classification.urgency,
      fileCategory: classification.fileCategory,
      detectedCourseCode: classification.detectedCourseCode,
    })

    // --- 2. Determine Drive subfolder name ---
    // Priority: channel courseCode > AI-detected course > channel label > root
    const subFolderName = resolveSubFolderName(channelConfig, classification)

    logger.info('handler', 'resolved subfolder', { subFolderName })

    // --- 3. Upload file attachments to Google Drive ---
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
          attachment.size,
          subFolderName // Upload into the subfolder
        )
        files.push(result)
      } catch (err) {
        logger.error('handler', 'file upload failed', { name: attachment.name, error: String(err) })
      }
    }

    // --- 4. Extract shared Google Drive links from message text ---
    const driveLinks = extractDriveLinks(message.content || '')
    if (driveLinks.length > 0) {
      logger.info('handler', 'found shared Drive links', { count: driveLinks.length })
      for (const link of driveLinks) {
        try {
          if (isFolderUrl(link)) {
            // Folder link — list all files inside
            logger.info('handler', 'expanding Drive folder link', { link: link.slice(0, 80) })
            const folderFiles = await listDriveFolderFiles(link)
            for (const f of folderFiles) {
              files.push(f)
              logger.info('handler', 'added file from folder', { name: f.name, driveId: f.driveId })
            }
          } else {
            // Individual file link
            const metadata = await getDriveFileMetadata(link)
            if (metadata) {
              files.push(metadata)
              logger.info('handler', 'added shared Drive file', { name: metadata.name, driveId: metadata.driveId })
            }
          }
        } catch (err) {
          logger.warn('handler', 'failed to fetch shared Drive link', { link: link.slice(0, 80), error: String(err) })
        }
      }
    }

    // --- 5. Remove ⏳ reaction ---
    await message.reactions.cache.get('⏳')?.users.remove().catch(() => {})

    // --- 6. Dispatch by mode ---
    const courseCode = channelConfig.courseCode || classification.detectedCourseCode || undefined
    const folderLabel = channelConfig.label

    if (channelConfig.mode === 'AUTO_PUBLISH') {
      await handleAutoPublish(message, channelConfig, classification, files, courseCode, folderLabel)
    } else {
      await handleReviewGate(message, channelConfig, classification, files, channelName, courseCode, folderLabel)
    }
  } catch (err) {
    logger.error('handler', 'unhandled error in message handler', { error: String(err) })
    await message.react('💥').catch(() => {})
  }
}

/**
 * Resolve the Google Drive subfolder name for a message.
 * Priority:
 *   1. Channel has explicit courseCode (e.g. "IPE4208") → use that
 *   2. AI detected a courseCode from message text → use that
 *   3. Channel has a label (e.g. "announcements") → capitalize and use as folder
 *   4. Fallback → "General"
 */
function resolveSubFolderName(
  channelConfig: ChannelConfig,
  classification: ClassificationResult
): string {
  // 1. Explicit course code from channel config
  if (channelConfig.courseCode) {
    return channelConfig.courseCode.toUpperCase()
  }

  // 2. AI-detected course code (useful for "resources" channel)
  if (classification.detectedCourseCode) {
    return classification.detectedCourseCode.toUpperCase()
  }

  // 3. Use channel label as folder name (e.g. "Announcements", "Schedule Updates")
  if (channelConfig.label) {
    return channelConfig.label
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // 4. Fallback
  return 'General'
}

async function handleAutoPublish(
  message: Message,
  _config: ChannelConfig,
  classification: ClassificationResult,
  files: DriveUploadResult[],
  courseCode?: string,
  folderLabel?: string
): Promise<void> {
  const result = await publishAnnouncement(classification, files, message.url, courseCode, folderLabel)
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
  classification: ClassificationResult,
  files: DriveUploadResult[],
  sourceChannelName: string,
  courseCode?: string,
  folderLabel?: string
): Promise<void> {
  if (!channelConfig.reviewChannelId) {
    logger.error('handler', 'REVIEW_GATE mode but no reviewChannelId configured', {
      channelId: channelConfig.channelId,
    })
    await message.react('❓').catch(() => {})
    return
  }

  // Fetch review channel from the client (not the guild) — supports cross-server review
  let reviewChannel: TextChannel | undefined
  try {
    const fetched = await message.client.channels.fetch(channelConfig.reviewChannelId)
    if (fetched?.isTextBased()) {
      reviewChannel = fetched as TextChannel
    }
  } catch {
    // channel not found or bot lacks access
  }

  if (!reviewChannel) {
    logger.error('handler', 'review channel not found — ensure bot is invited to the review server', {
      reviewChannelId: channelConfig.reviewChannelId,
    })
    await message.react('❓').catch(() => {})
    return
  }

  const previewEmbed = buildPreviewEmbed(classification, files, sourceChannelName)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previewMessage = await reviewChannel.send({ embeds: [previewEmbed as any] })

  // Delegate to reaction handler — this awaits CR approval
  await awaitCRApproval({
    previewMessage,
    originalMessage: message,
    channelConfig,
    classification,
    files,
    courseCode,
    folderLabel,
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
