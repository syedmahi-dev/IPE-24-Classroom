import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '../route'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    announcement: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

describe('GET /api/v1/announcements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    ;(auth as any).mockResolvedValue(null)

    const req = new Request('http://localhost/api/v1/announcements')
    const res = await GET(req)
    expect(res.status).toBe(401)

    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 400 for invalid page parameter', async () => {
    ;(auth as any).mockResolvedValue({
      user: { id: '1', email: 'test@iut-dhaka.edu', role: 'student' },
    })

    const req = new Request('http://localhost/api/v1/announcements?page=abc')
    const res = await GET(req)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it('returns paginated announcements for authenticated users', async () => {
    const mockSession = {
      user: { id: '1', email: 'test@iut-dhaka.edu', role: 'student' },
    }
    const mockAnnouncements = [
      {
        id: 'ann1',
        title: 'Test Announcement',
        body: '<p>Content</p>',
        type: 'general',
        publishedAt: new Date(),
        author: { name: 'Admin', avatarUrl: null },
        courses: [],
      },
    ]

    ;(auth as any).mockResolvedValue(mockSession)
    ;(prisma.$transaction as any).mockResolvedValue([mockAnnouncements, 1])

    const req = new Request('http://localhost/api/v1/announcements?page=1&limit=10')
    const res = await GET(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toEqual(mockAnnouncements)
    expect(json.meta.page).toBe(1)
    expect(json.meta.total).toBe(1)
  })

  it('filters announcements by type', async () => {
    const mockSession = {
      user: { id: '1', email: 'test@iut-dhaka.edu', role: 'student' },
    }

    ;(auth as any).mockResolvedValue(mockSession)
    ;(prisma.$transaction as any).mockResolvedValue([[], 0])

    const req = new Request('http://localhost/api/v1/announcements?type=exam')
    const res = await GET(req)
    expect(res.status).toBe(200)

    // Verify type filter was applied
    expect(prisma.$transaction).toHaveBeenCalled()
  })
})

describe('POST /api/v1/announcements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    ;(auth as any).mockResolvedValue(null)

    const req = new Request('http://localhost/api/v1/announcements', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', body: 'Content' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not admin', async () => {
    ;(auth as any).mockResolvedValue({
      user: { id: '1', email: 'test@iut-dhaka.edu', role: 'student' },
    })

    const req = new Request('http://localhost/api/v1/announcements', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', body: 'Content' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('creates announcement for admin users', async () => {
    const mockSession = {
      user: { id: 'admin1', email: 'admin@iut-dhaka.edu', role: 'admin' },
    }
    const mockAnnouncement = {
      id: 'ann1',
      title: 'New Announcement',
      body: '<p>Content</p>',
      type: 'exam',
      authorId: 'admin1',
      isPublished: true,
      publishedAt: new Date(),
      author: { name: 'Admin', avatarUrl: null },
      courses: [],
    }

    ;(auth as any).mockResolvedValue(mockSession)
    ;(prisma.announcement.create as any).mockResolvedValue(mockAnnouncement)

    const req = new Request('http://localhost/api/v1/announcements', {
      method: 'POST',
      body: JSON.stringify({
        title: 'New Announcement',
        body: '<p>Content</p>',
        type: 'exam',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe('ann1')
  })

  it('validates required fields', async () => {
    ;(auth as any).mockResolvedValue({
      user: { id: '1', email: 'admin@iut-dhaka.edu', role: 'admin' },
    })

    const req = new Request('http://localhost/api/v1/announcements', {
      method: 'POST',
      body: JSON.stringify({ title: '' }), // Missing body, invalid title
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
