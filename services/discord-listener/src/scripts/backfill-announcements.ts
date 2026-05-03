/**
 * Backfill Announcements Script
 * 
 * Fetches historical messages from all monitored Discord channels
 * and creates announcement records in the database via the internal API.
 * 
 * This was created after a database wipe on May 3 2026 to restore
 * all announcements from Discord history.
 *
 * Usage:
 *   cd services/discord-listener
 *   npx ts-node src/scripts/backfill-announcements.ts
 *
 * Options (environment):
 *   MAX_MESSAGES_PER_CHANNEL=500 (default)
 *   DRY_RUN=true (log but don't publish)
 *   SKIP_CLASSIFICATION=true (use raw message content, no Gemini)
 */

import 'dotenv/config'
import { Client, GatewayIntentBits, TextChannel, Message, Collection } from 'discord.js'
import { getConfig, ChannelConfig } from '../config'
import { classifyMessage } from '../services/classifier'
import { extractDriveLinks } from '../services/drive'
import fetch from 'node-fetch'

const MAX_MESSAGES = parseInt(process.env.MAX_MESSAGES_PER_CHANNEL || '500', 10)
const DRY_RUN = process.env.DRY_RUN === 'true'

// All channels to backfill — pulled from seed-bot-channels.ts
const BACKFILL_CHANNELS = [
  { channelId: '1427172111482622063', label: 'announcements', courseCode: undefined },
  { channelId: '1495095972433236081', label: 'informations', courseCode: undefined },
  { channelId: '1495116749996294294', label: 'schedule-updates', courseCode: undefined, defaultType: 'routine_update' as const },
  { channelId: '1450539338311008318', label: 'resources', courseCode: undefined },
  { channelId: '1495796581780160574', label: 'MATH-4211', courseCode: 'MATH4211' },
  { channelId: '1495877347558035558', label: 'HUM-4212', courseCode: 'HUM4212' },
  { channelId: '1495874001874980925', label: 'PHY-4213', courseCode: 'PHY4213' },
  { channelId: '1495874227369279768', label: 'CHEM-4215', courseCode: 'CHEM4215' },
  { channelId: '1495874340992979035', label: 'ME-4225', courseCode: 'ME4225' },
  { channelId: '1495826110309466303', label: 'EEE-4281', courseCode: 'EEE4281' },
  { channelId: '1495879542018015503', label: 'IPE-4208', courseCode: 'IPE4208' },
  { channelId: '1495877858617458748', label: 'ME-4210', courseCode: 'ME4210' },
  { channelId: '1495879439580397771', label: 'PHY-4214', courseCode: 'PHY4214' },
  { channelId: '1495879322093752510', label: 'CHEM-4216', courseCode: 'CHEM4216' },
  { channelId: '1495879236198727721', label: 'ME-4226', courseCode: 'ME4226' },
  { channelId: '1495093950644752424', label: 'EEE-4282', courseCode: 'EEE4282' },
]

// Authorized CRs and admins who post announcements
const AUTHORIZED_USER_IDS = new Set([
  '1398712871885733940', // CR Mahi
  '434343988804321290',
  '752723739619229705',
  '755438715492630648',
])

interface BackfillStats {
  channelsProcessed: number
  messagesScanned: number
  announcementsCreated: number
  skipped: number
  errors: number
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHtmlBody(body: string, driveLinks: string[], sourceUrl: string): string {
  let html = `<p>${escapeHtml(body).replace(/\n/g, '<br>')}</p>`

  if (driveLinks.length > 0) {
    html += `<p><strong>Attached links:</strong></p><ul>`
    for (const link of driveLinks) {
      html += `<li><a href="${link}" target="_blank">${link.length > 80 ? link.slice(0, 80) + '...' : link}</a></li>`
    }
    html += `</ul>`
  }

  html += `<p><small>Source: <a href="${sourceUrl}" target="_blank">Discord message</a></small></p>`
  return html
}

function detectCourseCodeFromText(input: string): string | null {
  const match = input.toUpperCase().match(/\b([A-Z]{2,6})\s*-?\s*(\d{4})\b/)
  if (!match) return null
  return `${match[1]}${match[2]}`
}

async function publishToApi(
  config: ReturnType<typeof getConfig>,
  title: string,
  body: string,
  type: string,
  courseCode?: string
): Promise<boolean> {
  if (DRY_RUN) {
    console.log(`    [DRY RUN] Would publish: "${title}" (${type}) ${courseCode ? `[${courseCode}]` : ''}`)
    return true
  }

  const res = await fetch(`${config.INTERNAL_API_URL}/api/v1/internal/announcements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': config.INTERNAL_API_SECRET,
    },
    body: JSON.stringify({
      title: title.slice(0, 60),
      body,
      type,
      source: 'discord',
      courseCode: courseCode || undefined,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.log(`    ❌ API error ${res.status}: ${text.slice(0, 150)}`)
    return false
  }
  console.log(`    ✅ Published: "${title.slice(0, 50)}" (${type}) ${courseCode ? `[${courseCode}]` : ''}`)
  return true
}

async function processMessage(
  message: Message,
  channelInfo: typeof BACKFILL_CHANNELS[0],
  config: ReturnType<typeof getConfig>
): Promise<'created' | 'skipped' | 'error'> {
  const content = message.content?.trim()
  if (!content || content.length < 10) return 'skipped'

  // Skip bot messages
  if (message.author.bot) return 'skipped'

  // Only process messages from authorized users
  if (!AUTHORIZED_USER_IDS.has(message.author.id)) return 'skipped'

  const messageUrl = `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`
  const driveLinks = extractDriveLinks(content)

  let title: string
  let body: string
  let type: string
  // Channel config courseCode takes priority (same as live bot)
  let courseCode: string | undefined = channelInfo.courseCode || undefined

  // Always use Gemini classification (matches live bot behavior)
  try {
    const attachmentNames = message.attachments.map(a => a.name ?? 'file')
    const classification = await classifyMessage(content, attachmentNames)
    title = classification.title
    body = buildHtmlBody(classification.body, driveLinks, messageUrl)

    // Use channel's defaultType if configured (e.g. schedule-updates → routine_update)
    // Otherwise use what Gemini classified
    type = channelInfo.defaultType || classification.type

    // If channel has no courseCode, use AI-detected one
    if (!courseCode && classification.detectedCourseCode) {
      courseCode = classification.detectedCourseCode
    }
  } catch (err) {
    // Fallback on classification failure
    const lines = content.split('\n')
    title = lines[0].slice(0, 60)
    body = buildHtmlBody(content, driveLinks, messageUrl)
    type = channelInfo.defaultType || 'general'
  }

  // Channel-name based course code fallback (same as live bot)
  if (!courseCode) {
    courseCode = detectCourseCodeFromText(channelInfo.label) || detectCourseCodeFromText(content) || undefined
  }

  // Auto-promote 'general' to 'course_update' if course code is present (same as live bot)
  if (type === 'general' && courseCode) {
    type = 'course_update'
  }

  try {
    const success = await publishToApi(config, title, body, type, courseCode)
    return success ? 'created' : 'error'
  } catch (err) {
    console.log(`    ❌ Publish error: ${String(err).slice(0, 100)}`)
    return 'error'
  }
}

async function backfillAnnouncements() {
  const config = getConfig()
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  })

  console.log('═══════════════════════════════════════════════════════')
  console.log('  📢 Discord → Announcements Backfill Script')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`  Mode:         ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '🔥 LIVE (writing to DB)'}`)
  console.log(`  Classification: 🤖 Gemini AI (matches live bot behavior)`)
  console.log(`  Max messages: ${MAX_MESSAGES} per channel`)
  console.log(`  Channels:     ${BACKFILL_CHANNELS.length}`)
  console.log(`  API URL:      ${config.INTERNAL_API_URL}`)
  console.log('═══════════════════════════════════════════════════════\n')

  console.log('🔄 Logging into Discord...')
  await client.login(config.DISCORD_BOT_TOKEN)
  console.log(`✅ Logged in as ${client.user?.tag}\n`)

  const stats: BackfillStats = {
    channelsProcessed: 0,
    messagesScanned: 0,
    announcementsCreated: 0,
    skipped: 0,
    errors: 0,
  }

  for (const channelInfo of BACKFILL_CHANNELS) {
    console.log(`\n📂 #${channelInfo.label} (${channelInfo.channelId})`)
    console.log(`   Course: ${channelInfo.courseCode || 'none'}`)

    let channel: TextChannel
    try {
      const fetched = await client.channels.fetch(channelInfo.channelId)
      if (!fetched?.isTextBased()) {
        console.log(`   ⚠️ Channel not found or not text-based, skipping`)
        continue
      }
      channel = fetched as TextChannel
    } catch (err) {
      console.log(`   ❌ Failed to fetch channel: ${err}`)
      stats.errors++
      continue
    }

    // Collect all messages first (oldest first for chronological publishing)
    const allMessages: Message[] = []
    let lastMessageId: string | undefined
    let scanned = 0

    while (scanned < MAX_MESSAGES) {
      const options: { limit: number; before?: string } = { limit: 100 }
      if (lastMessageId) options.before = lastMessageId

      const batch = await channel.messages.fetch(options)
      if (batch.size === 0) break

      for (const [, msg] of batch) {
        allMessages.push(msg)
        scanned++
      }

      lastMessageId = batch.last()?.id
      if (batch.size < 100) break
    }

    // Reverse to process oldest first (chronological order)
    allMessages.reverse()

    console.log(`   Fetched ${allMessages.length} messages, processing...`)

    let channelCreated = 0
    let channelSkipped = 0

    for (const message of allMessages) {
      stats.messagesScanned++
      const result = await processMessage(message, channelInfo, config)

      if (result === 'created') {
        channelCreated++
        stats.announcementsCreated++
      } else if (result === 'skipped') {
        channelSkipped++
        stats.skipped++
      } else {
        stats.errors++
      }

      // Rate limiting: 1.5s between calls (Gemini + API)
      if (result !== 'skipped') {
        await new Promise(r => setTimeout(r, 1500))
      }
    }

    console.log(`   ✅ Created: ${channelCreated} | Skipped: ${channelSkipped}`)
    stats.channelsProcessed++
  }

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('  🏁 Backfill Complete!')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`  Channels processed:     ${stats.channelsProcessed}`)
  console.log(`  Messages scanned:       ${stats.messagesScanned}`)
  console.log(`  Announcements created:  ${stats.announcementsCreated}`)
  console.log(`  Skipped (short/unauth): ${stats.skipped}`)
  console.log(`  Errors:                 ${stats.errors}`)
  console.log('═══════════════════════════════════════════════════════')

  client.destroy()
  process.exit(0)
}

backfillAnnouncements().catch((err) => {
  console.error('💥 Fatal error:', err)
  process.exit(1)
})
