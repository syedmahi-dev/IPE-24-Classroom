export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'System Settings | IPE-24 Cloud Native Infra',
}

export default async function AdminSettingsPage() {
  redirect('/settings')
}
