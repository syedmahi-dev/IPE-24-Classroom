import { prisma } from '@/lib/prisma'
import { AdminExamsClient } from './AdminExamsClient'

export const dynamic = 'force-dynamic'

export default async function AdminExamsPage() {
  const courses = await prisma.course.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: 'asc' },
  })

  return <AdminExamsClient courses={courses} />
}
