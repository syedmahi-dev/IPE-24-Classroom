import { prisma } from './prisma'

export async function logAudit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetType,
        targetId,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        createdAt: new Date(),
      },
    })
  } catch (error) {
    // Audit log failures should not break the main operation
    console.error('Audit log write failed:', error)
  }
}
