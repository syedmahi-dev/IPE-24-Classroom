import { PrismaClient } from '@prisma/client'
import { google } from 'googleapis'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const prisma = new PrismaClient()

async function smokeTest() {
  console.log('🚀 Starting IPE-24 Infrastructure Smoke Test...')
  console.log('--------------------------------------------')

  let failure = false

  // 1. Database Connectivity
  try {
    process.stdout.write('📡 Testing Database Connection (Prisma)... ')
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ PASS')
  } catch (err) {
    console.log('❌ FAIL')
    console.error(err)
    failure = true
  }

  // 2. Google Service Account Key
  try {
    process.stdout.write('🔑 Testing Google Service Account Key... ')
    const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    if (!keyBase64) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not found in .env')
    
    const keyJson = Buffer.from(keyBase64, 'base64').toString('utf8')
    const credentials = JSON.parse(keyJson)
    
    if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Invalid service account key structure')
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    
    const drive = google.drive({ version: 'v3', auth })
    await drive.about.get({ fields: 'user' })
    console.log('✅ PASS')
  } catch (err) {
    console.log('❌ FAIL')
    console.error(err instanceof Error ? err.message : err)
    failure = true
  }

  // 3. Environment Variables Check
  try {
    process.stdout.write('env Checking Critical Env Variables... ')
    const required = [
        'DATABASE_URL',
        'NEXTAUTH_SECRET',
        'INTERNAL_API_SECRET',
        'GOOGLE_DRIVE_FOLDER_ID',
        'GOOGLE_SHEETS_ROUTINE_ID'
    ]
    const missing = required.filter(key => !process.env[key] || process.env[key] === '[TODO]')
    
    if (missing.length > 0) {
        throw new Error(`Missing or [TODO] values for: ${missing.join(', ')}`)
    }
    console.log('✅ PASS')
  } catch (err) {
    console.log('❌ FAIL')
    console.error(err instanceof Error ? err.message : err)
    failure = true
  }

  console.log('--------------------------------------------')
  if (failure) {
    console.log('🛑 SMOKE TEST FAILED - Check the logs above.')
    process.exit(1)
  } else {
    console.log('✨ ALL SYSTEMS NOMINAL - Ready for launch.')
    process.exit(0)
  }
}

smokeTest()
  .catch(err => {
    console.error('Fatal error in smoke test:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
