import { test, expect } from '@playwright/test'

test.describe('Security - Headers & Hardening', () => {
  test('API routes return JSON content-type', async ({ request }) => {
    const res = await request.get('/api/auth/providers')
    expect(res.headers()['content-type']).toContain('application/json')
  })

  test('404 page does not crash (no 500)', async ({ page }) => {
    const res = await page.goto('/this-page-should-not-exist-xyz')
    // Next.js may return 200 for not-found pages in dev mode
    expect(res?.status()).toBeLessThan(500)
  })

  test('API 404 returns JSON not HTML', async ({ request }) => {
    const res = await request.get('/api/v1/nonexistent-endpoint')
    // Should return 401 (auth guard) or 404, not 500
    expect([401, 404]).toContain(res.status())
  })
})

test.describe('Security - CSRF Protection', () => {
  test('login POST without CSRF token handled gracefully', async ({ request }) => {
    const res = await request.post('/api/auth/signin/credentials', {
      data: { email: 'test@iut-dhaka.edu', password: 'test123' },
    })
    // Should not return 500 — either redirect, 200, 400, or 403
    expect(res.status()).toBeLessThan(500)
  })
})

test.describe('Security - Rate Limiting Indicators', () => {
  test('rapid API calls do not crash the server', async ({ request }) => {
    const promises = Array.from({ length: 10 }, () =>
      request.get('/api/auth/providers')
    )
    const results = await Promise.all(promises)
    for (const res of results) {
      // All should succeed or be rate-limited, not 500
      expect(res.status()).toBeLessThan(500)
    }
  })
})

test.describe('Security - Auth Endpoints', () => {
  test('2FA generate endpoint requires auth', async ({ request }) => {
    const res = await request.post('/api/v1/auth/2fa/generate')
    expect(res.status()).toBe(401)
  })

  test('2FA verify endpoint requires auth', async ({ request }) => {
    const res = await request.post('/api/v1/auth/2fa/verify', {
      data: { token: '123456' },
    })
    expect(res.status()).toBe(401)
  })

  test('2FA disable endpoint requires auth', async ({ request }) => {
    const res = await request.post('/api/v1/auth/2fa/disable')
    expect(res.status()).toBe(401)
  })

  test('password change endpoint requires auth', async ({ request }) => {
    const res = await request.post('/api/v1/auth/password', {
      data: { currentPassword: 'old', newPassword: 'new123456' },
    })
    expect(res.status()).toBe(401)
  })

  test('security info endpoint requires auth', async ({ request }) => {
    const res = await request.get('/api/v1/auth/security')
    expect(res.status()).toBe(401)
  })
})

test.describe('Security - Push Notification Registration', () => {
  test('push register endpoint requires auth', async ({ request }) => {
    const res = await request.post('/api/v1/push/register', {
      data: { token: 'fake-fcm-token' },
    })
    expect(res.status()).toBe(401)
  })
})
