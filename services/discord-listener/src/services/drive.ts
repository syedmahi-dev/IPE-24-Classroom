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

// In-memory cache for subfolder IDs to avoid repeated API calls
const folderIdCache = new Map<string, string>()

/**
 * Get or create a subfolder inside the root Drive folder.
 * e.g. "IPE4208" folder under the root Drive folder.
 * Caches folder IDs in memory for performance.
 */
async function getOrCreateSubFolder(folderName: string): Promise<string> {
  // Check cache first
  if (folderIdCache.has(folderName)) {
    return folderIdCache.get(folderName)!
  }

  const auth = getAuthClient()
  const drive = google.drive({ version: 'v3', auth })
  const rootFolderId = getConfig().GOOGLE_DRIVE_FOLDER_ID

  // Search for existing subfolder
  const searchRes = await drive.files.list({
    q: `'${rootFolderId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  })

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    const folderId = searchRes.data.files[0].id!
    folderIdCache.set(folderName, folderId)
    logger.info('drive', 'found existing subfolder', { folderName, folderId })
    return folderId
  }

  // Create new subfolder
  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    },
    fields: 'id',
  })

  const newFolderId = createRes.data.id!

  // Make subfolder publicly viewable
  await drive.permissions.create({
    fileId: newFolderId,
    requestBody: { role: 'reader', type: 'anyone' },
  })

  folderIdCache.set(folderName, newFolderId)
  logger.info('drive', 'created new subfolder', { folderName, folderId: newFolderId })
  return newFolderId
}

/**
 * Upload a file from a URL to Google Drive, optionally into a subfolder.
 * @param subFolderName - If provided, file goes into this subfolder under root.
 *                        If not, file goes directly into root folder.
 */
export async function uploadUrlToDrive(
  url: string,
  filename: string,
  mimeType: string,
  sizeBytes: number,
  subFolderName?: string
): Promise<DriveUploadResult> {
  logger.info('drive', 'downloading attachment', { url: url.slice(0, 80), filename, subFolder: subFolderName ?? 'root' })

  // Sanitize filename
  const safeName = filename.replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 200)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download attachment: HTTP ${response.status}`)
  }

  const buffer = await response.buffer()
  const stream = Readable.from(buffer)

  // Determine parent folder
  let parentFolderId: string
  if (subFolderName) {
    parentFolderId = await getOrCreateSubFolder(subFolderName)
  } else {
    parentFolderId = getConfig().GOOGLE_DRIVE_FOLDER_ID
  }

  const auth = getAuthClient()
  const drive = google.drive({ version: 'v3', auth })

  const uploadResponse = await drive.files.create({
    requestBody: {
      name: safeName,
      parents: [parentFolderId],
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

  logger.info('drive', 'uploaded to drive', { fileId: file.id, name: safeName, folder: subFolderName ?? 'root' })

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
