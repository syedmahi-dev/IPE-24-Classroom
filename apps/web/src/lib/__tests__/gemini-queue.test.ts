import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('geminiRateCheck', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('TC-3.2.1: returns true when under 12 rpm', async () => {
    vi.doMock('@/lib/rate-limit', () => ({
      rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 5 })
    }))
    const { geminiRateCheck } = await import('@/lib/gemini-queue')
    const result = await geminiRateCheck()
    expect(result).toBe(true)
  })

  it('TC-3.2.2: returns false when at 12 rpm (leaving headroom below Google 15 rpm limit)', async () => {
    vi.doMock('@/lib/rate-limit', () => ({
      rateLimit: vi.fn().mockResolvedValue({ success: false, remaining: 0 })
    }))
    const { geminiRateCheck } = await import('@/lib/gemini-queue')
    const result = await geminiRateCheck()
    expect(result).toBe(false)
  })
})
