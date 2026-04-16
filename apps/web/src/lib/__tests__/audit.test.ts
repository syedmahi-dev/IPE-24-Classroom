import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logAudit } from '../audit'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('logAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an audit log entry with required fields', async () => {
    ;(prisma.auditLog.create as any).mockResolvedValue({})

    await logAudit('user-1', 'CREATE', 'announcement', 'ann-1')

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'user-1',
        action: 'CREATE',
        targetType: 'announcement',
        targetId: 'ann-1',
        metadata: undefined,
        createdAt: expect.any(Date),
      }),
    })
  })

  it('serializes metadata as JSON string when provided', async () => {
    ;(prisma.auditLog.create as any).mockResolvedValue({})

    await logAudit('user-1', 'UPDATE', 'user', 'user-2', { oldRole: 'student', newRole: 'admin' })

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: JSON.stringify({ oldRole: 'student', newRole: 'admin' }),
      }),
    })
  })

  it('does not throw when prisma create fails (silent failure)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(prisma.auditLog.create as any).mockRejectedValue(new Error('DB connection lost'))

    await expect(logAudit('user-1', 'DELETE', 'file', 'file-1')).resolves.not.toThrow()

    expect(consoleSpy).toHaveBeenCalledWith('Audit log write failed:', expect.any(Error))
    consoleSpy.mockRestore()
  })

  it('passes undefined metadata when not provided', async () => {
    ;(prisma.auditLog.create as any).mockResolvedValue({})

    await logAudit('user-1', 'READ', 'exam', 'exam-1')

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: undefined,
      }),
    })
  })
})
