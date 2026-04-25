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

/**
 * Extract the Google Drive file ID from a Drive/Docs URL.
 * Supports formats:
 *   - https://drive.google.com/file/d/FILE_ID/view
 *   - https://drive.google.com/open?id=FILE_ID
 *   - https://docs.google.com/document/d/FILE_ID/edit
 *   - https://docs.google.com/spreadsheets/d/FILE_ID/edit
 *   - https://docs.google.com/presentation/d/FILE_ID/edit
 */
export function extractFileIdFromUrl(url: string): string | null {
  // Pattern 1: /d/FILE_ID/
  const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (dMatch) return dMatch[1]

  // Pattern 2: ?id=FILE_ID
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idMatch) return idMatch[1]

  return null
}

/**
 * Fetch metadata for a shared Google Drive file.
 * Returns a DriveUploadResult-compatible object if the file is accessible,
 * or null if the file ID can't be extracted or the API call fails.
 */
export async function getDriveFileMetadata(driveUrl: string): Promise<DriveUploadResult | null> {
  const fileId = extractFileIdFromUrl(driveUrl)
  if (!fileId) {
    logger.warn('drive', 'could not extract file ID from URL', { url: driveUrl.slice(0, 100) })
    return null
  }

  try {
    const auth = getAuthClient()
    const drive = google.drive({ version: 'v3', auth })

    const res = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, webViewLink, webContentLink',
    })

    const file = res.data
    if (!file.id || !file.name) {
      logger.warn('drive', 'drive file missing id or name', { fileId })
      return null
    }

    logger.info('drive', 'fetched drive file metadata', { fileId, name: file.name })

    return {
      driveId: file.id,
      driveUrl: file.webViewLink ?? driveUrl,
      downloadUrl: file.webContentLink ?? null,
      mimeType: file.mimeType ?? 'application/octet-stream',
      sizeBytes: parseInt(file.size ?? '0', 10),
      name: file.name,
    }
  } catch (err) {
    logger.warn('drive', 'failed to fetch drive file metadata', { fileId, error: String(err) })
    return null
  }
}

/**
 * Check if a Drive URL is a folder link.
 * e.g. https://drive.google.com/drive/folders/FOLDER_ID
 */
export function isFolderUrl(url: string): boolean {
  return /drive\.google\.com\/drive\/folders\//.test(url)
}

/**
 * Extract folder ID from a Drive folder URL.
 * e.g. https://drive.google.com/drive/folders/1ABC123?usp=sharing → 1ABC123
 */
export function extractFolderIdFromUrl(url: string): string | null {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

/**
 * List all files inside a shared Google Drive folder.
 * Returns metadata for each file (skips subfolders).
 */
export async function listDriveFolderFiles(folderUrl: string): Promise<DriveUploadResult[]> {
  const folderId = extractFolderIdFromUrl(folderUrl)
  if (!folderId) {
    logger.warn('drive', 'could not extract folder ID from URL', { url: folderUrl.slice(0, 100) })
    return []
  }

  try {
    const auth = getAuthClient()
    const drive = google.drive({ version: 'v3', auth })

    const results: DriveUploadResult[] = []
    let pageToken: string | undefined

    // Paginate through all files in the folder
    do {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
        fields: 'nextPageToken, files(id, name, mimeType, size, webViewLink, webContentLink)',
        pageSize: 100,
        pageToken,
      })

      for (const file of res.data.files ?? []) {
        if (!file.id || !file.name) continue

        results.push({
          driveId: file.id,
          driveUrl: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
          downloadUrl: file.webContentLink ?? null,
          mimeType: file.mimeType ?? 'application/octet-stream',
          sizeBytes: parseInt(file.size ?? '0', 10),
          name: file.name,
        })
      }

      pageToken = res.data.nextPageToken ?? undefined
    } while (pageToken)

    logger.info('drive', 'listed folder files', { folderId, count: results.length })
    return results
  } catch (err) {
    logger.warn('drive', 'failed to list folder files', { folderId, error: String(err) })
    return []
  }
}
