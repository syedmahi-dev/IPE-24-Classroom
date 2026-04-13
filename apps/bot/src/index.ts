// apps/bot/src/index.ts

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  proto,
} from '@whiskeysockets/baileys'
import express, { Request, Response } from 'express'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import qrcode from 'qrcode-terminal'

const app = express()
app.use(express.json({ limit: '1mb' }))

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET!
const GROUP_JID = process.env.WHATSAPP_GROUP_JID!
const AUTH_DIR = './auth_info'
const PORT = parseInt(process.env.PORT ?? '3002')

if (!INTERNAL_SECRET) throw new Error('INTERNAL_API_SECRET env var required')
if (!GROUP_JID) throw new Error('WHATSAPP_GROUP_JID env var required')

let sock: ReturnType<typeof makeWASocket> | null = null
let isConnected = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10

// ── WhatsApp Connection ──────────────────────────────────────────────────────

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

  sock = makeWASocket({
    logger: pino({ level: 'warn' }),
    auth: state,
    browser: ['IPE24-Bot', 'Chrome', '120.0.0'],
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
  })

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 Scan this QR code with your dedicated WhatsApp number:')
      console.log('   (WhatsApp → Settings → Linked Devices → Link a Device)\n')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      isConnected = false
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const isLoggedOut = statusCode === DisconnectReason.loggedOut
      const isConflict = statusCode === DisconnectReason.connectionReplaced

      if (isLoggedOut) {
        console.log('❌ Logged out. Delete auth_info/ directory and restart to re-scan QR.')
        process.exit(1)
      } else if (isConflict) {
        console.log('⚠️  Another WhatsApp Web session opened. This connection was replaced.')
        process.exit(1)
      } else if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++
        const delay = Math.min(reconnectAttempts * 3000, 30000)
        console.log(`🔄 Reconnecting in ${delay/1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`)
        setTimeout(connectToWhatsApp, delay)
      } else {
        console.error('❌ Max reconnection attempts reached. Exiting.')
        process.exit(1)
      }
    }

    if (connection === 'open') {
      isConnected = true
      reconnectAttempts = 0
      console.log('✅ WhatsApp connected!')
    }
  })

  sock.ev.on('creds.update', saveCreds)
}

// ── HTTP Endpoints ───────────────────────────────────────────────────────────

// Auth middleware
function requireSecret(req: Request, res: Response, next: Function) {
  const secret = req.headers['x-internal-secret']
  if (secret !== INTERNAL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// POST /send — n8n calls this to send a message to the WhatsApp group
app.post('/send', requireSecret, async (req: Request, res: Response) => {
  if (!isConnected || !sock) {
    return res.status(503).json({ error: 'WhatsApp not connected', connected: false })
  }

  const { message } = req.body

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message (string) required' })
  }

  if (message.trim().length === 0) {
    return res.status(400).json({ error: 'message cannot be empty' })
  }

  // Cap message length (WhatsApp limit is 65,536 chars)
  const safeMessage = message.slice(0, 4000)

  try {
    await sock.sendMessage(GROUP_JID, { text: safeMessage })
    console.log(`📤 Message sent to group (${safeMessage.length} chars)`)
    res.json({ success: true, length: safeMessage.length })
  } catch (err: any) {
    console.error('Send error:', err.message)
    res.status(500).json({ error: 'Failed to send message', detail: err.message })
  }
})

// GET /health — Uptime Kuma polls this
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    connected: isConnected,
    group: GROUP_JID,
    reconnectAttempts,
  })
})

// ── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🤖 WhatsApp bot HTTP server running on :${PORT}`)
  connectToWhatsApp()
})

// Graceful shutdown
process.once('SIGINT', async () => {
  console.log('\nShutting down...')
  await sock?.end(undefined)
  process.exit(0)
})
