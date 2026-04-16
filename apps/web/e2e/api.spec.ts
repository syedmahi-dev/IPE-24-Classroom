import { test, expect } from '@playwright/test'

test.describe('API - Unauthenticated Access', () => {
  test('GET /api/v1/announcements returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/v1/announcements')
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  test('POST /api/v1/announcements returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/v1/announcements', {
      data: { title: 'Test', body: 'Test body', type: 'general' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/exams returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/v1/exams')
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/polls returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/v1/polls')
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/routine returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/v1/routine')
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/files returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/v1/files')
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/profile returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/v1/profile')
    expect(res.status()).toBe(401)
  })

  test('POST /api/v1/chat returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/v1/chat', {
      data: { message: 'Hello' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/study-groups returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/v1/study-groups')
    expect(res.status()).toBe(401)
  })
})

test.describe('API - Admin Routes Unauthenticated', () => {
  test('GET /api/v1/admin/announcements returns 401', async ({ request }) => {
    const res = await request.get('/api/v1/admin/announcements')
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/admin/exams returns 401', async ({ request }) => {
    const res = await request.get('/api/v1/admin/exams')
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/admin/files returns 401', async ({ request }) => {
    const res = await request.get('/api/v1/admin/files')
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/admin/polls returns 401', async ({ request }) => {
    const res = await request.get('/api/v1/admin/polls')
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/admin/audit-log returns 401', async ({ request }) => {
    const res = await request.get('/api/v1/admin/audit-log')
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/admin/courses returns 401', async ({ request }) => {
    const res = await request.get('/api/v1/admin/courses')
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/admin/knowledge returns 401', async ({ request }) => {
    const res = await request.get('/api/v1/admin/knowledge')
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/admin/routine returns 401', async ({ request }) => {
    const res = await request.get('/api/v1/admin/routine')
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/admin/settings returns 401', async ({ request }) => {
    const res = await request.get('/api/v1/admin/settings')
    expect(res.status()).toBe(401)
  })
})

test.describe('API - Auth Routes', () => {
  test('NextAuth discovery endpoint is accessible', async ({ request }) => {
    const res = await request.get('/api/auth/providers')
    expect(res.status()).toBe(200)
    const body = await res.json()
    // Should have Google and credentials providers
    expect(body).toHaveProperty('google')
    expect(body).toHaveProperty('credentials')
  })

  test('NextAuth CSRF endpoint is accessible', async ({ request }) => {
    const res = await request.get('/api/auth/csrf')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('csrfToken')
  })
})

test.describe('API - Internal Routes', () => {
  test('internal routes reject without secret header', async ({ request }) => {
    const res = await request.get('/api/v1/internal/test', {
      headers: { 'x-internal-secret': 'wrong-secret' },
    })
    // Should be 401 (or 404 if route doesn't exist, but not 200)
    expect([401, 404]).toContain(res.status())
  })
})
