import { rateLimit } from './rate-limit'

/**
 * Global rate guard for Gemini API calls to stay within free tier limits.
 * Default: 15 RPM (Requests Per Minute). We use 12 for headroom.
 */
export async function geminiRateCheck() {
  const result = await rateLimit('global:gemini:rpm', 12, 60)
  return result.success
}
