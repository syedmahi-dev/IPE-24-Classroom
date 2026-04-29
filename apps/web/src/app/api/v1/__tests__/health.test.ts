import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/v1/health/route'

describe('GET /api/v1/health', () => {
  it('TC-5.1.1: returns 200 with status ok (no auth required)', async () => {
    const req = new Request('http://localhost/api/v1/health')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('ok')
  })

  it('TC-5.1.2: response includes uptime field', async () => {
    const res = await GET()
    const json = await res.json()
    expect(typeof json.uptime).toBe('number')
    expect(json.uptime).toBeGreaterThanOrEqual(0)
  })

  it('TC-5.1.3: response time < 200ms', async () => {
    const start = Date.now()
    await GET()
    expect(Date.now() - start).toBeLessThan(200)
  })
})
