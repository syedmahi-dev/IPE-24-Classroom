import { auth } from '@/lib/auth'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { prisma } from '@/lib/prisma'
import { getUnreadCount } from '@/actions/notifications'

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
    <div className="flex h-screen overflow-hidden bg-transparent">
      <Sidebar role={session.user.role} />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <TopBar user={session.user} unreadCount={unreadCount} />
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-8 animate-fade-in z-10 relative">
          {children}
        </main>
      </div>
    </div>
  )
}
