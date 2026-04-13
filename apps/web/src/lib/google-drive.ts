import { google } from 'googleapis'

function getAuthClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!, 'base64').toString()
  )
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })
}

export async function uploadToDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ id: string; webViewLink: string; webContentLink: string }> {
  const auth = getAuthClient()
  const drive = google.drive({ version: 'v3', auth })

  const { Readable } = await import('stream')

  const response = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id, webViewLink, webContentLink',
  })

  // Make file accessible via link
  await drive.permissions.create({
    fileId: response.data.id!,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  })

  return {
    id: response.data.id!,
    webViewLink: response.data.webViewLink!,
    webContentLink: response.data.webContentLink ?? '',
  }
}

export async function deleteFromDrive(fileId: string): Promise<void> {
  const auth = getAuthClient()
  const drive = google.drive({ version: 'v3', auth })
  await drive.files.delete({ fileId })
}
