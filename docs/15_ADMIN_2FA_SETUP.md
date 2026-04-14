# Manual Super Admin 2FA Setup

Because this system is self-hosted and highly locked down, Super Admin 2FA is configured manually via a server script rather than a UI, ensuring maximum security and zero development overhead for a feature used by exactly one person.

## 1. Setup Instructions
Run this script once locally or on your server to generate your hashed password and Google Authenticator QR code.

1. Install the QR code generator temporarily:
   \`\`\`bash
   npm install -D qrcode-terminal
   \`\`\`
2. Save the script below as `scripts/setup-2fa.js`.
3. Edit the `userEmail` and `plainTextPassword` variables inside the script.
4. Run the script: `node scripts/setup-2fa.js`.
5. Scan the QR code with your Google Authenticator app.
6. Copy the generated SQL output and execute it in your PostgreSQL database to secure your account.

## 2. Generator Script
\`\`\`javascript
const { authenticator } = require('otplib');
const bcrypt = require('bcryptjs');
const qrcode = require('qrcode-terminal');

// --- EDIT THESE ---
const userEmail = 'admin@iut-dhaka.edu'; 
const appName = 'IPE-24 Portal';
const plainTextPassword = 'YOUR_SECURE_PASSWORD'; 
// ------------------

const secret = authenticator.generateSecret();
const otpauthUrl = authenticator.keyuri(userEmail, appName, secret);
const hash = bcrypt.hashSync(plainTextPassword, 10);

console.log('\\n=========================================');
console.log('🔐 SUPER ADMIN 2FA SETUP');
console.log('=========================================\\n');

qrcode.generate(otpauthUrl, { small: true }, function (qrcode) {
  console.log(qrcode);
});

console.log('\\n📱 STEP 1: Open Google Authenticator and scan the QR code above.');
console.log('\\n💾 STEP 2: Run this SQL query in your database:\\n');

console.log(`UPDATE users SET `);
console.log(`  "passwordHash" = '${hash}',`);
console.log(`  "twoFactorSecret" = '${secret}'`);
console.log(`WHERE email = '${userEmail}';\\n`);

console.log('=========================================');
\`\`\`