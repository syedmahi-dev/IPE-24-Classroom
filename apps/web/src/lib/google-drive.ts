import { google } from 'googleapis';
import { Readable } from 'stream';

const getOAuth2Client = () => {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/drive-manager`;
  
  if (!clientID || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
  }

  return new google.auth.OAuth2(clientID, clientSecret, redirectUrl);
};

export function getAuthClient(customRefreshToken?: string) {
  const refreshToken = customRefreshToken || process.env.GOOGLE_REFRESH_TOKEN;

  // Fallback to service account if strictly needed and no oauth present
  if (!refreshToken && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    );
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
  }

  if (!refreshToken) {
    throw new Error('No valid refresh token or service account available');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export function getAuthUrl() {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    prompt: 'consent', // Force consent prompt to ensure we get a refresh token
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Get user info (email)
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const userInfo = await oauth2.userinfo.get();

  return {
    refreshToken: tokens.refresh_token,
    email: userInfo.data.email,
    name: userInfo.data.name,
  };
}

export async function uploadToDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  refreshToken?: string,
  makePublic: boolean = false
): Promise<{ id: string; webViewLink: string; webContentLink: string }> {
  const auth = getAuthClient(refreshToken);
  const drive = google.drive({ version: 'v3', auth });

  try {
    const response = await drive.files.create({
      requestBody: {
        name: filename,
        // If no refresh token is provided (using backwards combat .env), we might need the folder ID. 
        // If a new drive is connected, we'll just put it in root for now, or you could create a specific folder.
        parents: refreshToken ? undefined : (process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : undefined),
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: 'id, webViewLink, webContentLink',
    });

    if (makePublic) {
      await drive.permissions.create({
        fileId: response.data.id!,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    }

    return {
      id: response.data.id!,
      webViewLink: response.data.webViewLink!,
      webContentLink: response.data.webContentLink ?? '',
    };
  } catch (error: any) {
    console.error('CRITICAL: Google Drive Upload Failure');
    if (error.response) {
      console.error('Error Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

export async function downloadFileStream(fileId: string, refreshToken?: string) {
  const auth = getAuthClient(refreshToken);
  const drive = google.drive({ version: 'v3', auth });
  
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return {
    stream: response.data as import('stream').Readable,
    mimeType: response.headers['content-type'],
    size: response.headers['content-length']
  };
}

export async function deleteFromDrive(fileId: string, refreshToken?: string): Promise<void> {
  const auth = getAuthClient(refreshToken);
  const drive = google.drive({ version: 'v3', auth });
  await drive.files.delete({ fileId });
}
