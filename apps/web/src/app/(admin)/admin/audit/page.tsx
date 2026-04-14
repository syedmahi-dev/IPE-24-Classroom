import { auth } from '@/lib/auth'
import { AdminAuditLogClient } from './AdminAuditLogClient'

export const dynamic = 'force-dynamic'

export default async function AdminAuditLogPage() {
  const session = await auth() as any
  const userRole = session?.user?.role || 'student'

  return <AdminAuditLogClient userRole={userRole} />
}
