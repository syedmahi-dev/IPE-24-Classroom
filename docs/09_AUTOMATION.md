# Automation Pipeline — Telegram, n8n, Baileys, Discord

## Overview

The CR controls all publishing from Telegram. The pipeline:
```
Telegram (voice/text)
  → Telegraf bot downloads/receives
  → n8n webhook triggered
  → [if voice] faster-whisper transcribes
  → Gemini Flash classifies + formats
  → Confirmation sent to CR in Telegram
  → CR approves ("yes") or rejects ("no")
  → On approval: POST to website API + Discord bot + WhatsApp bot
  → Success confirmation to CR
```

---

## Telegram Bot (`services/telegram-bot`)

### Setup
```bash
mkdir services/telegram-bot && cd services/telegram-bot
npm init -y
npm install --save-exact telegraf node-fetch form-data
npm install --save-dev @types/node typescript tsx
```

### `services/telegram-bot/src/index.ts`
```typescript
import { Telegraf, Context } from 'telegraf'
import { message } from 'telegraf/filters'
import fetch from 'node-fetch'
import FormData from 'form-data'
import fs from 'fs'
import path from 'path'
import https from 'https'

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!)

// SECURITY: Only respond to authorized chat IDs
const AUTHORIZED_IDS = (process.env.AUTHORIZED_CHAT_IDS ?? '')
  .split(',')
  .map(id => parseInt(id.trim()))

function isAuthorized(ctx: Context): boolean {
  return AUTHORIZED_IDS.includes(ctx.chat?.id ?? 0)
}

// Handle text messages
bot.on(message('text'), async (ctx) => {
  if (!isAuthorized(ctx)) return  // Silently ignore unauthorized users

  const text = ctx.message.text
  if (text === '/start') {
    return ctx.reply('🤖 CR Bot ready. Send me a voice note or type an announcement.')
  }

  // Forward to n8n
  await forwardToN8n({ type: 'text', content: text, chatId: ctx.chat.id })
  await ctx.reply('⏳ Processing...')
})

// Handle voice notes
bot.on(message('voice'), async (ctx) => {
  if (!isAuthorized(ctx)) return

  await ctx.reply('🎙️ Received voice note. Transcribing...')

  const fileId = ctx.message.voice.file_id
  const fileLink = await ctx.telegram.getFileLink(fileId)

  // Download voice file
  const tmpPath = `/tmp/voice_${Date.now()}.ogg`
  await downloadFile(fileLink.href, tmpPath)

  // Forward to n8n with file path
  await forwardToN8n({ type: 'voice', filePath: tmpPath, chatId: ctx.chat.id })
})

async function forwardToN8n(payload: {
  type: 'text' | 'voice'
  content?: string
  filePath?: string
  chatId: number
}) {
  // If voice, read file as base64 and include in payload
  if (payload.type === 'voice' && payload.filePath) {
    const audioBase64 = fs.readFileSync(payload.filePath).toString('base64')
    const body = JSON.stringify({
      type: 'voice',
      audioBase64,
      filename: path.basename(payload.filePath),
      chatId: payload.chatId,
    })
    await fetch(process.env.N8N_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    fs.unlinkSync(payload.filePath)  // Clean up temp file
  } else {
    await fetch(process.env.N8N_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'text', content: payload.content, chatId: payload.chatId }),
    })
  }
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (res) => {
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', (err) => {
      fs.unlink(dest, () => {})
      reject(err)
    })
  })
}

bot.launch()
console.log('Telegram bot running...')

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
```

---

## n8n Workflow

Set up n8n at `https://your-domain.me/n8n`. Import this workflow JSON via n8n UI.

### Workflow: `CR Announcement Pipeline`

**Node 1: Webhook Trigger**
- Type: Webhook
- Path: `/telegram-incoming`
- Method: POST
- Authentication: None (internal network only, not exposed publicly)

**Node 2: Route by Type**
- Type: Switch
- Condition: `{{ $json.type === 'voice' }}`
  - True → Node 3 (Transcribe)
  - False → Node 4 (Classify)

**Node 3: Transcribe Voice (HTTP Request)**
- Type: HTTP Request
- URL: `http://transcriber:8000/transcribe`
- Method: POST
- Body (JSON):
  ```json
  {
    "audio_base64": "{{ $json.audioBase64 }}",
    "filename": "{{ $json.filename }}"
  }
  ```
- Output: `{{ $json.transcript }}` → passes to Node 4

**Node 4: Classify + Format (HTTP Request)**
- Type: HTTP Request
- URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={{ $env.GEMINI_API_KEY }}`
- Method: POST
- Body (JSON):
  ```json
  {
    "contents": [{
      "parts": [{
        "text": "You are an assistant for a university class CR. Analyze the following message and respond with ONLY a JSON object (no markdown, no explanation).\n\nMessage: \"{{ $node['Route by Type'].json.type === 'voice' ? $node['Transcribe Voice'].json.transcript : $json.content }}\"\n\nRespond with this exact JSON structure:\n{\n  \"type\": \"general|exam|file_update|routine_update|urgent|event\",\n  \"title\": \"short title (max 60 chars)\",\n  \"body\": \"clean formatted message body\",\n  \"urgency\": \"low|medium|high\"\n}"
      }]
    }],
    "generationConfig": { "temperature": 0.1, "maxOutputTokens": 400 }
  }
  ```

**Node 5: Parse Gemini Response (Code Node)**
```javascript
const responseText = $input.first().json.candidates[0].content.parts[0].text
const cleaned = responseText.replace(/```json|```/g, '').trim()
const parsed = JSON.parse(cleaned)

const typeEmoji = {
  general: '📢', exam: '📝', file_update: '📁',
  routine_update: '📅', urgent: '🚨', event: '🎉'
}

const preview = `${typeEmoji[parsed.type] || '📢'} *${parsed.title}*\n\n${parsed.body}\n\n_Type: ${parsed.type} · Urgency: ${parsed.urgency}_\n\n✅ Reply *yes* to publish to website + Discord + WhatsApp\n❌ Reply *no* to cancel`

return [{ json: { ...parsed, preview, chatId: $('Webhook Trigger').first().json.chatId } }]
```

**Node 6: Send Preview to CR (HTTP Request — Telegram)**
- URL: `https://api.telegram.org/bot{{ $env.TELEGRAM_BOT_TOKEN }}/sendMessage`
- Method: POST
- Body:
  ```json
  {
    "chat_id": "{{ $json.chatId }}",
    "text": "{{ $json.preview }}",
    "parse_mode": "Markdown"
  }
  ```

**Node 7: Wait for Approval (Wait Node)**
- Type: Wait
- Wait for: Webhook (`/approval-{{ $json.chatId }}`)
- Timeout: 30 minutes (then auto-cancel)

**Node 8: Check Approval (Switch)**
- Condition: `{{ $json.body.toLowerCase().includes('yes') || $json.body === 'ok' || $json.body === 'send' }}`
  - True → Nodes 9-11 (Publish)
  - False → Node 12 (Cancel)

**Node 9: Publish to Website (HTTP Request)**
- URL: `http://web:3000/api/v1/internal/announcements`
- Method: POST
- Headers: `{ "x-internal-secret": "{{ $env.INTERNAL_API_SECRET }}" }`
- Body:
  ```json
  {
    "title": "{{ $node['Parse Gemini Response'].json.title }}",
    "body": "{{ $node['Parse Gemini Response'].json.body }}",
    "type": "{{ $node['Parse Gemini Response'].json.type }}"
  }
  ```

**Node 10: Publish to Discord (HTTP Request)**
- URL: `http://discord-bot:3003/announce`
- Method: POST
- Headers: `{ "x-internal-secret": "{{ $env.INTERNAL_API_SECRET }}" }`
- Body: same as above

**Node 11: Publish to WhatsApp (HTTP Request)**
- URL: `http://whatsapp-bot:3002/send`
- Method: POST
- Headers: `{ "x-internal-secret": "{{ $env.INTERNAL_API_SECRET }}" }`
- Body:
  ```json
  {
    "message": "{{ $node['Parse Gemini Response'].json.preview }}"
  }
  ```

**Node 12: Confirm to CR (HTTP Request — Telegram)**
- URL: `https://api.telegram.org/bot{{ $env.TELEGRAM_BOT_TOKEN }}/sendMessage`
- Body:
  ```json
  {
    "chat_id": "{{ $('Webhook Trigger').first().json.chatId }}",
    "text": "{{ $node['Check Approval'].json.approved ? '✅ Published to all platforms!' : '❌ Cancelled.' }}"
  }
  ```

---

## WhatsApp Bot (Baileys)

### `apps/bot/src/index.ts`
```typescript
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeInMemoryStore,
  proto,
} from '@whiskeysockets/baileys'
import express from 'express'
import { Boom } from '@hapi/boom'
import pino from 'pino'

const app = express()
app.use(express.json())

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET!
const GROUP_JID = process.env.WHATSAPP_GROUP_JID!
const AUTH_DIR = './auth_info'

let sock: ReturnType<typeof makeWASocket> | null = null
let isConnected = false

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

  sock = makeWASocket({
    logger: pino({ level: 'warn' }),
    auth: state,
    browser: ['IPE24 Bot', 'Chrome', '1.0.0'],
  })

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('Scan this QR code with your WhatsApp (dedicated number):')
      // QR will print to terminal on first run
      const qrcode = require('qrcode-terminal')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      isConnected = false
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) {
        console.log('Reconnecting...')
        setTimeout(connectToWhatsApp, 5000)
      } else {
        console.log('Logged out. Delete auth_info/ and restart to re-scan QR.')
      }
    }

    if (connection === 'open') {
      isConnected = true
      console.log('WhatsApp connected ✓')
    }
  })

  sock.ev.on('creds.update', saveCreds)
}

// HTTP endpoint for n8n to call
app.post('/send', async (req, res) => {
  const secret = req.headers['x-internal-secret']
  if (secret !== INTERNAL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!isConnected || !sock) {
    return res.status(503).json({ error: 'WhatsApp not connected' })
  }

  const { message } = req.body
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message required' })
  }

  // Sanitize message length
  const safeMessage = message.slice(0, 4096)

  try {
    await sock.sendMessage(GROUP_JID, { text: safeMessage })
    res.json({ success: true })
  } catch (err: any) {
    console.error('WhatsApp send error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/health', (_, res) => {
  res.json({ connected: isConnected })
})

const PORT = parseInt(process.env.PORT ?? '3002')
app.listen(PORT, () => {
  console.log(`WhatsApp bot HTTP server on :${PORT}`)
  connectToWhatsApp()
})
```

### First Run Instructions
```bash
# Start the bot container in foreground to see QR code
docker compose run --rm whatsapp-bot

# A QR code prints in the terminal
# Open WhatsApp on your dedicated bot SIM number
# Settings → Linked Devices → Link a Device → Scan QR

# Once scanned, auth_info/ is saved (mounted as volume)
# Bot stays connected on future restarts without re-scanning
```

---

## Discord Bot (`services/discord-bot`)

### `services/discord-bot/src/index.ts`
```typescript
import { Client, GatewayIntentBits, EmbedBuilder, TextChannel } from 'discord.js'
import express from 'express'

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
const app = express()
app.use(express.json())

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET!

const TYPE_COLORS: Record<string, number> = {
  general: 0x3b82f6,
  exam: 0xef4444,
  file_update: 0x22c55e,
  routine_update: 0xf59e0b,
  urgent: 0xdc2626,
  event: 0x8b5cf6,
}

client.once('ready', () => {
  console.log(`Discord bot logged in as ${client.user?.tag}`)
})

app.post('/announce', async (req, res) => {
  const secret = req.headers['x-internal-secret']
  if (secret !== INTERNAL_SECRET) return res.status(401).json({ error: 'Unauthorized' })

  const { title, body, type } = req.body
  if (!title || !body) return res.status(400).json({ error: 'title and body required' })

  const channel = client.channels.cache.get(process.env.DISCORD_ANNOUNCE_CHANNEL_ID!) as TextChannel
  if (!channel) return res.status(404).json({ error: 'Channel not found' })

  const embed = new EmbedBuilder()
    .setTitle(title.slice(0, 256))
    .setDescription(body.slice(0, 4096))
    .setColor(TYPE_COLORS[type] ?? 0x3b82f6)
    .setTimestamp()
    .setFooter({ text: 'IPE-24 Class Portal' })

  await channel.send({ content: '@here', embeds: [embed] })
  res.json({ success: true })
})

app.get('/health', (_, res) => res.json({ connected: client.isReady() }))

const PORT = parseInt(process.env.PORT ?? '3003')
app.listen(PORT, () => console.log(`Discord bot HTTP on :${PORT}`))

client.login(process.env.DISCORD_BOT_TOKEN)
```

---

## Docker Compose for All Services

```yaml
# infrastructure/docker-compose.yml
version: '3.9'

services:
  postgres:
    image: pgvector/pgvector:pg16
    restart: always
    environment:
      POSTGRES_DB: ipe24_db
      POSTGRES_USER: ipe24
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7.2-alpine
    restart: always
    volumes:
      - redis_data:/data

  transcriber:
    build: ../services/transcriber
    restart: always
    ports:
      - "127.0.0.1:8000:8000"

  web:
    build: ../apps/web
    restart: always
    env_file: ../apps/web/.env
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      - postgres
      - redis
      - transcriber
    command: sh -c "npx prisma migrate deploy && node server.js"

  whatsapp-bot:
    build: ../apps/bot
    restart: always
    env_file: ../apps/bot/.env
    ports:
      - "127.0.0.1:3002:3002"
    volumes:
      - whatsapp_auth:/app/auth_info

  discord-bot:
    build: ../services/discord-bot
    restart: always
    env_file: ../services/discord-bot/.env
    ports:
      - "127.0.0.1:3003:3003"

  telegram-bot:
    build: ../services/telegram-bot
    restart: always
    env_file: ../services/telegram-bot/.env

  n8n:
    image: n8nio/n8n:1.48.0
    restart: always
    ports:
      - "127.0.0.1:5678:5678"
    env_file: .env.n8n
    volumes:
      - n8n_data:/home/node/.n8n

  uptime-kuma:
    image: louislam/uptime-kuma:1
    restart: always
    ports:
      - "127.0.0.1:3001:3001"
    volumes:
      - uptime_data:/app/data

volumes:
  postgres_data:
  redis_data:
  whatsapp_auth:
  n8n_data:
  uptime_data:
```
