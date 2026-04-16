import { loadEnvConfig } from '@next/env'
import fs from 'fs'

loadEnvConfig(process.cwd())

const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
if (!keyBase64) {
    console.error('No key found')
    process.exit(1)
}

try {
    const json = Buffer.from(keyBase64, 'base64').toString('utf8')
    console.log('Decoded length:', json.length)
    console.log('First 50 chars:', json.substring(0, 50))
    console.log('Last 50 chars:', json.substring(json.length - 50))
    const parsed = JSON.parse(json)
    console.log('Project ID:', parsed.project_id)
    console.log('Client Email:', parsed.client_email)
} catch (err) {
    console.error('Failed to decode/parse:', err)
}
