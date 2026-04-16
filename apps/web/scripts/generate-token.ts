
import { google } from 'googleapis';
import { resolve } from 'path';
import { config } from 'dotenv';
import { createServer } from 'http';
import { parse } from 'url';
import fs from 'fs';

// Load .env
config({ path: resolve(process.cwd(), '.env') });

const SCOPES = ['https://www.googleapis.com/auth/drive'];

async function generateToken() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3001/oauth2callback' 
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Forces consent to get refresh token
  });

  console.log('\n============================================================');
  console.log('🔗 Please open the following URL in your browser to authorize:');
  console.log('------------------------------------------------------------');
  console.log(authUrl);
  console.log('============================================================\n');
  console.log('Waiting for your authorization (Listening on port 3001)...');

  // Create a local server to handle the redirect automatically
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      
      if (parsedUrl.pathname === '/oauth2callback') {
        const code = parsedUrl.query.code as string;
        
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Authentication failed: No code provided.');
          console.error('Authentication failed: No code provided in the URL.');
          server.close();
          process.exit(1);
        }

        const { tokens } = await oauth2Client.getToken(code);
        
        if (tokens.refresh_token) {
          // Append to .env
          const envPath = resolve(process.cwd(), '.env');
          let envContent = '';
          if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
          }
          if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
            envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/, `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
          } else {
            envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
          }
          fs.writeFileSync(envPath, envContent, 'utf8');

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>✅ Success!</h1><p>Your Refresh Token has been saved to your .env file.</p><p>You can close this window and return to the application.</p>');
          
          console.log('\n------------------------------------------------------------');
          console.log('✅ SUCCESS! GOOGLE_REFRESH_TOKEN automatically saved to .env!');
          console.log('------------------------------------------------------------\n');
          server.close();
          process.exit(0);
        } else {
           res.writeHead(400, { 'Content-Type': 'text/html' });
           res.end('<h1>⚠️ Warning</h1><p>No refresh token returned. You probably need to go to Google Account Security and revoke access to this app first, then try again.</p>');
           console.log('\n❌ Failed: No refresh token received.');
           server.close();
           process.exit(1);
        }
      }
    } catch (err: any) {
      console.error('\n❌ Server Error:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error: ' + err.message);
      server.close();
      process.exit(1);
    }
  });

  server.listen(3001, () => {
    // Attempt to automatically open the URL
    import('child_process').then(({ exec }) => {
       const command = process.platform === 'win32' ? `start "" "${authUrl}"` : process.platform === 'darwin' ? `open "${authUrl}"` : `xdg-open "${authUrl}"`;
       exec(command, (err) => {
         // Silently ignore if unable to auto-open
       });
    });
  });
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('ERROR: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
  process.exit(1);
}

generateToken();
