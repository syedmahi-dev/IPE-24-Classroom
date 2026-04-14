import { auth } from '@/lib/auth'
import { AdminKnowledgeClient } from './AdminKnowledgeClient'

export const dynamic = 'force-dynamic'

export default async function AdminKnowledgePage() {
  const session = await auth() as any
  const userRole = session?.user?.role || 'student'

  return <AdminKnowledgeClient userRole={userRole} />
}
