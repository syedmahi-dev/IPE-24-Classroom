import fetch from 'node-fetch'
import { getConfig } from '../config'
import { ClassificationResult } from './classifier'
import { DriveUploadResult } from './drive'
import { logger } from '../lib/logger'
import { requestInternalApi } from '../lib/internal-api'

/**
 * Auto-ingest a classified Discord message into the RAG knowledge base.
 * This runs in the background after publish/approval — failures are non-fatal.
 * 
 * The Virtual CR API on VPS handles:
 * - Deduplication (via messageId as sourceId)
 * - Chunking and embedding
 * - Storage cap enforcement
 */
export async function ingestToKnowledgeBase(params: {
  messageId: string
  channelName: string
  classification: ClassificationResult
  files: DriveUploadResult[]
  courseCode?: string
}): Promise<void> {
  const {
    INTERNAL_API_SECRET,
    INTERNAL_API_URL,
    VIRTUAL_CR_API_URL,
    VIRTUAL_CR_API_FALLBACK_URLS,
  } = getConfig()
  const { messageId, channelName, classification, files, courseCode } = params

  const virtualCrBaseUrls = [
    VIRTUAL_CR_API_URL || INTERNAL_API_URL,
    ...(VIRTUAL_CR_API_FALLBACK_URLS || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
  ]

  // Build knowledge text from classified content + file metadata
  let content = classification.body

  // Append file metadata (not full content — just names and Drive links)
  if (files.length > 0) {
    content += '\n\nAttached Files:\n'
    for (const f of files) {
      content += `- ${f.name}: ${f.driveUrl}\n`
    }
  }

  // Append override info if any
  if (classification.overrides && classification.overrides.length > 0) {
    content += '\n\nSchedule Changes:\n'
    for (const ov of classification.overrides) {
      content += `- ${ov.type}: ${ov.courseCode} on ${ov.date}`
      if (ov.room) content += `, Room: ${ov.room}`
      if (ov.startTime) content += `, Time: ${ov.startTime}`
      if (ov.reason) content += ` (${ov.reason})`
      content += '\n'
    }
  }

  // Determine source type based on classification
  const sourceType = `discord_${classification.type}`

  try {
    const res = await requestInternalApi('/api/v1/internal/knowledge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_API_SECRET,
      },
      body: JSON.stringify({
        title: classification.title,
        content,
        sourceType,
        sourceId: messageId,
        sourceChannel: channelName,
        courseCode: courseCode || classification.detectedCourseCode || undefined,
      }),
    }, {
      logScope: 'knowledge-ingestor',
      explicitBaseUrls: virtualCrBaseUrls,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
    }

    const result = await res.json() as any
    logger.info('knowledge-ingestor', 'Message ingested into knowledge base', {
      messageId,
      documentId: result.data?.documentId,
      chunkCount: result.data?.chunkCount,
    })
  } catch (err) {
    logger.warn('knowledge-ingestor', 'Failed to ingest message (non-fatal)', {
      messageId,
      error: String(err),
    })
  }
}
