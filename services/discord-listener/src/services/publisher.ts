import fetch from 'node-fetch'
import { getConfig } from '../config'
import { ClassificationResult } from './classifier'
import { DriveUploadResult } from './drive'
import { logger } from '../lib/logger'

export interface PublishResult {
  website: boolean
  telegram: boolean
  filesCreated: number
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
  sourceMessageUrl: string,
  courseCode?: string,
  folderLabel?: string
): Promise<PublishResult> {
  const { INTERNAL_API_URL, INTERNAL_API_SECRET, TELEGRAM_BOT_URL } = getConfig()
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

  // --- 2. Create FileUpload records for each uploaded file ---
  let filesCreated = 0
  if (files.length > 0) {
    // Determine the effective course code: explicit from channel config, or AI-detected
    const effectiveCourseCode = courseCode || classification.detectedCourseCode || undefined

    for (const file of files) {
      try {
        const res = await fetch(`${INTERNAL_API_URL}/api/v1/internal/files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': INTERNAL_API_SECRET,
          },
          body: JSON.stringify({
            name: file.name,
            driveId: file.driveId,
            driveUrl: file.driveUrl,
            downloadUrl: file.downloadUrl,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            category: classification.fileCategory,
            courseCode: effectiveCourseCode,
            folderLabel: folderLabel,
            source: 'discord',
          }),
        })

        if (!res.ok) {
          const text = await res.text()
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
        }
        filesCreated++
        logger.info('publisher', 'file record created', { name: file.name, courseCode: effectiveCourseCode })
      } catch (err) {
        const msg = `File record creation failed for ${file.name}: ${String(err)}`
        errors.push(msg)
        logger.warn('publisher', msg)
      }
    }
  }

  // --- 3. Telegram Bot (forward message to class group) ---
  let telegramOk = false
  const telegramUrl = TELEGRAM_BOT_URL
  if (!telegramUrl || telegramUrl === 'disabled') {
    logger.info('publisher', 'telegram disabled — skipping')
  } else {
    try {
      const tgMessage = buildTelegramMessage(classification, files)
      const res = await fetch(`${telegramUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': INTERNAL_API_SECRET,
        },
        body: JSON.stringify({ message: tgMessage }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      telegramOk = true
      logger.info('publisher', 'telegram message sent')
    } catch (err) {
      // Telegram failures are non-fatal — website is more important
      const msg = `Telegram publish failed: ${String(err)}`
      errors.push(msg)
      logger.warn('publisher', msg)
    }
  }

  return { website: websiteOk, telegram: telegramOk, filesCreated, errors }
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

function buildTelegramMessage(
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
