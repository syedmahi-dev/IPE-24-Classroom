import { Message, TextChannel } from 'discord.js'
import { ChannelConfig } from '../config'
import { ClassificationResult } from '../services/classifier'
import { DriveUploadResult } from '../services/drive'
import { publishAnnouncement } from '../services/publisher'
import { ingestToKnowledgeBase } from '../services/knowledge-ingestor'
import { releaseMessage } from '../lib/redis'
import { logger } from '../lib/logger'
import { getConfig } from '../config'
import Redis from 'ioredis'

export async function awaitTelegramApproval(params: {
  originalMessage: Message
  channelConfig: ChannelConfig
  classification: ClassificationResult
  files: DriveUploadResult[]
  courseCode?: string
  folderLabel?: string
}): Promise<void> {
  const { originalMessage, classification, files, courseCode, folderLabel } = params
  const { REACTION_TIMEOUT_MS, REDIS_URL } = getConfig()

  const sourceUrl = originalMessage.url

  try {
    const approved = await new Promise<boolean>((resolve, reject) => {
      const subscriber = new Redis(REDIS_URL)

      const timeout = setTimeout(() => {
        subscriber.quit()
        reject(new Error('timeout'))
      }, REACTION_TIMEOUT_MS)

      subscriber.subscribe('discord_approvals', (err) => {
        if (err) {
          clearTimeout(timeout)
          subscriber.quit()
          reject(err)
        }
      })

      subscriber.on('message', (channel, message) => {
        if (channel === 'discord_approvals') {
          try {
            const payload = JSON.parse(message)
            if (payload.messageId === originalMessage.id) {
              clearTimeout(timeout)
              subscriber.quit()
              resolve(payload.approved)
            }
          } catch (e) {
            logger.warn('approval', 'Failed to parse redis message', { error: String(e) })
          }
        }
      })
    })

    if (approved) {
      logger.info('approval', 'CR approved announcement via Telegram', { title: classification.title })
      const result = await publishAnnouncement(classification, files, sourceUrl, courseCode, folderLabel)

      // React to the original Discord message to show it was published
      await originalMessage.react('✅').catch(() => {})

      if (result.errors.length > 0) {
        await originalMessage.reply({
          content: `⚠️ Published with warnings:\n${result.errors.map((e) => `• ${e}`).join('\n')}`,
        }).catch(() => {})
      }

      // Background: ingest into RAG knowledge base (non-blocking)
      const channelName = (originalMessage.channel as TextChannel).name ?? originalMessage.channel.id
      ingestToKnowledgeBase({
        messageId: originalMessage.id,
        channelName,
        classification,
        files,
        courseCode,
      }).catch(err => logger.warn('approval', 'KB ingestion failed (non-fatal)', { error: String(err) }))
    } else {
      logger.info('approval', 'CR rejected announcement via Telegram', { title: classification.title })
      await originalMessage.react('❌').catch(() => {})
      await releaseMessage(originalMessage.id) // allow re-processing if CR edits and tries again
    }
  } catch (err: any) {
    if (err.message === 'timeout') {
      logger.warn('approval', 'Telegram review timed out', {
        messageId: originalMessage.id,
        title: classification.title,
      })
      await releaseMessage(originalMessage.id)
    } else {
      logger.error('approval', 'Error waiting for approval', { error: String(err) })
    }
  }
}
