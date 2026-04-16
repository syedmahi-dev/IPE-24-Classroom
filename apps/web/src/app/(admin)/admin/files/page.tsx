import { prisma } from '@/lib/prisma'
import { AdminFilesClient } from './AdminFilesClient'

export const dynamic = 'force-dynamic'

export default async function AdminFilesPage() {
  const [courses, drives] = await Promise.all([
    prisma.course.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    }),
    prisma.connectedDrive.findMany({
      select: { id: true, label: true, email: true },
      orderBy: { createdAt: 'desc' }
    })
  ])

  return <AdminFilesClient courses={courses} connectedDrives={drives} />
}
