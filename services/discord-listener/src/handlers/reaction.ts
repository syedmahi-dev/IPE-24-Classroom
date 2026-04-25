import {
  Message,
  MessageReaction,
  User,
  TextChannel,
} from 'discord.js'
import { ChannelConfig } from '../config'
import { ClassificationResult } from '../services/classifier'
import { DriveUploadResult } from '../services/drive'
import { publishAnnouncement } from '../services/publisher'
import {
  buildPublishedEmbed,
  buildDiscardedEmbed,
} from '../services/preview'
import { releaseMessage } from '../lib/redis'
import { logger } from '../lib/logger'
import { getConfig } from '../config'

export async function awaitCRApproval(params: {
  previewMessage: Message
  originalMessage: Message
  channelConfig: ChannelConfig
  classification: ClassificationResult
  files: DriveUploadResult[]
  courseCode?: string
  folderLabel?: string
}): Promise<void> {
  const { previewMessage, originalMessage, channelConfig, classification, files, courseCode, folderLabel } = params
  const { REACTION_TIMEOUT_MS } = getConfig()

  const sourceUrl = originalMessage.url

  // Add reactions to the preview message as affordance
  await previewMessage.react('✅')
  await previewMessage.react('❌')

  try {
    const collected = await previewMessage.awaitReactions({
      filter: (reaction: MessageReaction, user: User) => {
        if (user.bot) return false
        const emojiName = reaction.emoji.name ?? ''
        if (!['✅', '❌'].includes(emojiName)) return false
        // Only authorized users can approve/reject
        return channelConfig.authorizedUserIds.includes(user.id)
      },
      max: 1,
      time: REACTION_TIMEOUT_MS,
      errors: ['time'],
    })

    const reaction = collected.first()
    const approved = reaction?.emoji.name === '✅'

    if (approved) {
      logger.info('reaction', 'CR approved announcement', { title: classification.title })

      const result = await publishAnnouncement(classification, files, sourceUrl, courseCode, folderLabel)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await previewMessage.edit({ embeds: [buildPublishedEmbed(classification, result) as any] })
      await previewMessage.reactions.removeAll()

      // React to the original Discord message to show it was published
      await originalMessage.react('✅').catch(() => {})

      if (result.errors.length > 0) {
        await originalMessage.reply({
          content: `⚠️ Published with warnings:\n${result.errors.map((e) => `• ${e}`).join('\n')}`,
        }).catch(() => {})
      }
    } else {
      logger.info('reaction', 'CR rejected announcement', { title: classification.title })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await previewMessage.edit({ embeds: [buildDiscardedEmbed() as any] })
      await previewMessage.reactions.removeAll()
      await originalMessage.react('❌').catch(() => {})
      await releaseMessage(originalMessage.id) // allow re-processing if CR edits and tries again
    }
  } catch {
    // Timeout — nobody reacted in time
    logger.warn('reaction', 'Review timed out', {
      messageId: originalMessage.id,
      title: classification.title,
    })
    await previewMessage.edit({
      embeds: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buildDiscardedEmbed().setDescription(
          `Review timed out after ${Math.round(REACTION_TIMEOUT_MS / 60000)} minutes. Message was NOT published. To retry, delete and repost.`
        ) as any,
      ],
    })
    await previewMessage.reactions.removeAll()
    await releaseMessage(originalMessage.id)
  }
}
