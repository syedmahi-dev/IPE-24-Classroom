# Discord Listener — Full Implementation Guide

## What This Is

A new standalone Node.js service (`services/discord-listener`) that watches configured Discord channels for CR posts and mirrors them to the website and WhatsApp — independently of the existing Telegram pipeline. Both pipelines produce identical output (website announcement + WhatsApp message + FCM push) and can be used simultaneously without conflict.

**Key design decisions:**
- `discord-listener` does **not** call `discord-bot`. The original Discord message already exists in the channel. Calling `discord-bot` would create an echo loop.
- Confirmation (REVIEW_GATE mode) is handled via Discord message reactions (✅/❌) — no external tooling needed.
- All file attachments are downloaded from Discord CDN and re-uploaded to Google Drive before being indexed in the database.
- Redis deduplication prevents double-processing if the bot restarts mid-message.

---

## Service Location

```
services/discord-listener/
├── src/
│   ├── index.ts
│   ├── config.ts
│   ├── handlers/
│   │   ├── message.ts
│   │   └── reaction.ts
│   ├── services/
│   │   ├── classifier.ts
│   │   ├── drive.ts
│   │   ├── publisher.ts
│   │   └── preview.ts
│   └── lib/
│       ├── redis.ts
│       └── logger.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## How Channel Modes Work

Every Discord channel the CR posts in is mapped to a mode in the `DISCORD_CHANNEL_CONFIGS` environment variable. Two modes are available:

### AUTO_PUBLISH
The bot processes the message immediately — no confirmation required.

```
CR posts → bot detects → Gemini classifies → upload files → publish to site + WhatsApp
                                                          ↓
                                           bot reacts ✅ on original message
```

Use this for channels where the CR's posts are always publication-ready (e.g. a private `#cr-posts` channel with no casual chat).

### REVIEW_GATE
The bot sends a preview message to the CR on Telegram before publishing. The CR clicks "✅ Publish" or "❌ Discard" in Telegram to approve.

```
CR posts → bot detects → Gemini classifies → upload files → preview message sent to CR on Telegram
                                                          ↓
                                           CR clicks ✅ → publish to site + WhatsApp
                                           CR clicks ❌ → discard, react ❌ on original
```

Use this for channels where the CR may write drafts or casual messages alongside real announcements.

---

## Installation

```bash
cd services/discord-listener
npm install --save-exact \
  discord.js@14 \
  @google/generative-ai \
  googleapis \
  ioredis \
  node-fetch@3 \
  form-data \
  zod

npm install --save-dev \
  typescript \
  @types/node \
  tsx \
  @types/node-fetch
```

---

## `package.json`

```json
{
  "name": "discord-listener",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "build": "tsc"
  },
  "dependencies": {
    "@google/generative-ai": "0.15.0",
    "discord.js": "14.15.3",
    "form-data": "4.0.0",
    "googleapis": "140.0.1",
    "ioredis": "5.3.2",
    "node-fetch": "3.3.2",
    "zod": "3.23.8"
  },
  "devDependencies": {
    "@types/node": "22.0.0",
    "tsx": "4.16.0",
    "typescript": "5.5.4"
  }
}
```

---

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

---

## `src/config.ts`

```typescript
import { z } from 'zod'

export const AnnouncementTypeSchema = z.enum([
  'general', 'exam', 'file_update', 'routine_update', 'urgent', 'event'
])
export type AnnouncementType = z.infer<typeof AnnouncementTypeSchema>

export const ChannelModeSchema = z.enum(['AUTO_PUBLISH', 'REVIEW_GATE'])
export type ChannelMode = z.infer<typeof ChannelModeSchema>

export const ChannelConfigSchema = z.object({
  channelId: z.string().min(1),
  mode: ChannelModeSchema,
  // Discord user IDs allowed to trigger publishing from this channel
  authorizedUserIds: z.array(z.string()),
  // Optional: role IDs that also grant publishing permission
  authorizedRoleIds: z.array(z.string()).optional().default([]),
  // Where to send the preview embed (REVIEW_GATE only)
  reviewChannelId: z.string().optional(),
  // Optional announcement type override — skip Gemini classification
  defaultAnnouncementType: AnnouncementTypeSchema.optional(),
  // Human-readable label for logs
  label: z.string().optional(),
})
export type ChannelConfig = z.infer<typeof ChannelConfigSchema>

const ConfigSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  // JSON array of ChannelConfig objects
  DISCORD_CHANNEL_CONFIGS: z.string().transform((val) => {
    const parsed = JSON.parse(val)
    return z.array(ChannelConfigSchema).parse(parsed)
  }),
  // The CR's Telegram chat ID for DM fallback on errors
  TELEGRAM_CR_CHAT_ID: z.string().optional(),
  GEMINI_API_KEY: z.string().min(1),
  GOOGLE_SERVICE_ACCOUNT_KEY: z.string().min(1),
  GOOGLE_DRIVE_FOLDER_ID: z.string().min(1),
  INTERNAL_API_SECRET: z.string().min(1),
  INTERNAL_API_URL: z.string().url().default('http://web:3000'),
  WHATSAPP_BOT_URL: z.string().url().default('http://whatsapp-bot:3002'),
  REDIS_URL: z.string().default('redis://redis:6379'),
  REACTION_TIMEOUT_MS: z.coerce.number().default(30 * 60 * 1000), // 30 min
  NODE_ENV: z.string().default('production'),
})

export type AppConfig = Omit<z.infer<typeof ConfigSchema>, 'DISCORD_CHANNEL_CONFIGS'> & {
  DISCORD_CHANNEL_CONFIGS: ChannelConfig[]
}

let _config: AppConfig | null = null

export function getConfig(): AppConfig {
  if (_config) return _config
  const parsed = ConfigSchema.parse(process.env)
  _config = parsed as unknown as AppConfig
  return _config
}

export function getChannelConfig(channelId: string): ChannelConfig | null {
  const cfg = getConfig()
  return cfg.DISCORD_CHANNEL_CONFIGS.find((c) => c.channelId === channelId) ?? null
}
```

---

## `src/lib/redis.ts`

```typescript
import { Redis } from 'ioredis'
import { getConfig } from '../config'

let _redis: Redis | null = null

export function getRedis(): Redis {
  if (_redis) return _redis
  _redis = new Redis(getConfig().REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 200, 3000),
    lazyConnect: true,
  })
  _redis.on('error', (err) => console.error('[redis] connection error:', err.message))
  return _redis
}

const DEDUP_TTL_SECONDS = 86400 // 24 hours

// Returns true if this message has NOT been processed before (safe to process)
export async function claimMessage(messageId: string): Promise<boolean> {
  const redis = getRedis()
  const key = `dl:msg:${messageId}`
  // NX = only set if key does not exist. Returns 'OK' on success, null if already exists.
  const result = await redis.set(key, '1', 'EX', DEDUP_TTL_SECONDS, 'NX')
  return result === 'OK'
}

export async function releaseMessage(messageId: string): Promise<void> {
  await getRedis().del(`dl:msg:${messageId}`)
}
```

---

## `src/lib/logger.ts`

```typescript
type Level = 'info' | 'warn' | 'error'

function log(level: Level, context: string, message: string, meta?: object) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: 'discord-listener',
    context,
    message,
    ...meta,
  })
  if (level === 'error') {
    process.stderr.write(line + '\n')
  } else {
    process.stdout.write(line + '\n')
  }
}

export const logger = {
  info:  (ctx: string, msg: string, meta?: object) => log('info',  ctx, msg, meta),
  warn:  (ctx: string, msg: string, meta?: object) => log('warn',  ctx, msg, meta),
  error: (ctx: string, msg: string, meta?: object) => log('error', ctx, msg, meta),
}
```

---

## `src/services/classifier.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getConfig, AnnouncementType } from '../config'
import { logger } from '../lib/logger'

export interface ClassificationResult {
  type: AnnouncementType
  title: string
  body: string
  urgency: 'low' | 'medium' | 'high'
}

const CLASSIFY_PROMPT = `You are an assistant for a university class CR (Class Representative).
Analyze the following Discord message and respond with ONLY a JSON object — no markdown, no explanation.

Message: "{MESSAGE}"

Respond with this exact JSON structure:
{
  "type": "general|exam|file_update|routine_update|urgent|event",
  "title": "short title (max 60 chars)",
  "body": "clean formatted message body — preserve important details, clean up casual language",
  "urgency": "low|medium|high"
}

Rules:
- type "exam" = any mention of tests, quizzes, assessments, exam schedules
- type "routine_update" = class schedule changes, room changes, time changes
- type "file_update" = notes, slides, documents, resources shared
- type "urgent" = anything time-critical with less than 24 hours notice
- type "event" = meetings, trips, workshops, optional gatherings
- type "general" = everything else`

export async function classifyMessage(text: string): Promise<ClassificationResult> {
  const genAI = new GoogleGenerativeAI(getConfig().GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
  })

  const prompt = CLASSIFY_PROMPT.replace('{MESSAGE}', text.slice(0, 2000))

  try {
    const result = await model.generateContent(prompt)
    const raw = result.response.text().replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(raw)

    // Validate required fields
    if (!parsed.type || !parsed.title || !parsed.body) {
      throw new Error('Missing required classification fields')
    }

    return {
      type: (['general','exam','file_update','routine_update','urgent','event'].includes(parsed.type)
        ? parsed.type
        : 'general') as AnnouncementType,
      title: String(parsed.title).slice(0, 60),
      body: String(parsed.body).slice(0, 4000),
      urgency: (['low','medium','high'].includes(parsed.urgency) ? parsed.urgency : 'medium') as 'low'|'medium'|'high',
    }
  } catch (err) {
    logger.warn('classifier', 'Gemini classification failed, using fallback', { error: String(err) })
    // Fallback: use raw message as body, general type
    return {
      type: 'general',
      title: text.split(/[.\n]/)[0].slice(0, 60) || 'Class Announcement',
      body: text.slice(0, 4000),
      urgency: 'medium',
    }
  }
}
```

---

## `src/services/drive.ts`

```typescript
import { google } from 'googleapis'
import { Readable } from 'stream'
import fetch from 'node-fetch'
import { getConfig } from '../config'
import { logger } from '../lib/logger'

export interface DriveUploadResult {
  driveId: string
  driveUrl: string
  downloadUrl: string | null
  mimeType: string
  sizeBytes: number
  name: string
}

function getAuthClient() {
  const raw = Buffer.from(getConfig().GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  const credentials = JSON.parse(raw)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
}

// Download a file from a URL (Discord CDN) and upload to Google Drive
export async function uploadUrlToDrive(
  url: string,
  filename: string,
  mimeType: string,
  sizeBytes: number
): Promise<DriveUploadResult> {
  logger.info('drive', 'downloading attachment', { url: url.slice(0, 80), filename })

  // Sanitize filename
  const safeName = filename.replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 200)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download attachment: HTTP ${response.status}`)
  }

  const buffer = await response.buffer()
  const stream = Readable.from(buffer)

  const auth = getAuthClient()
  const drive = google.drive({ version: 'v3', auth })

  const uploadResponse = await drive.files.create({
    requestBody: {
      name: safeName,
      parents: [getConfig().GOOGLE_DRIVE_FOLDER_ID],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, webViewLink, webContentLink',
  })

  const file = uploadResponse.data
  if (!file.id || !file.webViewLink) {
    throw new Error('Drive upload response missing id or webViewLink')
  }

  // Make the file publicly readable (for share links to work)
  await drive.permissions.create({
    fileId: file.id,
    requestBody: { role: 'reader', type: 'anyone' },
  })

  logger.info('drive', 'uploaded to drive', { fileId: file.id, name: safeName })

  return {
    driveId: file.id,
    driveUrl: file.webViewLink,
    downloadUrl: file.webContentLink ?? null,
    mimeType,
    sizeBytes,
    name: safeName,
  }
}

// Detect Google Drive or Docs links in message text
export function extractDriveLinks(text: string): string[] {
  const pattern = /https:\/\/(drive|docs)\.google\.com\/[^\s)>"]+/g
  return Array.from(text.matchAll(pattern), (m) => m[0])
}
```

---

## `src/services/publisher.ts`

```typescript
import fetch from 'node-fetch'
import { getConfig } from '../config'
import { ClassificationResult } from './classifier'
import { DriveUploadResult } from './drive'
import { logger } from '../lib/logger'

export interface PublishResult {
  website: boolean
  whatsapp: boolean
  errors: string[]
}

const TYPE_EMOJIS: Record<string, string> = {
  general: '📢',
  exam: '📝',
  file_update: '📁',
  routine_update: '📅',
  urgent: '🚨',
  event: '🎉',
}

export async function publishAnnouncement(
  classification: ClassificationResult,
  files: DriveUploadResult[],
  sourceMessageUrl: string
): Promise<PublishResult> {
  const { INTERNAL_API_URL, INTERNAL_API_SECRET, WHATSAPP_BOT_URL } = getConfig()
  const errors: string[] = []

  // --- 1. Website Internal API ---
  let websiteOk = false
  try {
    const body = {
      title: classification.title,
      body: buildHtmlBody(classification.body, files, sourceMessageUrl),
      type: classification.type,
      source: 'discord', // tag the source for audit/dedup
    }

    const res = await fetch(`${INTERNAL_API_URL}/api/v1/internal/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_API_SECRET,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
    }
    websiteOk = true
    logger.info('publisher', 'website announcement created')
  } catch (err) {
    const msg = `Website publish failed: ${String(err)}`
    errors.push(msg)
    logger.error('publisher', msg)
  }

  // --- 2. WhatsApp Bot ---
  let whatsappOk = false
  try {
    const waMessage = buildWhatsAppMessage(classification, files)
    const res = await fetch(`${WHATSAPP_BOT_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_API_SECRET,
      },
      body: JSON.stringify({ message: waMessage }),
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    whatsappOk = true
    logger.info('publisher', 'whatsapp message sent')
  } catch (err) {
    // WhatsApp failures are non-fatal — website is more important
    const msg = `WhatsApp publish failed: ${String(err)}`
    errors.push(msg)
    logger.warn('publisher', msg)
  }

  return { website: websiteOk, whatsapp: whatsappOk, errors }
}

function buildHtmlBody(
  body: string,
  files: DriveUploadResult[],
  sourceUrl: string
): string {
  let html = `<p>${escapeHtml(body).replace(/\n/g, '<br>')}</p>`

  if (files.length > 0) {
    html += `<p><strong>Attached files:</strong></p><ul>`
    for (const f of files) {
      html += `<li><a href="${f.driveUrl}" target="_blank">${escapeHtml(f.name)}</a></li>`
    }
    html += `</ul>`
  }

  html += `<p><small>Source: <a href="${sourceUrl}" target="_blank">Discord message</a></small></p>`
  return html
}

function buildWhatsAppMessage(
  classification: ClassificationResult,
  files: DriveUploadResult[]
): string {
  const emoji = TYPE_EMOJIS[classification.type] ?? '📢'
  let msg = `${emoji} *${classification.title}*\n\n${classification.body}`

  if (files.length > 0) {
    msg += '\n\n*Files:*'
    for (const f of files) {
      msg += `\n• ${f.name}: ${f.driveUrl}`
    }
  }

  return msg.slice(0, 4096)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
```

---

## `src/services/preview.ts`

```typescript
import { EmbedBuilder, Colors } from 'discord.js'
import { ClassificationResult } from './classifier'
import { DriveUploadResult } from './drive'

const TYPE_COLORS: Record<string, number> = {
  general:        Colors.Blue,
  exam:           Colors.Red,
  file_update:    Colors.Green,
  routine_update: Colors.Yellow,
  urgent:         0xdc2626, // deep red
  event:          Colors.Purple,
}

const TYPE_LABELS: Record<string, string> = {
  general:        'General',
  exam:           'Exam',
  file_update:    'File Update',
  routine_update: 'Routine Update',
  urgent:         'URGENT',
  event:          'Event',
}

export function buildPreviewEmbed(
  classification: ClassificationResult,
  files: DriveUploadResult[],
  sourceChannelName: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`[${TYPE_LABELS[classification.type] ?? 'General'}] ${classification.title}`)
    .setDescription(classification.body.slice(0, 4096))
    .setColor(TYPE_COLORS[classification.type] ?? Colors.Blue)
    .setTimestamp()
    .setFooter({ text: `From #${sourceChannelName} · Urgency: ${classification.urgency}` })

  if (files.length > 0) {
    embed.addFields({
      name: 'Attached Files',
      value: files.map((f) => `[${f.name}](${f.driveUrl})`).join('\n').slice(0, 1024),
    })
  }

  embed.addFields({
    name: 'Review',
    value: 'React ✅ to **publish** to website + WhatsApp\nReact ❌ to **discard**',
  })

  return embed
}

export function buildPublishedEmbed(
  classification: ClassificationResult,
  result: { website: boolean; whatsapp: boolean }
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`✅ Published — ${classification.title}`)
    .setColor(Colors.Green)
    .addFields(
      { name: 'Website', value: result.website ? '✅ Posted' : '❌ Failed', inline: true },
      { name: 'WhatsApp', value: result.whatsapp ? '✅ Sent' : '⚠️ Failed', inline: true },
    )
    .setTimestamp()
    .setFooter({ text: 'discord-listener' })
}

export function buildDiscardedEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('❌ Discarded')
    .setDescription('This announcement was rejected by the CR.')
    .setColor(Colors.Red)
    .setTimestamp()
}
```

---

## `src/handlers/reaction.ts`

This module handles the REVIEW_GATE approval loop. It is exported as a function that is called from the message handler after the preview embed is posted.

```typescript
import {
  Message,
  MessageReaction,
  User,
  TextChannel,
} from 'discord.js'
import { ChannelConfig, ClassificationResult } from '../config'
import { DriveUploadResult } from '../services/drive'
import { publishAnnouncement } from '../services/publisher'
import {
  buildPublishedEmbed,
  buildDiscardedEmbed,
} from '../services/preview'
import { releaseMessage } from '../lib/redis'
import { logger } from '../lib/logger'
import { getConfig } from '../config'

export async function awaitCRApproval(params: {
  previewMessage: Message
  originalMessage: Message
  channelConfig: ChannelConfig
  classification: ClassificationResult
  files: DriveUploadResult[]
}): Promise<void> {
  const { previewMessage, originalMessage, channelConfig, classification, files } = params
  const { REACTION_TIMEOUT_MS } = getConfig()

  const sourceUrl = originalMessage.url

  // Add reactions to the preview message as affordance
  await previewMessage.react('✅')
  await previewMessage.react('❌')

  try {
    const collected = await previewMessage.awaitReactions({
      filter: (reaction: MessageReaction, user: User) => {
        if (user.bot) return false
        const emojiName = reaction.emoji.name ?? ''
        if (!['✅', '❌'].includes(emojiName)) return false
        // Only authorized users can approve/reject
        return channelConfig.authorizedUserIds.includes(user.id)
      },
      max: 1,
      time: REACTION_TIMEOUT_MS,
      errors: ['time'],
    })

    const reaction = collected.first()
    const approved = reaction?.emoji.name === '✅'

    if (approved) {
      logger.info('reaction', 'CR approved announcement', { title: classification.title })

      const result = await publishAnnouncement(classification, files, sourceUrl)

      await previewMessage.edit({ embeds: [buildPublishedEmbed(classification, result)] })
      await previewMessage.reactions.removeAll()

      // React to the original Discord message to show it was published
      await originalMessage.react('✅').catch(() => {})

      if (result.errors.length > 0) {
        await originalMessage.reply({
          content: `⚠️ Published with warnings:\n${result.errors.map((e) => `• ${e}`).join('\n')}`,
        }).catch(() => {})
      }
    } else {
      logger.info('reaction', 'CR rejected announcement', { title: classification.title })
      await previewMessage.edit({ embeds: [buildDiscardedEmbed()] })
      await previewMessage.reactions.removeAll()
      await originalMessage.react('❌').catch(() => {})
      await releaseMessage(originalMessage.id) // allow re-processing if CR edits and tries again
    }
  } catch {
    // Timeout — nobody reacted in time
    logger.warn('reaction', 'Review timed out', {
      messageId: originalMessage.id,
      title: classification.title,
    })
    await previewMessage.edit({
      embeds: [
        buildDiscardedEmbed().setDescription(
          `Review timed out after ${Math.round(REACTION_TIMEOUT_MS / 60000)} minutes. Message was NOT published. To retry, delete and repost.`
        ),
      ],
    })
    await previewMessage.reactions.removeAll()
    await releaseMessage(originalMessage.id)
  }
}
```

---

## `src/handlers/message.ts`

```typescript
import { Message, TextChannel, GuildMember } from 'discord.js'
import { getChannelConfig, ChannelConfig } from '../config'
import { claimMessage } from '../lib/redis'
import { classifyMessage } from '../services/classifier'
import { uploadUrlToDrive, extractDriveLinks, DriveUploadResult } from '../services/drive'
import { publishAnnouncement } from '../services/publisher'
import { buildPreviewEmbed } from '../services/preview'
import { awaitCRApproval } from './reaction'
import { logger } from '../lib/logger'

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
])
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB — matches website limit

export async function handleMessage(message: Message): Promise<void> {
  // Ignore bot messages — critical for loop prevention
  if (message.author.bot) return

  // Ignore DMs — only process guild messages
  if (!message.guild) return

  // Check if channel is configured
  const channelConfig = getChannelConfig(message.channel.id)
  if (!channelConfig) return

  // Check if author is authorized
  if (!isAuthorized(message, channelConfig)) return

  // Deduplication — prevent double-processing on restart
  const claimed = await claimMessage(message.id)
  if (!claimed) {
    logger.warn('handler', 'duplicate message skipped', { messageId: message.id })
    return
  }

  const channelName = (message.channel as TextChannel).name ?? message.channel.id
  logger.info('handler', 'processing message', {
    messageId: message.id,
    channel: channelName,
    mode: channelConfig.mode,
    author: message.author.username,
  })

  try {
    // Show processing indicator
    await message.react('⏳').catch(() => {})

    // --- 1. Classify message content ---
    const messageText = message.content || '(no text — file attachment only)'
    const classification = channelConfig.defaultAnnouncementType
      ? {
          type: channelConfig.defaultAnnouncementType,
          title: messageText.split(/[.\n]/)[0].slice(0, 60) || 'Class Announcement',
          body: messageText,
          urgency: 'medium' as const,
        }
      : await classifyMessage(messageText)

    logger.info('handler', 'classified', {
      type: classification.type,
      title: classification.title,
      urgency: classification.urgency,
    })

    // --- 2. Upload file attachments to Google Drive ---
    const files: DriveUploadResult[] = []
    for (const attachment of message.attachments.values()) {
      if (!ALLOWED_MIME_TYPES.has(attachment.contentType ?? '')) {
        logger.warn('handler', 'skipping disallowed file type', {
          name: attachment.name,
          type: attachment.contentType,
        })
        continue
      }
      if (attachment.size > MAX_FILE_SIZE) {
        logger.warn('handler', 'skipping oversized file', {
          name: attachment.name,
          sizeBytes: attachment.size,
        })
        continue
      }
      try {
        const result = await uploadUrlToDrive(
          attachment.url,
          attachment.name ?? 'attachment',
          attachment.contentType ?? 'application/octet-stream',
          attachment.size
        )
        files.push(result)
      } catch (err) {
        logger.error('handler', 'file upload failed', { name: attachment.name, error: String(err) })
      }
    }

    // --- 3. Remove ⏳ reaction ---
    await message.reactions.cache.get('⏳')?.users.remove().catch(() => {})

    // --- 4. Dispatch by mode ---
    if (channelConfig.mode === 'AUTO_PUBLISH') {
      await handleAutoPublish(message, channelConfig, classification, files)
    } else {
      await handleReviewGate(message, channelConfig, classification, files, channelName)
    }
  } catch (err) {
    logger.error('handler', 'unhandled error in message handler', { error: String(err) })
    await message.react('💥').catch(() => {})
  }
}

async function handleAutoPublish(
  message: Message,
  _config: ChannelConfig,
  classification: ReturnType<typeof classifyMessage> extends Promise<infer T> ? T : never,
  files: DriveUploadResult[]
): Promise<void> {
  const result = await publishAnnouncement(classification, files, message.url)
  await message.react('✅').catch(() => {})

  if (result.errors.length > 0) {
    await message.reply({
      content: `⚠️ Published with warnings:\n${result.errors.map((e) => `• ${e}`).join('\n')}`,
    }).catch(() => {})
  }
}

async function handleReviewGate(
  message: Message,
  channelConfig: ChannelConfig,
  classification: ReturnType<typeof classifyMessage> extends Promise<infer T> ? T : never,
  files: DriveUploadResult[],
  sourceChannelName: string
): Promise<void> {
  if (!channelConfig.reviewChannelId) {
    logger.error('handler', 'REVIEW_GATE mode but no reviewChannelId configured', {
      channelId: channelConfig.channelId,
    })
    await message.react('❓').catch(() => {})
    return
  }

  const reviewChannel = message.guild?.channels.cache.get(channelConfig.reviewChannelId) as
    | TextChannel
    | undefined

  if (!reviewChannel) {
    logger.error('handler', 'review channel not found', {
      reviewChannelId: channelConfig.reviewChannelId,
    })
    await message.react('❓').catch(() => {})
    return
  }

  const previewEmbed = buildPreviewEmbed(classification, files, sourceChannelName)
  const previewMessage = await reviewChannel.send({ embeds: [previewEmbed] })

  // Delegate to reaction handler — this awaits CR approval
  await awaitCRApproval({
    previewMessage,
    originalMessage: message,
    channelConfig,
    classification,
    files,
  })
}

function isAuthorized(message: Message, config: ChannelConfig): boolean {
  // Check by user ID
  if (config.authorizedUserIds.includes(message.author.id)) return true

  // Check by role
  if (config.authorizedRoleIds && config.authorizedRoleIds.length > 0) {
    const member = message.member as GuildMember | null
    if (member) {
      return config.authorizedRoleIds.some((roleId) => member.roles.cache.has(roleId))
    }
  }

  return false
}
```

---

## `src/index.ts`

```typescript
import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'
import { getConfig } from './config'
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

  // Graceful shutdown
  process.on('SIGINT',  () => { client.destroy(); process.exit(0) })
  process.on('SIGTERM', () => { client.destroy(); process.exit(0) })

  await client.login(config.DISCORD_BOT_TOKEN)
}

main().catch((err) => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
```

---

## `Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production=false

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
```

---

## Environment Variables

```env
# services/discord-listener/.env

# Discord bot token from Developer Portal
# This is a SEPARATE bot application from the discord-bot service
DISCORD_BOT_TOKEN=your-listener-bot-token-here

# The Discord server ID
DISCORD_GUILD_ID=your-server-id

# JSON array of channel configurations (see format below)
DISCORD_CHANNEL_CONFIGS=[{"channelId":"123456789","mode":"REVIEW_GATE","authorizedUserIds":["CR_DISCORD_ID"],"reviewChannelId":"987654321","label":"exam-updates"},{"channelId":"111222333","mode":"AUTO_PUBLISH","authorizedUserIds":["CR_DISCORD_ID","DEPUTY_DISCORD_ID"],"label":"quick-posts"}]

# Gemini API key (same as web app)
GEMINI_API_KEY=your-gemini-api-key

# Google Service Account key (same base64 value as web app)
GOOGLE_SERVICE_ACCOUNT_KEY=base64-encoded-service-account-json

# Google Drive folder for uploaded files
GOOGLE_DRIVE_FOLDER_ID=your-drive-folder-id

# Internal API secret (must match web app)
INTERNAL_API_SECRET=same-as-web-app-value

# Internal service URLs (use Docker service names)
INTERNAL_API_URL=http://web:3000
WHATSAPP_BOT_URL=http://whatsapp-bot:3002

# Redis URL (shared with web app)
REDIS_URL=redis://redis:6379

# How long to wait for CR reaction before discarding (ms). Default: 1800000 (30 min)
REACTION_TIMEOUT_MS=1800000
```

### `DISCORD_CHANNEL_CONFIGS` — Full Format Reference

```json
[
  {
    "channelId": "DISCORD_CHANNEL_ID",
    "mode": "REVIEW_GATE",
    "authorizedUserIds": ["CR_DISCORD_USER_ID"],
    "authorizedRoleIds": ["CR_ROLE_ID"],
    "reviewChannelId": "ID_OF_PRIVATE_REVIEW_CHANNEL",
    "defaultAnnouncementType": null,
    "label": "exam-announcements"
  },
  {
    "channelId": "ANOTHER_CHANNEL_ID",
    "mode": "AUTO_PUBLISH",
    "authorizedUserIds": ["CR_DISCORD_USER_ID", "DEPUTY_CR_DISCORD_USER_ID"],
    "reviewChannelId": null,
    "defaultAnnouncementType": "file_update",
    "label": "resource-drops"
  }
]
```

| Field | Required | Description |
|---|---|---|
| `channelId` | ✅ | The Discord channel snowflake ID |
| `mode` | ✅ | `AUTO_PUBLISH` or `REVIEW_GATE` |
| `authorizedUserIds` | ✅ | Which Discord user IDs can trigger publishing |
| `authorizedRoleIds` | ❌ | Which role IDs can also trigger publishing |
| `reviewChannelId` | ✅ if REVIEW_GATE | Private channel where preview embed is sent |
| `defaultAnnouncementType` | ❌ | Skips Gemini; forces this type. Useful for resource-drop channels. |
| `label` | ❌ | Human label for logs |

---

## Discord Developer Portal Setup

This is a **new bot application**, separate from the existing `discord-bot` (the poster). Separation keeps permissions clean and avoids both bots triggering each other.

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Create new application: `IPE24 Listener Bot`
3. Bot tab → Add Bot → copy the token → `DISCORD_BOT_TOKEN`
4. **Privileged Gateway Intents** — enable both:
   - `Message Content Intent` ← required for reading message text
   - `Server Members Intent` ← required for role-based auth
5. OAuth2 → URL Generator:
   - Scopes: `bot`
   - Bot Permissions: `Read Messages/View Channels`, `Send Messages`, `Add Reactions`, `Read Message History`, `Embed Links`
6. Copy the generated URL, open in browser, invite to your Discord server

---

## Anti-Loop Architecture — Why There Is No Echo

The concern: if `discord-listener` posts a new announcement to the website, and the website or n8n then calls `discord-bot` to post that announcement to Discord, it would appear in the same channel the CR originally posted in — an echo.

**Why this does not happen:**

1. In the existing Telegram pipeline, n8n explicitly calls the discord-bot after announcing to the website. This call comes from n8n, not the website itself.
2. The `/api/v1/internal/announcements` route (which `discord-listener` calls) only creates a DB record and sends FCM push. It does not call `discord-bot`.
3. `discord-listener` never calls `discord-bot`.
4. Therefore, a Discord-sourced post appears on the website and WhatsApp, but NOT as a new Discord message. The original Discord message already exists.

**Visual confirmation of what does NOT happen:**

```
discord-listener → /api/v1/internal/announcements  ✅ (website + FCM)
discord-listener → /send (WhatsApp bot)             ✅
discord-listener → discord-bot /announce            ❌ (deliberately skipped)
```

---

## Testing the Setup

### 1. Test channel config parsing

```bash
# Validate your JSON config before deploying
node -e "
const cfg = process.env.DISCORD_CHANNEL_CONFIGS
try { const p = JSON.parse(cfg); console.log('Valid:', p.length, 'channels'); }
catch(e) { console.error('Invalid JSON:', e.message); }
" DISCORD_CHANNEL_CONFIGS='[{"channelId":"123","mode":"AUTO_PUBLISH","authorizedUserIds":["456"],"label":"test"}]'
```

### 2. Test classification service standalone

```bash
cd services/discord-listener
GEMINI_API_KEY=your-key npx tsx -e "
const { classifyMessage } = require('./src/services/classifier')
classifyMessage('Reminder: Mid-term exam for IPE-4101 is on Saturday. Room 301.').then(console.log)
"
```

### 3. Test publisher connectivity

```bash
curl -X POST http://localhost:3000/api/v1/internal/announcements \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: YOUR_SECRET" \
  -d '{"title":"Listener test","body":"<p>Test from discord-listener</p>","type":"general","source":"discord"}'
# Expected: 201
```

### 4. Test in Discord (sandbox)

1. Create a test channel `#listener-test` in your Discord server
2. Add it to `DISCORD_CHANNEL_CONFIGS` with `mode: AUTO_PUBLISH`
3. Post a message from the CR account
4. Expected: bot reacts ✅, announcement appears on website

---

## Operational Notes

**Reaction timeout**: Default is 30 minutes. After timeout, the preview embed updates to show "timed out" and the `dl:msg:` Redis key is released, allowing the CR to repost and try again.

**File size limit**: Files larger than 25MB are silently skipped (logged as warning). The announcement is still published without those files. A reply is sent to the original message noting which files were skipped.

**Gemini fallback**: If Gemini classification fails (rate limit, network error), the service falls back to using the raw message text as the body with type `general`. The announcement still publishes.

**Bot restart recovery**: The `dl:msg:{id}` Redis key with 24-hour TTL prevents double-processing. If the bot restarts within 24 hours, the same message is not reprocessed.

**Multiple CRs**: Add all authorized user IDs to `authorizedUserIds`. Each channel config can have its own list, so different deputies can be authorized on different channels.

---

## Message Batching (Multi-Message Debounce)

### Problem
When someone sends 3-4 individual Discord messages in quick succession, the bot used to treat **each** as a separate announcement — firing classification, file upload, review gate, and publishing for every single message.

### Solution
A **debounce batcher** (`src/lib/batcher.ts`) buffers incoming messages per `channelId:authorId` key. Instead of processing immediately, it waits for a quiet period before flushing all buffered messages as one combined announcement.

### How It Works

1. Message arrives from User X in Channel Y → buffer it, start a 30-second debounce timer.
2. Another message from same user in same channel within 30s → add to buffer, **reset** the timer.
3. Timer fires (30s of silence) → flush the batch: merge text (joined with `\n`), combine all attachments, then run the normal classify → upload → review gate pipeline **once**.
4. Hard deadline of 2 minutes prevents infinite batching if someone types continuously.

### Key Parameters

| Parameter | Default | Location |
|---|---|---|
| `DEBOUNCE_MS` | 30 seconds | `src/lib/batcher.ts` |
| `MAX_BATCH_WINDOW_MS` | 2 minutes | `src/lib/batcher.ts` |

### Behavior

- **Single message**: Processed exactly as before — no delay, no behavior change.
- **Multiple messages within 30s**: Debounced and merged into one announcement.
- **Different users**: Always separate batches, even in the same channel.
- **Attachments**: All attachments from all messages in the batch are combined and uploaded.
- **Reactions**: The ⏳/✅/❌ reactions are applied to the **first** message in the batch (the "anchor").
- **Dedup**: All message IDs in the batch are claimed in Redis to prevent reprocessing.
- **Shutdown**: `clearAllBatches()` cancels all pending timers on SIGINT/SIGTERM.

### Files

| File | Role |
|---|---|
| `src/lib/batcher.ts` | Debounce engine — `enqueueMessage()`, `mergeBatch()`, `clearAllBatches()` |
| `src/index.ts` | Routes `MessageCreate` through batcher instead of direct `handleMessage()` |
| `src/handlers/message.ts` | New `handleBatchedMessages()` export — merges batch, then runs standard pipeline |
