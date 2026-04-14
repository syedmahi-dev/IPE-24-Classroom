import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { uploadToDrive } from '@/lib/google-drive'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  courseId: z.string().optional(),
  category: z.enum(['lecture_notes', 'assignment', 'past_paper', 'syllabus', 'other']).optional(),
  search: z.string().optional(),
})

/**
 * GET /api/v1/admin/files
 * List all files, admin only
 */
export async function GET(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) return ERRORS.VALIDATION('Invalid query parameters')

    const { page, limit, courseId, category, search } = parsed.data
    const skip = (page - 1) * limit

    const where: any = {
      ...(courseId ? { courseId } : {}),
      ...(category ? { category } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    }

    const [items, total] = await prisma.$transaction([
      prisma.fileUpload.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          course: { select: { id: true, code: true, name: true } },
          uploadedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.fileUpload.count({ where }),
    ])

    return ok(items, { page, limit, total, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('[Admin Files] GET error:', error)
    return ERRORS.INTERNAL()
  }
}

/**
 * POST /api/v1/admin/files
 * Upload a file to Google Drive and create a record, admin only
 * Accepts multipart/form-data with file + metadata
 */
export async function POST(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  if (!['admin', 'super_admin'].includes(session.user.role)) return ERRORS.FORBIDDEN()

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const name = formData.get('name') as string || ''
    const courseId = formData.get('courseId') as string || ''
    const category = formData.get('category') as string || 'other'

    if (!file) return ERRORS.VALIDATION('File is required')
    if (!name.trim()) return ERRORS.VALIDATION('File name is required')

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Google Drive
    const driveResult = await uploadToDrive(buffer, file.name, file.type)

    // Create database record
    const fileRecord = await prisma.fileUpload.create({
      data: {
        name: name.trim(),
        driveId: driveResult.id,
        driveUrl: driveResult.webViewLink,
        downloadUrl: driveResult.webContentLink || null,
        mimeType: file.type,
        sizeBytes: buffer.length,
        category,
        courseId: courseId || null,
        uploadedById: session.user.id,
      },
      include: {
        course: { select: { id: true, code: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    })

    await logAudit(session.user.id, 'CREATE', 'file', fileRecord.id, {
      name: fileRecord.name,
      driveId: driveResult.id,
    })

    return ok(fileRecord)
  } catch (error) {
    console.error('[Admin Files] POST error:', error)
    return ERRORS.INTERNAL()
  }
}
