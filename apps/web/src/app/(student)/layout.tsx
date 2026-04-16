import { auth } from '@/lib/auth'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUnreadCount } from '@/actions/notifications'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session: any = await auth()
  if (!session) redirect('/login')

  // Fetch role and unread count in parallel instead of sequentially
  const [dbUser, unreadCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    }),
    getUnreadCount(),
  ])

  if (dbUser && dbUser.role !== session.user.role) {
    session.user.role = dbUser.role
  }

  return (
    <DashboardShell role={session.user.role} user={session.user} unreadCount={unreadCount}>
      {children}
    </DashboardShell>
  )
}
