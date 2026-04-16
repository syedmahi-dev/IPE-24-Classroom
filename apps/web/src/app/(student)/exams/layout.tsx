import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Exams Schedule',
}

export default function ExamsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
