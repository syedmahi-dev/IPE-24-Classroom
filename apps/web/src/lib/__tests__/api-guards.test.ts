import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('requireRole', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('TC-1.4.1: returns 401 when session is null (no auth)', async () => {
    vi.doMock('@/lib/auth', () => ({ auth: vi.fn().mockResolvedValue(null) }))
    const { requireRole } = await import('@/lib/api-guards')
    const req = new Request('http://localhost/api/v1/admin/announcements') as any
    const { error } = await requireRole(req, 'admin')
    expect(error?.status).toBe(401)
  })

  it('TC-1.4.2: returns 403 when student attempts admin route', async () => {
    vi.doMock('@/lib/auth', () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: '1', role: 'student' } })
    }))
    const { requireRole } = await import('@/lib/api-guards')
    const req = new Request('http://localhost/api/v1/admin/announcements') as any
    const { error } = await requireRole(req, 'admin')
    expect(error?.status).toBe(403)
  })

  it('TC-1.4.3: returns 403 when admin attempts super_admin route', async () => {
    vi.doMock('@/lib/auth', () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: '2', role: 'admin' } })
    }))
    const { requireRole } = await import('@/lib/api-guards')
    const req = new Request('http://localhost/api/v1/admin/users') as any
    const { error } = await requireRole(req, 'super_admin')
    expect(error?.status).toBe(403)
  })

  it('TC-1.4.4: passes when admin requests admin-level route', async () => {
    vi.doMock('@/lib/auth', () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: '3', role: 'admin' } })
    }))
    const { requireRole } = await import('@/lib/api-guards')
    const req = new Request('http://localhost/api/v1/admin/exams') as any
    const { user, error } = await requireRole(req, 'admin')
    expect(error).toBeUndefined()
    expect(user?.role).toBe('admin')
  })

  it('TC-1.4.5: super_admin passes all role requirements', async () => {
    vi.doMock('@/lib/auth', () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: '4', role: 'super_admin' } })
    }))
    const { requireRole } = await import('@/lib/api-guards')
    const req = new Request('http://localhost') as any
    const { error: e1 } = await requireRole(req, 'student')
    const { error: e2 } = await requireRole(req, 'admin')
    const { error: e3 } = await requireRole(req, 'super_admin')
    expect(e1).toBeUndefined()
    expect(e2).toBeUndefined()
    expect(e3).toBeUndefined()
  })
})
