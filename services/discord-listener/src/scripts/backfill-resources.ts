/**
 * One-time backfill script — scans Discord channel history
 * and creates FileUpload records for previously shared Drive links.
 *
 * Usage (inside the Docker container):
 *   npx ts-node src/scripts/backfill-resources.ts
 *
 * Or from the host after building:
 *   node dist/scripts/backfill-resources.js
 */

import { Client, GatewayIntentBits, TextChannel } from 'discord.js'
import { getConfig } from '../config'
import { extractDriveLinks, getDriveFileMetadata } from '../services/drive'
import { classifyMessage } from '../services/classifier'
import { logger } from '../lib/logger'
import fetch from 'node-fetch'

// Channels to backfill — add more channel IDs if needed
const BACKFILL_CHANNELS = [
  { channelId: '1450539338311008318', label: 'resources', courseCode: undefined },
  // Uncomment to also backfill course channels:
  // { channelId: '1495879542018015503', label: 'ipe4208-info', courseCode: 'IPE4208' },
  // { channelId: '1495877858617458748', label: 'phy4214-info', courseCode: 'PHY4214' },
  // { channelId: '1495879439580397771', label: 'me4226-info', courseCode: 'ME4226' },
  // { channelId: '1495879236198727721', label: 'eee4282-info', courseCode: 'EEE4282' },
]

const AUTHORIZED_USER_ID = '1398712871885733940'
// Max messages to scan per channel (Discord allows 100 per fetch, we paginate)
const MAX_MESSAGES = 500

async function backfill() {
  const config = getConfig()
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  })

  console.log('🔄 Logging into Discord...')
  await client.login(config.DISCORD_BOT_TOKEN)
  console.log(`✅ Logged in as ${client.user?.tag}`)

  let totalFilesCreated = 0
  let totalMessagesScanned = 0
  let totalErrors = 0

  for (const channelInfo of BACKFILL_CHANNELS) {
    console.log(`\n📂 Scanning #${channelInfo.label} (${channelInfo.channelId})...`)

    let channel: TextChannel
    try {
      const fetched = await client.channels.fetch(channelInfo.channelId)
      if (!fetched?.isTextBased()) {
        console.log(`  ⚠️ Channel not found or not text-based, skipping`)
        continue
      }
      channel = fetched as TextChannel
    } catch (err) {
      console.log(`  ❌ Failed to fetch channel: ${err}`)
      continue
    }

    // Paginate through message history
    let lastMessageId: string | undefined
    let channelMessagesScanned = 0
    let channelFilesCreated = 0

    while (channelMessagesScanned < MAX_MESSAGES) {
      const options: { limit: number; before?: string } = { limit: 100 }
      if (lastMessageId) options.before = lastMessageId

      const messages = await channel.messages.fetch(options)
      if (messages.size === 0) break

      for (const [, message] of messages) {
        channelMessagesScanned++
        totalMessagesScanned++

        // Only process messages from authorized users
        if (message.author.id !== AUTHORIZED_USER_ID) continue
        if (message.author.bot) continue

        // Extract Drive links from message text
        const driveLinks = extractDriveLinks(message.content || '')
        if (driveLinks.length === 0) continue

        console.log(`  📝 Message ${message.id} (${new Date(message.createdTimestamp).toLocaleDateString()}) — ${driveLinks.length} Drive link(s)`)

        // Classify the message to get fileCategory and courseCode
        let fileCategory = 'other'
        let detectedCourseCode = channelInfo.courseCode || null

        try {
          const classification = await classifyMessage(message.content || '', driveLinks.map(() => 'shared_file'))
          fileCategory = classification.fileCategory
          if (!detectedCourseCode && classification.detectedCourseCode) {
            detectedCourseCode = classification.detectedCourseCode
          }
        } catch {
          console.log(`    ⚠️ Classification failed, using defaults`)
        }

        // Process each Drive link
        for (const link of driveLinks) {
          try {
            const metadata = await getDriveFileMetadata(link)
            if (!metadata) {
              console.log(`    ⚠️ Could not fetch metadata for: ${link.slice(0, 60)}`)
              continue
            }

            // Create FileUpload record via internal API
            const res = await fetch(`${config.INTERNAL_API_URL}/api/v1/internal/files`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-internal-secret': config.INTERNAL_API_SECRET,
              },
              body: JSON.stringify({
                name: metadata.name,
                driveId: metadata.driveId,
                driveUrl: metadata.driveUrl,
                downloadUrl: metadata.downloadUrl,
                mimeType: metadata.mimeType,
                sizeBytes: metadata.sizeBytes,
                category: fileCategory,
                courseCode: detectedCourseCode,
                folderLabel: channelInfo.label,
                source: 'discord',
              }),
            })

            if (res.ok) {
              const data = await res.json() as any
              const isNew = data?.data?.id ? true : false
              console.log(`    ✅ ${isNew ? 'Created' : 'Already exists'}: ${metadata.name}`)
              channelFilesCreated++
              totalFilesCreated++
            } else {
              const text = await res.text()
              console.log(`    ❌ API error: ${res.status} — ${text.slice(0, 100)}`)
              totalErrors++
            }
          } catch (err) {
            console.log(`    ❌ Error: ${String(err).slice(0, 100)}`)
            totalErrors++
          }
        }

        // Small delay to avoid rate limits
        await new Promise((r) => setTimeout(r, 1000))
      }

      lastMessageId = messages.last()?.id
      if (messages.size < 100) break // No more messages
    }

    console.log(`  📊 #${channelInfo.label}: scanned ${channelMessagesScanned} messages, created ${channelFilesCreated} file records`)
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`🏁 Backfill complete!`)
  console.log(`   Messages scanned: ${totalMessagesScanned}`)
  console.log(`   Files created:    ${totalFilesCreated}`)
  console.log(`   Errors:           ${totalErrors}`)
  console.log(`${'='.repeat(50)}`)

  client.destroy()
  process.exit(0)
}

backfill().catch((err) => {
  console.error('💥 Fatal backfill error:', err)
  process.exit(1)
})
