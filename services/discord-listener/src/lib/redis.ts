import { Redis } from 'ioredis'
import { getConfig } from '../config'

let _redis: Redis | null = null
let _redisAvailable = true

export function getRedis(): Redis {
  if (_redis) return _redis
  _redis = new Redis(getConfig().REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 200, 3000),
    lazyConnect: true,
  })
  _redis.on('error', (err) => {
    if (_redisAvailable) {
      console.error('[redis] connection error:', err.message)
      _redisAvailable = false
    }
  })
  _redis.on('connect', () => {
    _redisAvailable = true
  })
  return _redis
}

export function isRedisAvailable(): boolean {
  return _redisAvailable
}

const DEDUP_TTL_SECONDS = 86400 // 24 hours

// Returns true if this message has NOT been processed before (safe to process).
// If Redis is unavailable, always returns true (skip dedup, best-effort).
export async function claimMessage(messageId: string): Promise<boolean> {
  try {
    const redis = getRedis()
    const key = `dl:msg:${messageId}`
    // NX = only set if key does not exist. Returns 'OK' on success, null if already exists.
    const result = await redis.set(key, '1', 'EX', DEDUP_TTL_SECONDS, 'NX')
    return result === 'OK'
  } catch (err) {
    console.warn('[redis] claimMessage failed — proceeding without dedup:', (err as Error).message)
    return true
  }
}

export async function releaseMessage(messageId: string): Promise<void> {
  try {
    await getRedis().del(`dl:msg:${messageId}`)
  } catch {
    // non-critical — message will just be deduped for 24h
  }
}
