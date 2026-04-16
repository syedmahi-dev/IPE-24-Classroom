export const dynamic = 'force-dynamic';
import { AdminSettingsClient } from './AdminSettingsClient'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'System Settings | IPE-24 Cloud Native Infra',
}

export default async function AdminSettingsPage() {
  const session: any = await auth()
  if (!session?.user || !['super_admin'].includes(session.user.role)) {
    redirect('/admin')
  }

  return <AdminSettingsClient />
}
