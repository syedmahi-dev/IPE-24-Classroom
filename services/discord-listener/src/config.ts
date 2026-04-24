import { z } from 'zod'

export const AnnouncementTypeSchema = z.enum([
  'general', 'exam', 'file_update', 'routine_update', 'urgent', 'event'
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
  // Where to send the preview embed (REVIEW_GATE only)
  reviewChannelId: z.string().optional(),
  // Optional announcement type override — skip Gemini classification
  defaultAnnouncementType: AnnouncementTypeSchema.optional(),
  // Human-readable label for logs
  label: z.string().optional(),
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
  GEMINI_API_KEY: z.string().min(1),
  GOOGLE_SERVICE_ACCOUNT_KEY: z.string().min(1),
  GOOGLE_DRIVE_FOLDER_ID: z.string().min(1),
  INTERNAL_API_SECRET: z.string().min(1),
  INTERNAL_API_URL: z.string().url().default('http://web:3000'),
  TELEGRAM_BOT_URL: z.string().url().default('http://telegram-bot:3004'),
  REDIS_URL: z.string().default('redis://redis:6379'),
  REACTION_TIMEOUT_MS: z.coerce.number().default(30 * 60 * 1000), // 30 min
  NODE_ENV: z.string().default('production'),
})

export type AppConfig = Omit<z.infer<typeof ConfigSchema>, 'DISCORD_CHANNEL_CONFIGS'> & {
  DISCORD_CHANNEL_CONFIGS: ChannelConfig[]
}

let _config: AppConfig | null = null

export function getConfig(): AppConfig {
  if (_config) return _config
  const parsed = ConfigSchema.parse(process.env)
  _config = parsed as unknown as AppConfig
  return _config
}

export function getChannelConfig(channelId: string): ChannelConfig | null {
  const cfg = getConfig()
  return cfg.DISCORD_CHANNEL_CONFIGS.find((c) => c.channelId === channelId) ?? null
}
