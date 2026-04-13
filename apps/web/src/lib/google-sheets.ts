import { google } from 'googleapis'
import { redis } from './redis'

const CACHE_KEY = 'routine:sheets'
const CACHE_TTL = 300 // 5 minutes

function getAuthClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!, 'base64').toString()
  )
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

export async function fetchRoutine() {
  const cached = await redis.get(CACHE_KEY)
  if (cached) return JSON.parse(cached)

  const auth = getAuthClient()
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
