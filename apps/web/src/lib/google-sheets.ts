import { google } from 'googleapis'
import { redis } from './redis'

const CACHE_KEY = 'routine:sheets'
const CACHE_TTL = 300 // 5 minutes

function getAuthClient() {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY === 'BASE64_ENCODED_SERVICE_ACCOUNT_JSON') {
      return null;
    }
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    )
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
  } catch (err) {
    console.warn('Failed to initialized Google Auth Client for Sheets:', err);
    return null;
  }
}

export async function fetchRoutine() {
  const cached = await redis.get(CACHE_KEY)
  if (cached) return JSON.parse(cached)

  const auth = getAuthClient()
  if (!auth) return [] // Fallback to empty routine if credentials aren't set

  const sheets = google.sheets({ version: 'v4', auth })

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ROUTINE_ID!,
    range: 'Routine!A1:G20',
  })

  const data = response.data.values ?? []
  await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(data))
  return data
}

export async function invalidateRoutineCache() {
  await redis.del(CACHE_KEY)
}
