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
