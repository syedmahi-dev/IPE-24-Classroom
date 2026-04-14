import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { SuperAdminClient } from './SuperAdminClient'

export default async function SuperAdminPage() {
  const session = await auth() as any
  if (!session) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  const actualRole = dbUser ? dbUser.role : session.user.role

  if (actualRole !== 'super_admin') {
    // Standard admins get bumped back to the regular admin dashboard
    redirect('/admin')
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }
  })

  return <SuperAdminClient initialUsers={users} />
}
