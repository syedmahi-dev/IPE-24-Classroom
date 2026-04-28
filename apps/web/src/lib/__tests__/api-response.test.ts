import { describe, it, expect } from 'vitest'
import { ok, err, paginated, ERRORS } from '@/lib/api-response'

describe('API response helpers', () => {
  it('TC-1.6.1: ok() emits 200 with success:true and data', async () => {
    const res = ok({ id: '123' })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.id).toBe('123')
    expect(json.error).toBeNull()
  })

  it('TC-1.6.2: err() emits correct status and error code', async () => {
    const res = err('VALIDATION_ERROR', 'Page must be a number', 400)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('TC-1.6.3: paginated() includes meta object', async () => {
    const res = paginated([{ id: '1' }], { page: 1, limit: 10, total: 40 })
    const json = await res.json()
    expect(json.meta.page).toBe(1)
    expect(json.meta.total).toBe(40)
  })

  it('TC-1.6.4: ERRORS.UNAUTHORIZED() returns 401', async () => {
    expect((ERRORS.UNAUTHORIZED()).status).toBe(401)
  })

  it('TC-1.6.5: ERRORS.FORBIDDEN() returns 403', async () => {
    expect((ERRORS.FORBIDDEN()).status).toBe(403)
  })

  it('TC-1.6.6: ERRORS.NOT_FOUND() returns 404', async () => {
    expect((ERRORS.NOT_FOUND('Announcement')).status).toBe(404)
  })

  it('TC-1.6.7: ERRORS.RATE_LIMITED() returns 429', async () => {
    expect((ERRORS.RATE_LIMITED()).status).toBe(429)
  })

  it('TC-1.6.8: ERRORS.INTERNAL() returns 500 and never leaks stack trace', async () => {
    const res = ERRORS.INTERNAL()
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(JSON.stringify(json)).not.toContain('at Object.')
  })
})
