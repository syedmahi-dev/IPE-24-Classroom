import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session: any = await auth()
  if (!session) redirect('/login')

  const dbUser = await import('@/lib/prisma').then(m => m.prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  }))
  if (dbUser && dbUser.role !== session.user.role) {
    session.user.role = dbUser.role
  }

  // Only admin (and super_admin) can access admin routes
  if (!['admin', 'super_admin'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <Sidebar role={session.user.role} />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <TopBar user={session.user} />
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
