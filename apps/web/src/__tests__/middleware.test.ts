import { describe, it, expect, vi, beforeEach } from 'vitest'
import { middleware } from '../middleware'
import { NextRequest } from 'next/server'

// Mock next-auth/jwt
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}))

import { getToken } from 'next-auth/jwt'

function createRequest(path: string, headers?: Record<string, string>) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: headers ? new Headers(headers) : undefined,
  })
}

describe('middleware', () => {
  const authCookie = 'authjs.session-token=mock-session'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('public routes', () => {
    it('allows access to / without auth', async () => {
      const res = await middleware(createRequest('/'))
      expect(res.status).toBe(200)
    })

    it('allows access to /login without auth', async () => {
      const res = await middleware(createRequest('/login'))
      expect(res.status).toBe(200)
    })

    it('allows access to /auth/* routes', async () => {
      const res = await middleware(createRequest('/auth/error'))
      expect(res.status).toBe(200)
    })

    it('allows access to /api/v1/health', async () => {
      const res = await middleware(createRequest('/api/v1/health'))
      expect(res.status).toBe(200)
    })

    it('allows access to /api/auth/* (NextAuth routes)', async () => {
      const res = await middleware(createRequest('/api/auth/callback/google'))
      expect(res.status).toBe(200)
    })

    it('allows access to /_next/* (static assets)', async () => {
      const res = await middleware(createRequest('/_next/static/chunk.js'))
      expect(res.status).toBe(200)
    })
  })

  describe('unauthenticated access to protected routes', () => {
    beforeEach(() => {
      ;(getToken as any).mockResolvedValue(null)
    })

    it('redirects to /login for page routes', async () => {
      const res = await middleware(createRequest('/dashboard'))
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/login')
    })

    it('returns 401 JSON for API routes', async () => {
      const res = await middleware(createRequest('/api/v1/announcements'))
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('authenticated access', () => {
    beforeEach(() => {
      ;(getToken as any).mockResolvedValue({ sub: 'user-1', role: 'student' })
    })

    it('allows authenticated users to access protected pages', async () => {
      const res = await middleware(createRequest('/dashboard', { cookie: authCookie }))
      expect(res.status).toBe(200)
    })

    it('allows authenticated users to access API routes', async () => {
      const res = await middleware(createRequest('/api/v1/announcements', { cookie: authCookie }))
      expect(res.status).toBe(200)
    })
  })

  describe('internal routes', () => {
    const INTERNAL_SECRET = 'super-secret-internal'

    beforeEach(() => {
      process.env.INTERNAL_API_SECRET = INTERNAL_SECRET
      ;(getToken as any).mockResolvedValue({ sub: 'service-account' })
    })

    it('blocks internal routes without correct secret', async () => {
      const res = await middleware(createRequest('/api/v1/internal/sync', {
        'x-internal-secret': 'wrong-secret',
        cookie: authCookie,
      }))
      expect(res.status).toBe(401)
    })

    it('allows internal routes with correct secret', async () => {
      const res = await middleware(createRequest('/api/v1/internal/sync', {
        'x-internal-secret': INTERNAL_SECRET,
        cookie: authCookie,
      }))
      expect(res.status).toBe(200)
    })

    it('blocks internal routes with missing secret header', async () => {
      const res = await middleware(createRequest('/api/v1/internal/sync', { cookie: authCookie }))
      expect(res.status).toBe(401)
    })
  })
})
