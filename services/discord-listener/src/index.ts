import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'
import http from 'http'
import { getConfig, startConfigRefresh } from './config'
import { handleMessage } from './handlers/message'
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
      await handleMessage(message)
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
  process.on('SIGINT',  () => { client.destroy(); healthServer.close(); process.exit(0) })
  process.on('SIGTERM', () => { client.destroy(); healthServer.close(); process.exit(0) })

  await client.login(config.DISCORD_BOT_TOKEN)
  
  // Start dynamic config polling
  startConfigRefresh()
}

main().catch((err) => {
  console.error('Fatal startup error:', err instanceof Error ? err.message : String(err))
  if (err instanceof Error && err.stack) console.error(err.stack)
  process.exit(1)
})
