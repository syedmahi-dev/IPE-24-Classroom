import { prisma } from '@/lib/prisma'
import { AdminAnnouncementsClient } from './AdminAnnouncementsClient'

export const dynamic = 'force-dynamic'

export default async function AdminAnnouncementsPage() {
  const courses = await prisma.course.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: 'asc' },
  })

  return <AdminAnnouncementsClient courses={courses} />
}
