import { describe, it, expect } from 'vitest'
import { ok, err, ERRORS } from '../api-response'

describe('api-response', () => {
  describe('ok()', () => {
    it('should return 200 with success: true and data', async () => {
      const data = { foo: 'bar' }
      const response = ok(data)
      const body = await response.json()
      
      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data).toEqual(data)
      expect(body.error).toBeNull()
    })

    it('should include meta if provided', async () => {
      const meta = { total: 100 }
      const response = ok([], meta)
      const body = await response.json()
      expect(body.meta).toEqual(meta)
    })
  })

  describe('err()', () => {
    it('should return given status and error code/message', async () => {
      const response = err('TEST_ERROR', 'Custom message', 418)
      const body = await response.json()
      
      expect(response.status).toBe(418)
      expect(body.success).toBe(false)
      expect(body.error).toEqual({ code: 'TEST_ERROR', message: 'Custom message' })
    })
  })

  describe('ERRORS', () => {
    it('UNAUTHORIZED should be 401', async () => {
      const res = ERRORS.UNAUTHORIZED()
      expect(res.status).toBe(401)
    })

    it('FORBIDDEN should be 403', async () => {
      const res = ERRORS.FORBIDDEN()
      expect(res.status).toBe(403)
    })

    it('NOT_FOUND should include entity name', async () => {
      const res = ERRORS.NOT_FOUND('Course')
      const body = await res.json()
      expect(res.status).toBe(404)
      expect(body.error.message).toBe('Course not found')
    })
  })
})
