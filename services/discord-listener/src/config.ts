import 'dotenv/config'
import { z } from 'zod'
import fetch from 'node-fetch'
import { logger } from './lib/logger'

export const AnnouncementTypeSchema = z.enum([
  'general', 'exam', 'file_update', 'routine_update', 'urgent', 'event', 'course_update'
])
export type AnnouncementType = z.infer<typeof AnnouncementTypeSchema>

export const ChannelModeSchema = z.enum(['AUTO_PUBLISH', 'REVIEW_GATE'])
export type ChannelMode = z.infer<typeof ChannelModeSchema>

export const ChannelConfigSchema = z.object({
  channelId: z.string().min(1),
  mode: ChannelModeSchema,
  // Discord user IDs allowed to trigger publishing from this channel
  authorizedUserIds: z.array(z.string()),
  // Optional: role IDs that also grant publishing permission
  authorizedRoleIds: z.array(z.string()).optional().default([]),
  // Optional allow-list: if set, only these course codes can be used for file routing
  allowedCourseCodes: z.array(z.string()).optional().default([]),
  // Optional announcement type override — skip Gemini classification
  defaultAnnouncementType: AnnouncementTypeSchema.optional(),
  // Human-readable label for logs
  label: z.string().optional(),
  // Course code mapping — e.g. "IPE4208" for Drive subfolders and DB records
  courseCode: z.string().optional(),
})
export type ChannelConfig = z.infer<typeof ChannelConfigSchema>

const ConfigSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  // JSON array of ChannelConfig objects
  DISCORD_CHANNEL_CONFIGS: z.string().transform((val) => {
    const parsed = JSON.parse(val)
    return z.array(ChannelConfigSchema).parse(parsed)
  }),
  // The CR's Telegram chat ID for DM fallback on errors
  TELEGRAM_CR_CHAT_ID: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  // Comma-separated list of Gemini API keys for failover/rotation
  GEMINI_API_KEY: z.string().min(1),
  GOOGLE_SERVICE_ACCOUNT_KEY: z.string().min(1),
  GOOGLE_DRIVE_FOLDER_ID: z.string().min(1),
  INTERNAL_API_SECRET: z.string().min(1),
  INTERNAL_API_URL: z.string().url().default('http://web:3000'),
  // Dedicated VPS-hosted Virtual CR RAG endpoint (can be same as INTERNAL_API_URL)
  VIRTUAL_CR_API_URL: z.string().url().optional(),
  // Optional comma-separated fallback base URLs for Virtual CR API
  VIRTUAL_CR_API_FALLBACK_URLS: z.string().optional(),
  TELEGRAM_BOT_URL: z.string().default('disabled'),
  REDIS_URL: z.string().default('redis://redis:6379'),
  REACTION_TIMEOUT_MS: z.coerce.number().default(2 * 60 * 60 * 1000), // 2 hours
  CONFIG_REFRESH_INTERVAL_MS: z.coerce.number().default(5 * 60 * 1000), // 5 min
  NODE_ENV: z.string().default('production'),
})

export type AppConfig = Omit<z.infer<typeof ConfigSchema>, 'DISCORD_CHANNEL_CONFIGS'> & {
  DISCORD_CHANNEL_CONFIGS: ChannelConfig[]
}

let _config: AppConfig | null = null
let _geminiKeys: string[] = []
let _currentKeyIndex = 0
let _activeCourses: { code: string; name: string }[] = []

export function getConfig(): AppConfig {
  if (_config) return _config
  const parsed = ConfigSchema.parse(process.env)
  _config = parsed as unknown as AppConfig
  
  // Parse multiple Gemini keys
  _geminiKeys = _config.GEMINI_API_KEY.split(',').map(k => k.trim()).filter(Boolean)
  
  return _config
}

/**
 * Get the list of active course codes.
 */
export function getActiveCourses(): { code: string; name: string }[] {
  return _activeCourses
}

/**
 * Get the current Gemini API key.
 */
export function getGeminiKey(): string {
  if (_geminiKeys.length === 0) {
    getConfig() // Ensure keys are parsed
  }
  return _geminiKeys[_currentKeyIndex] || _geminiKeys[0] || ''
}

/**
 * Rotates to the next Gemini API key (useful when hitting rate limits).
 * Returns true if we successfully rotated to a NEW key, false if we only have one key.
 */
export function rotateGeminiKey(): boolean {
  if (_geminiKeys.length <= 1) return false
  
  const oldIndex = _currentKeyIndex
  _currentKeyIndex = (_currentKeyIndex + 1) % _geminiKeys.length
  
  logger.info('config', 'rotated Gemini API key', { 
    fromIndex: oldIndex, 
    toIndex: _currentKeyIndex,
    totalKeys: _geminiKeys.length 
  })
  
  return true
}

export function getChannelConfig(channelId: string): ChannelConfig | null {
  const cfg = getConfig()
  return cfg.DISCORD_CHANNEL_CONFIGS.find((c) => c.channelId === channelId) ?? null
}

export async function refreshBotConfigs(): Promise<void> {
  const config = getConfig()
  const headers = { 'x-internal-secret': config.INTERNAL_API_SECRET }
  
  try {
    // 1. Refresh Channel Configs
    const channelRes = await fetch(`${config.INTERNAL_API_URL}/api/v1/internal/bot-config`, { headers })
    if (channelRes.ok) {
      const data = await channelRes.json()
      const parsed = z.array(ChannelConfigSchema).safeParse(data)
      if (parsed.success && parsed.data.length > 0) {
        _config!.DISCORD_CHANNEL_CONFIGS = parsed.data
        logger.info('config', 'refreshed channel configs from API', { count: parsed.data.length })
      }
    }

    // 2. Refresh Active Courses
    const courseRes = await fetch(`${config.INTERNAL_API_URL}/api/v1/internal/courses`, { headers })
    if (courseRes.ok) {
      const json = await courseRes.json() as any
      if (json.success && Array.isArray(json.data)) {
        _activeCourses = json.data
        logger.info('config', 'refreshed active course list', { count: json.data.length })
      }
    }
  } catch (err) {
    logger.warn('config', 'failed to fetch configs from API, keeping existing', { error: String(err) })
  }
}

export function startConfigRefresh() {
  const interval = getConfig().CONFIG_REFRESH_INTERVAL_MS
  setInterval(() => {
    refreshBotConfigs().catch(() => {})
  }, interval)
  // Run once immediately
  refreshBotConfigs().catch(() => {})
}
