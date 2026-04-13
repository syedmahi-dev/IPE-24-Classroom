import { Client, GatewayIntentBits } from 'discord.js'
import express, { Request, Response } from 'express'

const app = express()
app.use(express.json({ limit: '1mb' }))

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN!
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID!
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET!
const PORT = parseInt(process.env.PORT ?? '3003')

if (!DISCORD_TOKEN) throw new Error('DISCORD_BOT_TOKEN env var required')
if (!CHANNEL_ID) throw new Error('DISCORD_CHANNEL_ID env var required')
if (!INTERNAL_SECRET) throw new Error('INTERNAL_API_SECRET env var required')

// ── Discord Client ──────────────────────────────────────────────────────────

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
})

let isReady = false

client.once('ready', () => {
  isReady = true
  console.log(`✅ Discord bot logged in as ${client.user?.tag}`)
})

client.login(DISCORD_TOKEN)

// ── HTTP Endpoints ──────────────────────────────────────────────────────────

function requireSecret(req: Request, res: Response, next: Function) {
  const secret = req.headers['x-internal-secret']
  if (secret !== INTERNAL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// POST /announce — n8n calls this to post an announcement to Discord
app.post('/announce', requireSecret, async (req: Request, res: Response) => {
  if (!isReady) {
    return res.status(503).json({ error: 'Discord bot not ready', ready: false })
  }

  const { title, body, type } = req.body

  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' })
  }

  const TYPE_EMOJI: Record<string, string> = {
    general: '📢',
    exam: '📝',
    file_update: '📁',
    routine_update: '📅',
    urgent: '🚨',
    event: '🎉',
  }

  const emoji = TYPE_EMOJI[type] ?? '📢'
  const message = `${emoji} **${title}**\n\n${body.replace(/<[^>]*>/g, '').slice(0, 1800)}\n\n— *IPE-24 Class Portal*`

  try {
    const channel = await client.channels.fetch(CHANNEL_ID)
    if (!channel?.isTextBased()) {
      return res.status(400).json({ error: 'Channel not found or not text-based' })
    }
    await (channel as any).send(message)
    console.log(`📤 Announcement sent to Discord: "${title}"`)
    res.json({ success: true })
  } catch (err: any) {
    console.error('Discord send error:', err.message)
    res.status(500).json({ error: 'Failed to send', detail: err.message })
  }
})

// GET /health
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ready: isReady, tag: client.user?.tag ?? null })
})

// ── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🤖 Discord bot HTTP server running on :${PORT}`)
})
