
import { getConfig } from '../config'
import { ClassificationResult, RoutineOverrideExtract } from './classifier'
import { DriveUploadResult } from './drive'
import { logger } from '../lib/logger'
import { requestInternalApi } from '../lib/internal-api'

export interface PublishResult {
  website: boolean
  filesCreated: number
  overridesCreated: number
  errors: string[]
}

const TYPE_EMOJIS: Record<string, string> = {
  general: '📢',
  exam: '📝',
  file_update: '📁',
  routine_update: '📅',
  urgent: '🚨',
  event: '🎉',
  course_update: '📚',
}

export async function publishAnnouncement(
  classification: ClassificationResult,
  files: DriveUploadResult[],
  sourceMessageUrl: string,
  courseCode?: string,
  folderLabel?: string
): Promise<PublishResult> {
  const { INTERNAL_API_URL, INTERNAL_API_SECRET } = getConfig()
  const errors: string[] = []

  // --- 1. Website Internal API ---
  let websiteOk = false
  try {
    const body = {
      title: classification.title,
      body: buildHtmlBody(classification.body, files, sourceMessageUrl),
      type: classification.type,
      source: 'discord', // tag the source for audit/dedup
      courseCode, // Pass the course code for categorization
    }

    const res = await requestInternalApi('/api/v1/internal/announcements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_API_SECRET,
      },
      body: JSON.stringify(body),
    }, { logScope: 'publisher' })

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
    const fallbackCourseCode = courseCode || classification.detectedCourseCode || undefined

    for (const file of files) {
      try {
        const effectiveCourseCode = file.courseCode || fallbackCourseCode

        const res = await requestInternalApi('/api/v1/internal/files', {
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
        }, { logScope: 'publisher' })

        if (!res.ok) {
          const text = await res.text()
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
        }
        filesCreated++
        logger.info('publisher', 'file record created', {
          name: file.name,
          courseCode: effectiveCourseCode ?? null,
        })
      } catch (err) {
        const msg = `File record creation failed for ${file.name}: ${String(err)}`
        errors.push(msg)
        logger.warn('publisher', msg)
      }
    }
  }

  // --- 3. Create Routine Overrides (if any were extracted by Gemini) ---
  let overridesCreated = 0
  if (classification.overrides && classification.overrides.length > 0) {
    try {
      const res = await requestInternalApi('/api/v1/internal/routine/overrides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': INTERNAL_API_SECRET,
        },
        body: JSON.stringify({ overrides: classification.overrides }),
      }, { logScope: 'publisher' })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
      }

      const result = await res.json() as any
      overridesCreated = result?.data?.created ?? classification.overrides.length
      logger.info('publisher', 'routine overrides created', { count: overridesCreated })
    } catch (err) {
      const msg = `Routine override creation failed: ${String(err)}`
      errors.push(msg)
      logger.warn('publisher', msg)
    }
  }

  return { website: websiteOk, filesCreated, overridesCreated, errors }
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
