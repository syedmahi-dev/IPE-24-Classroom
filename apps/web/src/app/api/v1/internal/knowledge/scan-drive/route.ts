export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getAuthClient } from '@/lib/google-drive'
import {
  upsertSandboxDriveFile,
  getKnownDriveIds,
  upsertVirtualCrKnowledge,
  getDriveFileStats,
} from '@/lib/virtual-cr-sandbox'

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || ''

// Folders to track — root class folder + any subfolders found
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || ''

/**
 * POST /api/v1/internal/knowledge/scan-drive
 *
 * Scans the class Google Drive folder (and subfolders), stores file metadata
 * in the Virtual CR sandbox, and reports new files found since last scan.
 *
 * Called by cron or manually. Authenticated via x-internal-secret.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!secret || secret !== INTERNAL_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!ROOT_FOLDER_ID) {
    return NextResponse.json(
      { success: false, error: 'GOOGLE_DRIVE_FOLDER_ID not configured' },
      { status: 500 }
    )
  }

  try {
    const auth = getAuthClient()
    const drive = google.drive({ version: 'v3', auth })

    // 1. List all subfolders under root
    const foldersToScan: { id: string; name: string }[] = [
      { id: ROOT_FOLDER_ID, name: 'Root' },
    ]

    const subFolderRes = await drive.files.list({
      q: `'${ROOT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      pageSize: 100,
    })

    for (const f of subFolderRes.data.files ?? []) {
      if (f.id && f.name) {
        foldersToScan.push({ id: f.id, name: f.name })
      }
    }

    // 2. Scan each folder for files
    let totalFiles = 0
    let newFiles = 0
    const newFilesList: { name: string; folder: string; driveUrl: string }[] = []

    for (const folder of foldersToScan) {
      const knownIds = await getKnownDriveIds(folder.id)
      let pageToken: string | undefined

      do {
        const res = await drive.files.list({
          q: `'${folder.id}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
          fields: 'nextPageToken, files(id, name, mimeType, size, webViewLink, webContentLink, createdTime)',
          pageSize: 100,
          pageToken,
          orderBy: 'createdTime desc',
        })

        for (const file of res.data.files ?? []) {
          if (!file.id || !file.name) continue

          totalFiles++
          const isNew = !knownIds.has(file.id)
          if (isNew) {
            newFiles++
            newFilesList.push({
              name: file.name,
              folder: folder.name,
              driveUrl: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
            })
          }

          // Detect course code from folder name (e.g. "IPE4208")
          const courseMatch = folder.name.match(/^([A-Z]{2,5}\d{3,5})$/i)

          await upsertSandboxDriveFile({
            driveId: file.id,
            name: file.name,
            mimeType: file.mimeType ?? 'application/octet-stream',
            sizeBytes: parseInt(file.size ?? '0', 10),
            driveUrl: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
            downloadUrl: file.webContentLink ?? null,
            courseCode: courseMatch ? courseMatch[1].toUpperCase() : null,
            folderId: folder.id,
            folderName: folder.name,
          })
        }

        pageToken = res.data.nextPageToken ?? undefined
      } while (pageToken)
    }

    // 3. Build a knowledge document summarizing the Drive contents
    let driveIndex = 'GOOGLE DRIVE FILE INDEX\n\n'
    for (const folder of foldersToScan) {
      driveIndex += `📁 ${folder.name}\n`
    }
    driveIndex += `\nTotal files tracked: ${totalFiles}\n`

    if (newFiles > 0) {
      driveIndex += `\n🆕 NEW FILES FOUND (this scan):\n`
      for (const nf of newFilesList.slice(0, 50)) {
        driveIndex += `  - ${nf.name} (in ${nf.folder})\n    ${nf.driveUrl}\n`
      }
    } else {
      driveIndex += '\nNo new files since last scan.\n'
    }

    await upsertVirtualCrKnowledge({
      sourceType: 'drive_scan',
      sourceId: 'drive-file-index',
      title: 'Google Drive File Index',
      content: driveIndex,
      sourceChannel: 'drive-scanner',
      payload: {
        totalFiles,
        newFiles,
        foldersScanned: foldersToScan.length,
        newFilesList: newFilesList.slice(0, 100),
      },
    })

    // 4. Get stats
    const stats = await getDriveFileStats()

    return NextResponse.json({
      success: true,
      data: {
        foldersScanned: foldersToScan.length,
        totalFiles,
        newFiles,
        newFilesList: newFilesList.slice(0, 20),
        sandboxStats: stats,
      },
    })
  } catch (error) {
    console.error('[Drive Scan] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/internal/knowledge/scan-drive
 *
 * Returns Drive file stats from the sandbox (no scanning).
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!secret || secret !== INTERNAL_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const stats = await getDriveFileStats()
  return NextResponse.json({ success: true, data: stats })
}
