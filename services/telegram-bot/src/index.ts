import { Telegraf } from 'telegraf'
import express from 'express'
import axios from 'axios'
import Redis from 'ioredis'

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!)
const app = express()
app.use(express.json())

const ALLOWED_CR_ID = process.env.CR_TELEGRAM_ID || process.env.TELEGRAM_CR_CHAT_ID || ''
const PORT = parseInt(process.env.PORT ?? '3004')
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379'

const redis = new Redis(REDIS_URL)
redis.on('error', (err) => console.error('[redis] error:', err.message))

const subRedis = new Redis(REDIS_URL)
subRedis.on('error', (err) => console.error('[subRedis] error:', err.message))

subRedis.subscribe('telegram_send_preview', (err) => {
  if (err) console.error('Failed to subscribe to telegram_send_preview:', err)
  else console.log('✅ Subscribed to telegram_send_preview channel')
})

subRedis.on('message', async (channel, message) => {
  if (channel === 'telegram_send_preview') {
    try {
      const payload = JSON.parse(message)
      const { messageId, previewTextHtml } = payload
      
      await bot.telegram.sendMessage(ALLOWED_CR_ID, previewTextHtml, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Publish', callback_data: `dl_approve_${messageId}` },
              { text: '❌ Discard', callback_data: `dl_discard_${messageId}` }
            ]
          ]
        }
      })
      console.log(`Sent preview to CR for message ${messageId}`)
    } catch (err: any) {
      console.error('Failed to send preview via Telegram:', err.message)
    }
  }
})

if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN required')
if (!ALLOWED_CR_ID) throw new Error('CR_TELEGRAM_ID or TELEGRAM_CR_CHAT_ID required in .env file')

// ── Guard: only CR can interact ─────────────────────────────────────────────

function isCR(userId: number): boolean {
  return String(userId) === ALLOWED_CR_ID
}

// ── Confirmation Handlers ───────────────────────────────────────────────────

bot.on('callback_query', async (ctx) => {
  if (!isCR(ctx.from.id)) return

  // @ts-ignore
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
