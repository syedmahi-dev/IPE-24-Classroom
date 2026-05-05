import { Message, TextChannel, GuildMember, MessageReaction, User, Collection, Attachment } from 'discord.js'
import fetch from 'node-fetch'
import { ChannelConfig, getChannelConfig, getConfig, getActiveCourses } from '../config'
import { claimMessage, releaseMessage } from '../lib/redis'
import { mergeBatch, MergedBatch } from '../lib/batcher'
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
import { buildPreviewEmbed, buildTelegramPreviewHtml } from '../services/preview'
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


/**
 * Primary entry point for processing one or more Discord messages as a single announcement.
 */
export async function handleMessages(messages: Message[]): Promise<void> {
  if (messages.length === 0) return

  const isBatch = messages.length > 1
  const anchor = messages[0]
  
  if (anchor.author.bot || !anchor.guild) return

  const channelConfig = getChannelConfig(anchor.channel.id)
  if (!channelConfig) return

  if (!isAuthorized(anchor, channelConfig)) return

  // Deduplication: claim all message IDs in the batch
  const messageIds = messages.map(m => m.id)
  const results = await Promise.all(messageIds.map(id => claimMessage(id)))
  
  // If this was a single message and it's already claimed, stop
  if (!isBatch && !results[0]) {
    logger.warn('handler', 'duplicate message skipped', { messageId: anchor.id })
    return
  }
  // For batches, we keep going even if some sub-messages were already claimed (rare),
  // but we warn if the anchor itself is a duplicate.
  if (isBatch && !results[0]) {
    logger.warn('handler', 'batch anchor is duplicate, but processing rest of batch', { messageId: anchor.id })
  }

  const channelName = (anchor.channel as TextChannel).name ?? anchor.channel.id
  logger.info('handler', `processing ${isBatch ? 'BATCHED' : 'single'} message(s)`, {
    count: messages.length,
    channel: channelName,
    mode: channelConfig.mode,
    author: anchor.author.username,
  })

  try {
    await anchor.react('⏳').catch(() => {})

    // Use the batcher utility to merge content even for single messages (for consistency)
    const batch = mergeBatch(messages)
    const allAttachmentValues = [...batch.allAttachments.values()]
    const attachmentNames = allAttachmentValues.map((a) => a.name ?? 'file')
    const attachmentSummaries = allAttachmentValues.map((a) => {
      const type = a.contentType ?? 'unknown'
      return `${a.name ?? 'file'} (${type})`
    })

    // Extract text snippets from ALL messages' text-like attachments
    const textSnippets: string[] = []
    for (const msg of messages) {
      const snippets = await extractTextSnippetsFromAttachments(msg)
      textSnippets.push(...snippets)
    }

    const messageText = buildClassificationInput(batch.mergedContent, attachmentSummaries, textSnippets)

    // Collect images from ALL messages for Gemini vision
    const images: ImageInput[] = []
    let imageCount = 0
    for (const attachment of batch.allAttachments.values()) {
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
        logger.warn('handler', 'failed to download image for AI', { url: attachment.url, error: String(err) })
      }
    }

    // 1. Classify with Gemini
    const classification: ClassificationResult = channelConfig.defaultAnnouncementType
        ? {
            type: channelConfig.defaultAnnouncementType,
            title: messageText.split(/[.\n]/)[0].slice(0, 60) || 'Class Announcement',
            body: messageText,
            urgency: 'medium',
            fileCategory: 'other',
            detectedCourseCode: null,
            detectedCourseType: null,
            overrides: [],
            confidence: 'high',
          }
      : await classifyMessage(messageText, attachmentNames, images)

    // Fallback classification from channel name
    if (!classification.detectedCourseCode) {
      const courseFromChannel = detectCourseCodeFromText(channelName)
      if (courseFromChannel) {
        classification.detectedCourseCode = courseFromChannel
      }
    }

    // Auto-promote 'general' to 'course_update' if course code is present
    if (classification.type === 'general' && classification.detectedCourseCode) {
      classification.type = 'course_update'
    }

    // 2. Resolve Drive routing
    const allowedCourseCodes = new Set(
      (channelConfig.allowedCourseCodes ?? []).map((c) => normalizeCourseCode(c)).filter(Boolean)
    )
    const fallbackSubFolderName = resolveFallbackSubFolderName(channelConfig)
    const defaultCourseCode = resolveAllowedCourseCode(
      channelConfig.courseCode || classification.detectedCourseCode || undefined,
      allowedCourseCodes
    )
    const defaultSubFolderName = defaultCourseCode || fallbackSubFolderName

    // 3. Upload Attachments
    const files: DriveUploadResult[] = []
    for (const attachment of batch.allAttachments.values()) {
      if (!ALLOWED_MIME_TYPES.has(attachment.contentType ?? '') || attachment.size > MAX_FILE_SIZE) continue

      try {
        const fileCourseCode = resolveAllowedCourseCode(
          detectCourseCodeFromText(`${attachment.name ?? ''} ${batch.mergedContent}`) || defaultCourseCode,
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
      } catch (err) {
        logger.error('handler', 'file upload failed', { name: attachment.name, error: String(err) })
      }
    }

    // 4. Handle Shared Drive Links in text
    for (const msg of messages) {
      const driveLinks = extractDriveLinks(msg.content || '')
      for (const link of driveLinks) {
        try {
          if (isFolderUrl(link)) {
            const folderFiles = await listDriveFolderFiles(link)
            for (const f of folderFiles) {
              const linkCourseCode = resolveAllowedCourseCode(detectCourseCodeFromText(f.name) || defaultCourseCode, allowedCourseCodes)
              files.push({ ...f, courseCode: linkCourseCode ?? null })
            }
          } else {
            const metadata = await getDriveFileMetadata(link)
            if (metadata) {
              const linkCourseCode = resolveAllowedCourseCode(detectCourseCodeFromText(metadata.name) || defaultCourseCode, allowedCourseCodes)
              files.push({ ...metadata, courseCode: linkCourseCode ?? null })
            }
          }
        } catch (err) {
          logger.warn('handler', 'failed to expand Drive link', { error: String(err) })
        }
      }
    }

    // Cleanup reaction
    await anchor.reactions.cache.get('⏳')?.users.remove().catch(() => {})

    // 5. Final Step: Publish or Review Gate
    if (channelConfig.mode === 'AUTO_PUBLISH') {
      await handleAutoPublish(anchor, classification, files, defaultCourseCode, channelConfig.label)
    } else {
      await handleReviewGate(anchor, channelConfig, classification, files, channelName, defaultCourseCode, channelConfig.label)
    }
  } catch (err) {
    logger.error('handler', 'fatal error in message processing', { error: String(err) })
    await anchor.react('💥').catch(() => {})
  }
}

// Legacy exports for compatibility
export const handleMessage = (message: Message) => handleMessages([message])
export const handleBatchedMessages = (messages: Message[]) => handleMessages(messages)


function resolveFallbackSubFolderName(channelConfig: ChannelConfig): string {
  if (channelConfig.label) {
    return channelConfig.label
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return 'General'
}

/**
 * Intelligent course code detection using the active course list from DB.
 */
function detectCourseCodeFromText(input: string): string | null {
  const activeCourses = getActiveCourses()
  const upperInput = input.toUpperCase()
  
  // 1. Precise match against known codes (e.g. "IPE4208")
  // We'll prioritize the codes we know are in the DB
  if (activeCourses.length > 0) {
    for (const course of activeCourses) {
      const code = course.code.toUpperCase()
      // Use word boundaries to avoid partial matches (e.g. "IPE4" matching "IPE4208")
      const regex = new RegExp(`\\b${code.replace(/\s+/g, '\\s*')}\\b`, 'i')
      if (regex.test(upperInput)) {
        return code.replace(/\s+/g, '')
      }
    }
  }

  // 2. Fallback to generic regex extraction if no active course matches
  const match = upperInput.match(/\b([A-Z]{2,6})\s*-?\s*(\d{4})\b/)
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
  const isScheduleUpdate = channelConfig.defaultAnnouncementType === 'routine_update' || classification.overrides.length > 0
  const isConflict = classification.confidence === 'low' || (courseCode && classification.detectedCourseCode && normalizeCourseCode(courseCode) !== normalizeCourseCode(classification.detectedCourseCode))

  // Schedule updates still need explicit approval but cap at 24h to prevent zombie handlers
  const SCHEDULE_TIMEOUT_MS = 24 * 60 * 60 * 1000 // 24 hours
  const timeoutMs: number = isScheduleUpdate ? SCHEDULE_TIMEOUT_MS : getConfig().REACTION_TIMEOUT_MS
  logger.info('handler', 'review gate awaiting confirmation', {
    channel: sourceChannelName,
    title: classification.title,
    isScheduleUpdate,
    isConflict,
    timeoutMs,
  })

  // ── 1. Post Discord embed preview as a reply ──────────────────────────────
  let previewContent = isScheduleUpdate
    ? '📅 Schedule update detected. Approval is required before publishing. React ✅ to publish or ❌ to discard.'
    : '📋 New announcement detected. Sent to CR for review. Auto-publishes in 2hrs if no response.'

  if (isConflict) {
    previewContent = `⚠️ **COURSE CONFLICT DETECTED**: Gemini detected "${classification.detectedCourseCode}" but channel is linked to "${courseCode}". CR, please review carefully in Telegram!`
  }

  const previewMessage = await message.reply({
    content: previewContent,
    embeds: [buildPreviewEmbed(classification, files, sourceChannelName, timeoutMs).toJSON() as any],
  }).catch(() => null)

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

  // ── 2. Start listening for approval BEFORE sending Telegram preview ───────
  // This prevents a race condition where the CR clicks approve on Telegram
  // before we start listening, causing the approval to be lost.
  const reviewPromise = waitForReviewDecision(previewMessage, message, channelConfig, timeoutMs)

  // ── 3. NOW send preview to Telegram (safe — we're already listening) ──────
  try {
    const previewHtml = buildTelegramPreviewHtml(classification, files, message.url)
    const Redis = (await import('ioredis')).default
    const { REDIS_URL } = getConfig()
    const pubRedis = new Redis(REDIS_URL)
    try {
      await pubRedis.publish('telegram_send_preview', JSON.stringify({
        messageId: message.id,
        previewTextHtml: previewHtml
      }))
      logger.info('handler', 'Sent preview to Telegram for approval')
    } finally {
      pubRedis.quit().catch(() => {})
    }
  } catch (e) {
    logger.warn('handler', 'failed to send telegram preview', { error: String(e) })
  }

  // ── 4. Wait for the decision ──────────────────────────────────────────────
  const decision = await reviewPromise

  if (decision === 'superseded') {
    logger.info('handler', 'review gate superseded by fix request', { messageId: message.id })
    await previewMessage.reply('🔄 Fix request received. Generating revised preview...').catch(() => {})
    // The fix listener will pick up the request and spawn a new handleMessageWithFix.
    return
  }

  if (decision === 'timed_out') {
    logger.warn('handler', 'review decision: timed_out', {
      messageId: message.id,
      title: classification.title,
      isScheduleUpdate,
    })

    if (isScheduleUpdate) {
      await message.react('⏸️').catch(() => {})
      await previewMessage.reply('⏸️ No approval received. This schedule update was NOT published. Explicit approval is required.').catch(() => {})
      await releaseMessage(message.id)
      return
    }

    await previewMessage.reply('⌛ No review action received within 2 hours. Auto-publishing.').catch(() => {})
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
  timeoutMs: number
): Promise<'approved' | 'discarded' | 'timed_out' | 'superseded'> {
  const { REDIS_URL } = getConfig()
  const Redis = (await import('ioredis')).default

  let subscriber: any = null
  let timeoutHandle: any = null

  // Set up Redis subscriber FIRST — must be ready before any approval can arrive
  const redisReady = new Promise<void>((resolveReady) => {
    subscriber = new Redis(REDIS_URL)
    subscriber.subscribe('discord_approvals', 'discord_fix_requests', () => {
      resolveReady() // Signal that we're subscribed and listening
    })
  })

  // Wait for Redis subscription to be active before proceeding
  await redisReady

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
    timeoutHandle = setTimeout(() => {
      resolve('timed_out')
    }, timeoutMs)

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
  // "ALL" wildcard — any guild member can review
  if (config.authorizedUserIds.includes('ALL')) return true
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
  // "ALL" wildcard — any guild member can trigger
  if (config.authorizedUserIds.includes('ALL')) return true
  if (config.authorizedUserIds.includes(message.author.id)) return true

  if (config.authorizedRoleIds && config.authorizedRoleIds.length > 0) {
    const member = message.member as GuildMember | null
    if (member) {
      return config.authorizedRoleIds.some((roleId) => member.roles.cache.has(roleId))
    }
  }

  return false
}
