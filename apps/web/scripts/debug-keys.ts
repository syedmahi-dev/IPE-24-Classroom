
import { loadEnvConfig } from '@next/env'
import { join } from 'path'

loadEnvConfig(process.cwd())

function debugKey(name: string) {
  const base64 = process.env[name]
  if (!base64) {
    console.log(`${name}: NOT FOUND`)
    return
  }

  try {
    const json = Buffer.from(base64, 'base64').toString('utf8')
    const data = JSON.parse(json)
    console.log(`--- ${name} ---`)
    console.log(`Project ID: ${data.project_id}`)
    console.log(`Client Email: ${data.client_email}`)
    console.log(`Private Key Start: ${data.private_key?.substring(0, 50)}...`)
    console.log(`Private Key End: ...${data.private_key?.substring(data.private_key.length - 30)}`)
    console.log(`Private Key Length: ${data.private_key?.length}`)
    
    // Check for weird characters
    if (data.private_key.includes('\\n')) {
        console.log('Contains literal \\n sequences')
    } else if (data.private_key.includes('\n')) {
        console.log('Contains actual newline characters')
    }
    
    // Test if it can be used in a dummy way
    const crypto = require('crypto')
    try {
        crypto.createPrivateKey(data.private_key)
        console.log('Crypto validation: SUCCESS')
    } catch (e: any) {
        console.log(`Crypto validation: FAILED - ${e.message}`)
    }
  } catch (e: any) {
    console.log(`${name}: FAILED TO PARSE - ${e.message}`)
  }
}

debugKey('GOOGLE_SERVICE_ACCOUNT_KEY')
debugKey('FIREBASE_SERVICE_ACCOUNT_KEY')
