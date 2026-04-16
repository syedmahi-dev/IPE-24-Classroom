import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'

const CATEGORY_LABELS: Record<string, string> = {
  lecture_notes: 'Lecture Notes',
  assignment: 'Assignments',
  past_paper: 'Past Papers',
  syllabus: 'Syllabus',
  other: 'Other Documents',
}

/**
 * GET /api/v1/files/folders
 * Returns virtual folders: courses with files + non-course categories with files
 * Each folder has id, name, type ('course' | 'category'), fileCount, latestUpload
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    // 1. Course folders: group files by courseId (non-null)
    const courseFolders = await prisma.fileUpload.groupBy({
      by: ['courseId'],
      where: { courseId: { not: null } },
      _count: { id: true },
      _max: { createdAt: true },
    })

    // Fetch course details for the folders that have files
    const courseIds = courseFolders
      .map((f) => f.courseId)
      .filter((id): id is string => id !== null)

    const courses = courseIds.length > 0
      ? await prisma.course.findMany({
          where: { id: { in: courseIds } },
          select: { id: true, code: true, name: true },
        })
      : []

    const courseMap = new Map(courses.map((c) => [c.id, c]))

    const courseFolderList = courseFolders
      .filter((f) => f.courseId && courseMap.has(f.courseId))
      .map((f) => {
        const course = courseMap.get(f.courseId!)!
        return {
          id: `course:${course.id}`,
          name: `${course.code} — ${course.name}`,
          type: 'course' as const,
          courseId: course.id,
          courseCode: course.code,
          fileCount: f._count.id,
          latestUpload: f._max.createdAt,
        }
      })
      .sort((a, b) => a.courseCode.localeCompare(b.courseCode))

    // 2. Category folders: group files WITHOUT a courseId by category
    const categoryFolders = await prisma.fileUpload.groupBy({
      by: ['category'],
      where: { courseId: null },
      _count: { id: true },
      _max: { createdAt: true },
    })

    const categoryFolderList = categoryFolders
      .map((f) => ({
        id: `category:${f.category}`,
        name: CATEGORY_LABELS[f.category] || f.category,
        type: 'category' as const,
        category: f.category,
        fileCount: f._count.id,
        latestUpload: f._max.createdAt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return ok([...courseFolderList, ...categoryFolderList])
  } catch (error) {
    console.error('[Files/Folders] GET error:', error)
    return ERRORS.INTERNAL()
  }
}
