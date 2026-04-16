import { prisma } from '@/lib/prisma'
import { AdminRoutineClient } from './AdminRoutineClient'

export const dynamic = 'force-dynamic'

export default async function AdminRoutinePage() {
  const courses = await prisma.course.findMany({
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true }
  })
  return <AdminRoutineClient courses={courses} />
}
