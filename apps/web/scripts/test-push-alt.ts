import admin from 'firebase-admin'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars from .env
dotenv.config({ path: path.join(__dirname, '../.env') })

async function testPush() {
  console.log('--- Firebase Push Test (Alternative Key) ---')
  
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!key) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY missing in .env')
    return
  }

  try {
    const serviceAccount = JSON.parse(Buffer.from(key, 'base64').toString())
    console.log(`✅ Decoded service account for project: ${serviceAccount.project_id} (email: ${serviceAccount.client_email})`)

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
    }

    console.log('📡 Sending dry-run message to verify keys...')
    
    try {
      await admin.messaging().send({
        token: 'fG-vS_fake_token_for_dry_run_testing_keys_validation_only-m_3', 
        notification: {
          title: 'Test Notification',
          body: 'This is a dry run test of the IPE-24 notification system.',
        },
      }, true) // true = dry run
      console.log('✅ Keys are VALID! (Dry run successful)')
    } catch (err: any) {
      if (err.code === 'messaging/registration-token-not-registered' || err.code === 'messaging/invalid-registration-token') {
        console.log('✅ Keys are VALID! (Authenticated successfully, but token was rejected as expected)')
      } else {
        console.error('❌ FCM Error:', err.message)
      }
    }

  } catch (err: any) {
    console.error('❌ Failed to initialize or send:', err.message)
  }
}

testPush()
