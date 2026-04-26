import { Telegraf } from 'telegraf'
import express from 'express'
import axios from 'axios'
import Redis from 'ioredis'

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!)
const app = express()
app.use(express.json())

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL!
const ALLOWED_CR_ID = process.env.CR_TELEGRAM_ID!
const PORT = parseInt(process.env.PORT ?? '3004')
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379'

const redis = new Redis(REDIS_URL)
redis.on('error', (err) => console.error('[redis] error:', err.message))

if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN required')
if (!N8N_WEBHOOK_URL) throw new Error('N8N_WEBHOOK_URL required')
if (!ALLOWED_CR_ID) throw new Error('CR_TELEGRAM_ID required')

// ── Guard: only CR can interact ─────────────────────────────────────────────

function isCR(userId: number): boolean {
  return String(userId) === ALLOWED_CR_ID
}

// ── Text Message Handler ────────────────────────────────────────────────────

bot.on('text', async (ctx) => {
  if (!isCR(ctx.from.id)) {
    return ctx.reply('⛔ Only the CR can use this bot.')
  }

  const text = ctx.message.text

  // Forward to n8n for classification and processing
  try {
    await axios.post(N8N_WEBHOOK_URL, {
      type: 'text',
      content: text,
      chatId: ctx.chat.id,
      messageId: ctx.message.message_id,
      timestamp: new Date().toISOString(),
    })

    await ctx.reply('📝 Processing your message...')
  } catch (err: any) {
    console.error('n8n webhook error:', err.message)
    await ctx.reply('❌ Failed to process. Is n8n running?')
  }
})

// ── Voice Message Handler ───────────────────────────────────────────────────

bot.on('voice', async (ctx) => {
  if (!isCR(ctx.from.id)) {
    return ctx.reply('⛔ Only the CR can use this bot.')
  }

  try {
    // Get file link from Telegram
    const fileId = ctx.message.voice.file_id
    const fileLink = await ctx.telegram.getFileLink(fileId)

    // Forward voice file URL to n8n
    await axios.post(N8N_WEBHOOK_URL, {
      type: 'voice',
      fileUrl: fileLink.href,
      duration: ctx.message.voice.duration,
      chatId: ctx.chat.id,
      messageId: ctx.message.message_id,
      timestamp: new Date().toISOString(),
    })

    await ctx.reply('🎙️ Transcribing your voice note...')
  } catch (err: any) {
    console.error('Voice processing error:', err.message)
    await ctx.reply('❌ Failed to process voice note.')
  }
})

// ── Confirmation Handlers ───────────────────────────────────────────────────

bot.on('callback_query', async (ctx) => {
  if (!isCR(ctx.from.id)) return

  // @ts-ignore - telegraf types don't perfectly infer data for callbackQuery
  const data = ctx.callbackQuery.data

  if (data && data.startsWith('dl_')) {
    const isApprove = data.startsWith('dl_approve_')
    const messageId = data.replace('dl_approve_', '').replace('dl_discard_', '')

    // Publish to redis so discord-listener picks it up
    await redis.publish('discord_approvals', JSON.stringify({ messageId, approved: isApprove }))

    // Update the message so buttons disappear
    // @ts-ignore
    const currentText = ctx.callbackQuery.message?.text || 'Announcement Preview'
    await ctx.editMessageText(
      currentText + `\n\n${isApprove ? '✅ Approved & Published' : '❌ Discarded'}`
    ).catch((err) => console.error('Failed to edit message', err))

    await ctx.answerCbQuery(isApprove ? 'Publishing...' : 'Discarded')
  }
})

// ── Health Endpoint ─────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', botUsername: bot.botInfo?.username ?? 'unknown' })
})

// ── Start ───────────────────────────────────────────────────────────────────

async function start() {
  try {
    await bot.launch()
    console.log(`✅ Telegram bot @${bot.botInfo?.username} started`)

    app.listen(PORT, () => {
      console.log(`🤖 Telegram bot health server on :${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start Telegram bot:', err)
    process.exit(1)
  }
}

start()

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
