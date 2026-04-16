export const dynamic = 'force-dynamic';
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Current Routine',
}

export default function RoutineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
