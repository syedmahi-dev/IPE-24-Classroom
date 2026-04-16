import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error) {
    return new NextResponse(`OAuth Error: ${error}`, { status: 400 });
  }

  if (!code) {
    return new NextResponse('No authorization code provided.', { status: 400 });
  }

  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Construct absolute callback URL matching the initiation one
  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/google-drive`;

  const oauth2Client = new google.auth.OAuth2(
    clientID,
    clientSecret,
    redirectUri
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (tokens.refresh_token) {
      // Append manually to .env
      const envPath = path.resolve(process.cwd(), '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
         envContent = fs.readFileSync(envPath, 'utf8');
      }

      // Check if it already exists to replace or append
      if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
         envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/, `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      } else {
         envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
      }

      fs.writeFileSync(envPath, envContent, 'utf8');
      
      return new NextResponse(
        `<html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #fafafa;">
            <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
              <h1 style="color: #16a34a;">✅ Setup Complete!</h1>
              <p>Your Google Drive Refresh Token has been successfully generated and saved to your <code>.env</code> file.</p>
              <p><strong>You can close this window and return to the chat.</strong></p>
            </div>
          </body>
        </html>`, 
        { headers: { 'Content-Type': 'text/html' } }
      );
    } else {
      return new NextResponse(
        `<html>
          <body style="font-family: sans-serif; padding: 40px;">
            <h1 style="color: #ea580c;">⚠️ Warning</h1>
            <p>No refresh token was returned. This usually means you have authorized this app before.</p>
            <p>Please go to your <a href="https://myaccount.google.com/permissions">Google Account Permissions</a>, remove access for this app, and try again.</p>
          </body>
        </html>`, 
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

  } catch (err: any) {
    console.error('Callback error:', err);
    return new NextResponse('Error exchanging code for token: ' + err.message, { status: 500 });
  }
}
