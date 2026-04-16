export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    return new NextResponse('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env', { status: 400 });
  }

  // Construct absolute callback URL
  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/google-drive`;

  const oauth2Client = new google.auth.OAuth2(
    clientID,
    clientSecret,
    redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive'],
    prompt: 'consent'
  });

  return NextResponse.redirect(authUrl);
}
