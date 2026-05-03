import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'
import http from 'http'
import { getConfig, getChannelConfig, startConfigRefresh } from './config'
import { handleBatchedMessages, handleMessage } from './handlers/message'
import { enqueueMessage, clearAllBatches } from './lib/batcher'
import { logger } from './lib/logger'

async function main() {
  const config = getConfig()

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,       // Required — enable in Dev Portal
      GatewayIntentBits.GuildMessageReactions, // Required for REVIEW_GATE
    ],
    // Partials allow handling reactions on messages that weren't cached at startup
    partials: [Partials.Message, Partials.Reaction, Partials.User],
  })

  client.once(Events.ClientReady, (c) => {
    logger.info('bot', `logged in as ${c.user.tag}`, {
      guildId: config.DISCORD_GUILD_ID,
      channelsWatched: config.DISCORD_CHANNEL_CONFIGS.length,
    })
  })

  client.on(Events.MessageCreate, async (message) => {
    try {
      // Skip bots and DMs early
      if (message.author.bot || !message.guild) return

      // Only batch messages from watched & authorized channels
      const channelConfig = getChannelConfig(message.channel.id)
      if (!channelConfig) return

      // Enqueue into the batcher — it will debounce rapid-fire messages
      // from the same user in the same channel and flush them as one batch.
      enqueueMessage(message, async (messages) => {
        try {
          if (messages.length === 1) {
            // Single message — use the original handler directly
            await handleMessage(messages[0])
          } else {
            // Multiple messages batched — merge and process as one
            await handleBatchedMessages(messages)
          }
        } catch (err) {
          logger.error('bot', 'error processing batched messages', { error: String(err) })
        }
      })
    } catch (err) {
      logger.error('bot', 'top-level error in messageCreate', { error: String(err) })
    }
  })

  // Health endpoint for Uptime Kuma / monitoring
  const healthServer = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        status: 'ok',
        ready: client.isReady(),
        uptime: process.uptime(),
      }))
    } else {
      res.writeHead(404)
      res.end()
    }
  })

  healthServer.listen(3005, '0.0.0.0', () => {
    logger.info('health', 'health server on :3005')
  })

  // Graceful shutdown
  process.on('SIGINT',  () => { clearAllBatches(); client.destroy(); healthServer.close(); process.exit(0) })
  process.on('SIGTERM', () => { clearAllBatches(); client.destroy(); healthServer.close(); process.exit(0) })

  await client.login(config.DISCORD_BOT_TOKEN)
  
  // Start dynamic config polling
  startConfigRefresh()

  // Start fix requests listener
  const { startFixListener } = await import('./handlers/fix')
  startFixListener(client)
}

main().catch((err) => {
  console.error('Fatal startup error:', err instanceof Error ? err.message : String(err))
  if (err instanceof Error && err.stack) console.error(err.stack)
  process.exit(1)
})
