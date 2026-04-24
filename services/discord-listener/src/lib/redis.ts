import { Redis } from 'ioredis'
import { getConfig } from '../config'

let _redis: Redis | null = null

export function getRedis(): Redis {
  if (_redis) return _redis
  _redis = new Redis(getConfig().REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 200, 3000),
    lazyConnect: true,
  })
  _redis.on('error', (err) => console.error('[redis] connection error:', err.message))
  return _redis
}

const DEDUP_TTL_SECONDS = 86400 // 24 hours

// Returns true if this message has NOT been processed before (safe to process)
export async function claimMessage(messageId: string): Promise<boolean> {
  const redis = getRedis()
  const key = `dl:msg:${messageId}`
  // NX = only set if key does not exist. Returns 'OK' on success, null if already exists.
  const result = await redis.set(key, '1', 'EX', DEDUP_TTL_SECONDS, 'NX')
  return result === 'OK'
}

export async function releaseMessage(messageId: string): Promise<void> {
  await getRedis().del(`dl:msg:${messageId}`)
}
