import { describe, it, expect, vi } from 'vitest'
import { requireRole, requireAuth, requireInternalSecret } from '../api-guards'
import { NextRequest } from 'next/server'

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn()
}))

import { auth } from '@/lib/auth'

describe('api-guards', () => {
  describe('requireAuth', () => {
    it('should return 401 response if no session exists', async () => {
      ;(auth as any).mockResolvedValue(null)
      const result = await requireAuth()
      expect(result.error).toBeDefined()
      expect(result.error?.status).toBe(401)
    })

    it('should return user object if valid session exists', async () => {
      const mockUser = { id: 'u1', role: 'student' }
      ;(auth as any).mockResolvedValue({ user: mockUser })
      const result = await requireAuth()
      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeUndefined()
    })
  })

  describe('requireRole', () => {
    const req = new NextRequest('http://localhost/api/test')

    it('should return 401 if not authenticated', async () => {
      ;(auth as any).mockResolvedValue(null)
      const result = await requireRole(req, 'admin')
      expect(result.error?.status).toBe(401)
    })

    it('should return 403 if user has insufficient role (student < admin)', async () => {
      ;(auth as any).mockResolvedValue({ user: { role: 'student' } })
      const result = await requireRole(req, 'admin')
      expect(result.error?.status).toBe(403)
    })

    it('should allow user with exact required role', async () => {
      ;(auth as any).mockResolvedValue({ user: { role: 'admin' } })
      const result = await requireRole(req, 'admin')
      expect(result.user!.role).toBe('admin')
      expect(result.error).toBeUndefined()
    })

    it('should allow super_admin for admin requirement (hierarchy check)', async () => {
      ;(auth as any).mockResolvedValue({ user: { role: 'super_admin' } })
      const result = await requireRole(req, 'admin')
      expect(result.user!.role).toBe('super_admin')
    })
  })

  describe('requireInternalSecret', () => {
    const SECRET = 'test-secret-123'
    
    it('should allow if header matches INTERNAL_API_SECRET', () => {
      process.env.INTERNAL_API_SECRET = SECRET
      const req = new NextRequest('http://localhost', {
        headers: { 'x-internal-secret': SECRET }
      })
      const result = requireInternalSecret(req)
      expect(result.error).toBeUndefined()
    })

    it('should return 401 if header is missing or incorrect', () => {
      process.env.INTERNAL_API_SECRET = SECRET
      const req = new NextRequest('http://localhost', {
        headers: { 'x-internal-secret': 'wrong' }
      })
      const result = requireInternalSecret(req)
      expect(result.error?.status).toBe(401)
    })
  })
})
