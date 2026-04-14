import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { prisma } from '@/lib/prisma'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session: any = await auth()
  if (!session) redirect('/login')

  // Prevent stale JWT role issue by syncing with database state
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  })
  if (dbUser && dbUser.role !== session.user.role) {
    session.user.role = dbUser.role
  }

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <Sidebar role={session.user.role} />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <TopBar user={session.user} />
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-8 animate-fade-in z-10 relative">
          {children}
        </main>
      </div>
    </div>
  )
}
