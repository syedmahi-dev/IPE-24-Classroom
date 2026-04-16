import { describe, it, expect, vi, beforeEach } from 'vitest'
import { rateLimit } from '../rate-limit'

// Mock redis
vi.mock('../redis', () => ({
  redis: {
    pipeline: vi.fn()
  }
}))

import { redis } from '../redis'

describe('rateLimit', () => {
  const mockPipeline = {
    zremrangebyscore: vi.fn().mockReturnThis(),
    zadd: vi.fn().mockReturnThis(),
    zcard: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(redis.pipeline as any).mockReturnValue(mockPipeline)
  })

  it('should return success true when count is below limit', async () => {
    // Array of [error, result] as per ioredis pipeline exec return format
    mockPipeline.exec.mockResolvedValue([
      [null, 0], // zremrangebyscore result
      [null, 1], // zadd result
      [null, 5], // zcard result (current count = 5)
      [null, 1]  // expire result
    ])

    const result = await rateLimit('test-key', 10, 60)
    
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(5)
    expect(mockPipeline.zcard).toHaveBeenCalled()
  })

  it('should return success false when count exceeds limit', async () => {
    mockPipeline.exec.mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 12], // current count = 12
      [null, 1]
    ])

    const result = await rateLimit('test-key', 10, 60)
    
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('should calculate reset time correctly', async () => {
    const now = Date.now()
    vi.setSystemTime(now)
    
    mockPipeline.exec.mockResolvedValue([[null, 0], [null, 1], [null, 1], [null, 1]])
    
    const windowSeconds = 60
    const result = await rateLimit('test-key', 10, windowSeconds)
    
    const expectedReset = Math.ceil(now / 1000)
    expect(result.reset).toBe(expectedReset)
    
    vi.useRealTimers()
  })
})
