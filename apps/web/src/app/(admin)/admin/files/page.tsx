import { prisma } from '@/lib/prisma'
import { AdminFilesClient } from './AdminFilesClient'

export const dynamic = 'force-dynamic'

export default async function AdminFilesPage() {
  const courses = await prisma.course.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: 'asc' },
  })

  return <AdminFilesClient courses={courses} />
}
