import { Message, TextChannel, GuildMember, MessageReaction, User } from 'discord.js'
import fetch from 'node-fetch'
import { ChannelConfig, getChannelConfig, getConfig } from '../config'
import { claimMessage, releaseMessage } from '../lib/redis'
import { classifyMessage, ClassificationResult, ImageInput } from '../services/classifier'
import {
  uploadUrlToDrive,
  DriveUploadResult,
  extractDriveLinks,
  getDriveFileMetadata,
  isFolderUrl,
  listDriveFolderFiles,
} from '../services/drive'
import { publishAnnouncement } from '../services/publisher'
import { ingestToKnowledgeBase } from '../services/knowledge-ingestor'
import { buildPreviewEmbed } from '../services/preview'
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
const MAX_IMAGE_AI_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_IMAGE_AI_COUNT = 5
const MAX_TEXT_ATTACHMENT_SIZE = 512 * 1024 // 512KB
const MAX_TEXT_SNIPPETS = 3

export async function handleMessage(message: Message): Promise<void> {
  if (message.author.bot) return
  if (!message.guild) return

  const channelConfig = getChannelConfig(message.channel.id)
  if (!channelConfig) return

  if (!isAuthorized(message, channelConfig)) return

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
    await message.react('⏳').catch(() => {})

    const attachmentNames = [...message.attachments.values()].map((a) => a.name ?? 'file')
    const attachmentSummaries = [...message.attachments.values()].map((a) => {
      const type = a.contentType ?? 'unknown'
      return `${a.name ?? 'file'} (${type})`
    })

    const textSnippets = await extractTextSnippetsFromAttachments(message)
    const messageText = buildClassificationInput(message.content ?? '', attachmentSummaries, textSnippets)

    const images: ImageInput[] = []
    let imageCount = 0
    for (const attachment of message.attachments.values()) {
      if (!attachment.contentType?.startsWith('image/')) continue
      if (attachment.size > MAX_IMAGE_AI_SIZE || imageCount >= MAX_IMAGE_AI_COUNT) continue

      try {
        const res = await fetch(attachment.url)
        if (!res.ok) continue

        const buffer = await res.buffer()
        images.push({
          base64: buffer.toString('base64'),
          mimeType: attachment.contentType,
        })
        imageCount++
      } catch (err) {
        logger.warn('handler', 'failed to download image for AI', {
          url: attachment.url,
          error: String(err),
        })
      }
    }

    const classification: ClassificationResult = channelConfig.defaultAnnouncementType
      ? {
          type: channelConfig.defaultAnnouncementType,
          title: messageText.split(/[.\n]/)[0].slice(0, 60) || 'Class Announcement',
          body: messageText,
          urgency: 'medium',
          fileCategory: 'other',
          detectedCourseCode: null,
          overrides: [],
        }
      : await classifyMessage(messageText, attachmentNames, images)

    logger.info('handler', 'classified', {
      type: classification.type,
      title: classification.title,
      urgency: classification.urgency,
      fileCategory: classification.fileCategory,
      detectedCourseCode: classification.detectedCourseCode,
      overrideCount: classification.overrides.length,
    })

    const allowedCourseCodes = new Set(
      (channelConfig.allowedCourseCodes ?? []).map((c) => normalizeCourseCode(c)).filter(Boolean)
    )
    const fallbackSubFolderName = resolveFallbackSubFolderName(channelConfig)
    const defaultCourseCode = resolveAllowedCourseCode(
      channelConfig.courseCode || classification.detectedCourseCode || undefined,
      allowedCourseCodes
    )
    const defaultSubFolderName = defaultCourseCode || fallbackSubFolderName
    logger.info('handler', 'resolved default subfolder', {
      defaultSubFolderName,
      defaultCourseCode: defaultCourseCode ?? null,
      allowedCourseCodesCount: allowedCourseCodes.size,
    })

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
        const fileCourseCode = resolveAllowedCourseCode(
          detectCourseCodeFromText(`${attachment.name ?? ''} ${message.content ?? ''}`) || defaultCourseCode,
          allowedCourseCodes
        )
        const targetFolder = fileCourseCode ?? defaultSubFolderName

        const result = await uploadUrlToDrive(
          attachment.url,
          attachment.name ?? 'attachment',
          attachment.contentType ?? 'application/octet-stream',
          attachment.size,
          targetFolder
        )
        files.push({ ...result, courseCode: fileCourseCode ?? null })

        logger.info('handler', 'uploaded file with routing', {
          name: attachment.name,
          folder: targetFolder,
          fileCourseCode: fileCourseCode ?? null,
        })
      } catch (err) {
        logger.error('handler', 'file upload failed', {
          name: attachment.name,
          error: String(err),
        })
      }
    }

    const driveLinks = extractDriveLinks(message.content || '')
    if (driveLinks.length > 0) {
      logger.info('handler', 'found shared Drive links', { count: driveLinks.length })
      for (const link of driveLinks) {
        try {
          if (isFolderUrl(link)) {
            logger.info('handler', 'expanding Drive folder link', { link: link.slice(0, 80) })
            const folderFiles = await listDriveFolderFiles(link)
            for (const f of folderFiles) {
              const linkCourseCode = resolveAllowedCourseCode(
                detectCourseCodeFromText(f.name) || defaultCourseCode,
                allowedCourseCodes
              )
              files.push({ ...f, courseCode: linkCourseCode ?? null })
              logger.info('handler', 'added file from folder', { name: f.name, driveId: f.driveId })
            }
          } else {
            const metadata = await getDriveFileMetadata(link)
            if (metadata) {
              const linkCourseCode = resolveAllowedCourseCode(
                detectCourseCodeFromText(metadata.name) || defaultCourseCode,
                allowedCourseCodes
              )
              files.push({ ...metadata, courseCode: linkCourseCode ?? null })
              logger.info('handler', 'added shared Drive file', {
                name: metadata.name,
                driveId: metadata.driveId,
              })
            }
          }
        } catch (err) {
          logger.warn('handler', 'failed to fetch shared Drive link', {
            link: link.slice(0, 80),
            error: String(err),
          })
        }
      }
    }

    await message.reactions.cache.get('⏳')?.users.remove().catch(() => {})

    const courseCode = defaultCourseCode
    const folderLabel = channelConfig.label

    await handleReviewGate(message, channelConfig, classification, files, channelName, courseCode, folderLabel)
  } catch (err) {
    logger.error('handler', 'unhandled error in message handler', { error: String(err) })
    await message.react('💥').catch(() => {})
  }
}

function resolveFallbackSubFolderName(channelConfig: ChannelConfig): string {
  if (channelConfig.label) {
    return channelConfig.label
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return 'General'
}

function detectCourseCodeFromText(input: string): string | null {
  const match = input.toUpperCase().match(/\b([A-Z]{2,6})\s*-?\s*(\d{4})\b/)
  if (!match) return null
  return `${match[1]}${match[2]}`
}

function normalizeCourseCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function resolveAllowedCourseCode(candidate: string | undefined, allowedCodes: Set<string>): string | undefined {
  if (!candidate) return undefined
  const normalized = normalizeCourseCode(candidate)
  if (!normalized) return undefined
  if (allowedCodes.size === 0) return normalized
  return allowedCodes.has(normalized) ? normalized : undefined
}

export async function handleMessageWithFix(message: Message, fixText: string): Promise<void> {
  const channelConfig = getChannelConfig(message.channel.id)
  if (!channelConfig) return
  
  const channelName = (message.channel as TextChannel).name ?? message.channel.id
  
  logger.info('handler', 'processing message with fix', {
    messageId: message.id,
    fixText,
  })

  try {
    const attachmentNames = [...message.attachments.values()].map((a) => a.name ?? 'file')
    const attachmentSummaries = [...message.attachments.values()].map((a) => {
      const type = a.contentType ?? 'unknown'
      return `${a.name ?? 'file'} (${type})`
    })

    const textSnippets = await extractTextSnippetsFromAttachments(message)
    const messageText = buildClassificationInput(message.content ?? '', attachmentSummaries, textSnippets)

    const images: import('../services/classifier').ImageInput[] = []
    let imageCount = 0
    for (const attachment of message.attachments.values()) {
      if (!attachment.contentType?.startsWith('image/')) continue
      if (attachment.size > MAX_IMAGE_AI_SIZE || imageCount >= MAX_IMAGE_AI_COUNT) continue

      try {
        const fetch = (await import('node-fetch')).default
        const res = await fetch(attachment.url)
        if (!res.ok) continue

        const buffer = await res.buffer()
        images.push({
          base64: buffer.toString('base64'),
          mimeType: attachment.contentType,
        })
        imageCount++
      } catch (err) {}
    }

    const classification = await classifyMessage(messageText, attachmentNames, images, fixText)

    // For fixes, we assume files were already uploaded in the original run
    const allowedCourseCodes = new Set(
      (channelConfig.allowedCourseCodes ?? []).map((c) => normalizeCourseCode(c)).filter(Boolean)
    )
    const fallbackSubFolderName = resolveFallbackSubFolderName(channelConfig)
    const defaultCourseCode = resolveAllowedCourseCode(
      channelConfig.courseCode || classification.detectedCourseCode || undefined,
      allowedCourseCodes
    )

    await handleReviewGate(message, channelConfig, classification, [], channelName, defaultCourseCode, fallbackSubFolderName)
  } catch (err) {
    logger.error('handler', 'unhandled error in fix handler', { error: String(err) })
  }
}

async function handleAutoPublish(
  message: Message,
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

  const channelName = (message.channel as TextChannel).name ?? message.channel.id
  ingestToKnowledgeBase({
    messageId: message.id,
    channelName,
    classification,
    files,
    courseCode,
  }).catch((err) => logger.warn('handler', 'KB ingestion failed (non-fatal)', { error: String(err) }))
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
  const requiresRoutineConfirmation = classification.overrides.length > 0
  const timeoutMs: number | undefined = requiresRoutineConfirmation ? undefined : getConfig().REACTION_TIMEOUT_MS
  logger.info('handler', 'review gate awaiting confirmation', {
    channel: sourceChannelName,
    title: classification.title,
    mode: 'all_messages',
    timeoutMs: timeoutMs ?? null,
    requiresRoutineConfirmation,
  })

  const previewMessage = await message.reply({
    content: 'Routine override detected. Approval is required before publishing. React ✅ to publish or ❌ to discard.',
    embeds: [buildPreviewEmbed(classification, files, sourceChannelName, timeoutMs).toJSON() as any],
  }).catch(() => null)

  if (requiresRoutineConfirmation) {
    try {
      const { buildTelegramPreviewHtml } = await import('../services/preview')
      const Redis = (await import('ioredis')).default
      const { REDIS_URL } = getConfig()
      const redis = new Redis(REDIS_URL)
      const previewHtml = buildTelegramPreviewHtml(classification, files, message.url)
      await redis.publish('telegram_send_preview', JSON.stringify({
        messageId: message.id,
        previewTextHtml: previewHtml
      }))
      redis.quit()
      logger.info('handler', 'Sent preview to Telegram for approval')
    } catch (e) {
      logger.warn('handler', 'failed to send telegram preview', { error: String(e) })
    }
  }

  if (!previewMessage) {
    logger.warn('handler', 'failed to send preview message, publishing blocked', {
      messageId: message.id,
    })

    await message.react('⚠️').catch(() => {})
    await message.reply('⚠️ Could not open approval gate. Routine override was not published. Please fix bot channel permissions and retry.').catch(() => {})
    await releaseMessage(message.id)
    return
  }

  await previewMessage.react('✅').catch(() => {})
  await previewMessage.react('❌').catch(() => {})

  const decision = await waitForReviewDecision(previewMessage, message, channelConfig, timeoutMs)

  if (decision === 'superseded') {
    logger.info('handler', 'review gate superseded by fix request', { messageId: message.id })
    await previewMessage.reply('🔄 Fix request received. Generating revised preview...').catch(() => {})
    // The fix listener will pick up the request and spawn a new handleMessageWithFix.
    return
  }

  if (decision === 'timed_out') {
    logger.warn('handler', 'review decision: timed_out or collector_error', {
      messageId: message.id,
      title: classification.title,
      requiresRoutineConfirmation,
    })

    if (requiresRoutineConfirmation) {
      await message.react('⏸️').catch(() => {})
      await previewMessage.reply('⏸️ No valid approval captured. This routine override was discarded.').catch(() => {})
      await releaseMessage(message.id)
      return
    }

    await previewMessage.reply('⌛ No review action received within 2 hours. Auto-publishing this non-routine post.').catch(() => {})
    await handleAutoPublish(message, classification, files, courseCode, folderLabel)
    return
  }

  if (decision === 'discarded') {
    logger.info('handler', 'review decision: discarded', {
      messageId: message.id,
      title: classification.title,
    })

    await message.react('❌').catch(() => {})
    await previewMessage.reply('❌ Discarded. This message will not be published.').catch(() => {})
    await releaseMessage(message.id)
    return
  }

  await handleAutoPublish(message, classification, files, courseCode, folderLabel)
}

async function waitForReviewDecision(
  previewMessage: Message,
  sourceMessage: Message,
  channelConfig: ChannelConfig,
  timeoutMs?: number
): Promise<'approved' | 'discarded' | 'timed_out' | 'superseded'> {
  const { REDIS_URL } = getConfig()
  const Redis = (await import('ioredis')).default

  let subscriber: any = null
  let timeoutHandle: any = null

  const discordPromise = previewMessage.awaitReactions({
    filter: async (reaction: import('discord.js').MessageReaction, user: import('discord.js').User) => {
      if (user.bot) return false
      const emoji = reaction.emoji.name
      if (emoji !== '✅' && emoji !== '❌') return false
      return isReviewer(user.id, sourceMessage, channelConfig)
    },
    max: 1,
    ...(timeoutMs ? { time: timeoutMs, errors: ['time'] as const } : {}),
  }).then(collected => {
    const decisionReaction = collected.first()
    return decisionReaction?.emoji.name === '❌' ? 'discarded' : 'approved'
  }).catch(() => 'timed_out' as const)

  const redisPromise = new Promise<'approved' | 'discarded' | 'timed_out' | 'superseded'>((resolve) => {
    subscriber = new Redis(REDIS_URL)
    
    if (timeoutMs) {
      timeoutHandle = setTimeout(() => {
        resolve('timed_out')
      }, timeoutMs)
    }

    subscriber.subscribe('discord_approvals', 'discord_fix_requests', () => {})
    subscriber.on('message', (channel: string, message: string) => {
      if (channel === 'discord_approvals') {
        try {
          const payload = JSON.parse(message)
          if (payload.messageId === sourceMessage.id) {
            resolve(payload.approved ? 'approved' : 'discarded')
          }
        } catch (e) {}
      } else if (channel === 'discord_fix_requests') {
        try {
          const payload = JSON.parse(message)
          if (payload.messageId === sourceMessage.id) {
            resolve('superseded')
          }
        } catch (e) {}
      }
    })
  })

  const result = await Promise.race([discordPromise, redisPromise])
  
  // Cleanup
  if (subscriber) {
    subscriber.quit()
  }
  if (timeoutHandle) {
    clearTimeout(timeoutHandle)
  }

  return result
}

async function isReviewer(userId: string, sourceMessage: Message, config: ChannelConfig): Promise<boolean> {
  if (config.authorizedUserIds.includes(userId)) return true

  if (!config.authorizedRoleIds || config.authorizedRoleIds.length === 0) return false

  const guild = sourceMessage.guild
  if (!guild) return false

  try {
    const member = await guild.members.fetch(userId)
    return config.authorizedRoleIds.some((roleId) => member.roles.cache.has(roleId))
  } catch {
    return false
  }
}

function buildClassificationInput(
  rawMessage: string,
  attachmentSummaries: string[],
  textSnippets: string[]
): string {
  const hasText = rawMessage.trim().length > 0

  let content = hasText
    ? rawMessage.trim()
    : 'No text caption was provided. Infer announcement details from attachments.'

  if (attachmentSummaries.length > 0) {
    content += `\n\nAttachment metadata:\n- ${attachmentSummaries.join('\n- ')}`
  }

  if (textSnippets.length > 0) {
    content += `\n\nExtracted attachment text snippets:\n${textSnippets.join('\n\n')}`
  }

  return content.slice(0, 4000)
}

async function extractTextSnippetsFromAttachments(message: Message): Promise<string[]> {
  const snippets: string[] = []

  for (const attachment of message.attachments.values()) {
    if (snippets.length >= MAX_TEXT_SNIPPETS) break
    if (!isTextLikeAttachment(attachment.name ?? '', attachment.contentType ?? '')) continue
    if (attachment.size > MAX_TEXT_ATTACHMENT_SIZE) continue

    try {
      const res = await fetch(attachment.url)
      if (!res.ok) continue

      const text = (await res.text()).replace(/\s+/g, ' ').trim()
      if (!text) continue

      const snippet = text.slice(0, 1000)
      snippets.push(`[${attachment.name ?? 'file'}] ${snippet}`)
    } catch (err) {
      logger.warn('handler', 'failed to read text attachment for AI context', {
        name: attachment.name,
        error: String(err),
      })
    }
  }

  return snippets
}

function isTextLikeAttachment(name: string, contentType: string): boolean {
  if (contentType.startsWith('text/')) return true
  const lower = name.toLowerCase()
  return (
    lower.endsWith('.txt') ||
    lower.endsWith('.md') ||
    lower.endsWith('.csv') ||
    lower.endsWith('.json')
  )
}

function isAuthorized(message: Message, config: ChannelConfig): boolean {
  if (config.authorizedUserIds.includes(message.author.id)) return true

  if (config.authorizedRoleIds && config.authorizedRoleIds.length > 0) {
    const member = message.member as GuildMember | null
    if (member) {
      return config.authorizedRoleIds.some((roleId) => member.roles.cache.has(roleId))
    }
  }

  return false
}
