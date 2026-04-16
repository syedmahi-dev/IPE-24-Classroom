export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { deleteFromDrive } from '@/lib/google-drive'

/**
 * DELETE /api/v1/admin/files/[id]
 * Delete a file record and remove from Google Drive (own or super_admin)
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const existing = await prisma.fileUpload.findUnique({ where: { id: params.id } })
    if (!existing) return ERRORS.NOT_FOUND('File')

    if (existing.uploadedById !== session.user.id && session.user.role !== 'super_admin') {
      return ERRORS.FORBIDDEN()
    }

    // Delete from Google Drive
    try {
      await deleteFromDrive(existing.driveId)
    } catch (driveError) {
      console.error('[Admin Files] Drive delete failed (continuing):', driveError)
    }

    await prisma.fileUpload.delete({ where: { id: params.id } })
    await logAudit(session.user.id, 'DELETE', 'file', params.id, { name: existing.name })

    return ok({ deleted: true })
  } catch (error) {
    console.error('[Admin Files] DELETE error:', error)
    return ERRORS.INTERNAL()
  }
}
