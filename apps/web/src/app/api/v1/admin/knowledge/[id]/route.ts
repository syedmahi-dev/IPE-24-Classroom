import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'

/**
 * DELETE /api/v1/admin/knowledge/[id]
 * Delete a knowledge document + cascading chunks, super_admin only
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (session.user.role !== 'super_admin') return ERRORS.FORBIDDEN()

  try {
    const existing = await prisma.knowledgeDocument.findUnique({ where: { id: params.id } })
    if (!existing) return ERRORS.NOT_FOUND('Knowledge document')

    // Chunks cascade via onDelete: Cascade in schema
    await prisma.knowledgeDocument.delete({ where: { id: params.id } })
    await logAudit(session.user.id, 'DELETE', 'knowledge_document', params.id, { title: existing.title })

    return ok({ deleted: true })
  } catch (error) {
    console.error('[Admin Knowledge] DELETE error:', error)
    return ERRORS.INTERNAL()
  }
}
