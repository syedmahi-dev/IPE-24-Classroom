
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

function encodeKey(filePath: string) {
    const content = readFileSync(filePath, 'utf8')
    const json = JSON.parse(content)
    // Ensure nested fields like private_key preserve their formatting
    return Buffer.from(JSON.stringify(json)).toString('base64')
}

const googlePath = 'd:\\IPE-24 Classroom\\Artifacts\\Keys\\ipe-24-2578c9592f21.json'
const firebasePath = 'd:\\IPE-24 Classroom\\Artifacts\\Keys\\ipe-24-classroom-sys-firebase-adminsdk-fbsvc-f84af91e7f.json'

console.log('GOOGLE_SERVICE_ACCOUNT_KEY=' + encodeKey(googlePath))
console.log('FIREBASE_SERVICE_ACCOUNT_KEY=' + encodeKey(firebasePath))
