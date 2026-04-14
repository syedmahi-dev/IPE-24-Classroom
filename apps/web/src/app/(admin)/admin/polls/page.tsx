import { auth } from '@/lib/auth'
import { AdminPollsClient } from './AdminPollsClient'

export const dynamic = 'force-dynamic'

export default async function AdminPollsPage() {
  const session = await auth() as any
  const userRole = session?.user?.role || 'student'

  return <AdminPollsClient userRole={userRole} />
}
