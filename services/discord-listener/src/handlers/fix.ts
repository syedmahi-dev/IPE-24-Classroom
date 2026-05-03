import { Client, TextChannel } from 'discord.js'
import Redis from 'ioredis'
import { getConfig, getChannelConfig } from '../config'
import { logger } from '../lib/logger'
import { handleMessageWithFix } from './message'

export function startFixListener(client: Client) {
  const { REDIS_URL } = getConfig()
  const redis = new Redis(REDIS_URL)

  redis.subscribe('discord_fix_requests', (err) => {
    if (err) logger.error('fix-listener', 'Failed to subscribe to discord_fix_requests', { error: String(err) })
    else logger.info('fix-listener', 'Subscribed to discord_fix_requests')
  })

  redis.on('message', async (channel, msg) => {
    if (channel === 'discord_fix_requests') {
      try {
        const { messageId, fixText } = JSON.parse(msg)
        
        // Find the message in the cache or fetch it
        let foundMessage = null
        for (const guild of client.guilds.cache.values()) {
          for (const discordChannel of guild.channels.cache.values()) {
            if (discordChannel.isTextBased()) {
              try {
                const fetched = await (discordChannel as TextChannel).messages.fetch(messageId)
                if (fetched) {
                  foundMessage = fetched
                  break
                }
              } catch (e) {
                // Ignore, message might not be in this channel
              }
            }
          }
          if (foundMessage) break
        }

        if (!foundMessage) {
          logger.warn('fix-listener', 'Original message not found for fix', { messageId })
          return
        }

        await handleMessageWithFix(foundMessage, fixText)
      } catch (e) {
        logger.error('fix-listener', 'Error processing fix request', { error: String(e) })
      }
    }
  })
}
