import { redis } from './redis'

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

export async function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - windowSeconds * 1000
  const redisKey = `rl:${key}`

  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(redisKey, 0, windowStart)
  pipeline.zadd(redisKey, now, `${now}-${Math.random()}`)
  pipeline.zcard(redisKey)
  pipeline.expire(redisKey, windowSeconds)
  const results = await pipeline.exec()

  const count = (results?.[2]?.[1] as number) ?? 0
  const success = count <= maxRequests

  return {
    success,
    remaining: Math.max(0, maxRequests - count),
    reset: Math.ceil((windowStart + windowSeconds * 1000) / 1000),
  }
}
