export const dynamic = 'force-dynamic';
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Study Groups',
}

export default function StudyGroupsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
