import { AdminCoursesClient } from './AdminCoursesClient'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Course Management | IPE-24 Cloud Native Infra',
}

export default async function AdminCoursesPage() {
  const session: any = await auth()
  if (!session?.user || !['admin', 'super_admin'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  return <AdminCoursesClient />
}
