import { requireInternalSecret } from '@/lib/api-guards'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { NextRequest } from 'next/server'

const bodySchema = z.object({
  name: z.string().min(1).max(500),
  driveId: z.string().min(1),
  driveUrl: z.string().url(),
  downloadUrl: z.string().url().nullable().optional(),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().min(0),
  category: z.enum(['lecture_notes', 'assignment', 'past_paper', 'syllabus', 'other']).default('other'),
  courseCode: z.string().optional(),    // e.g. "IPE4208" — resolved to courseId
  folderLabel: z.string().optional(),   // e.g. "announcements" — for audit trail
  source: z.enum(['discord', 'telegram', 'web']).default('discord'),
})

/**
 * POST /api/v1/internal/files
 * Called by the Discord Listener after uploading a file to Google Drive.
 * Creates a FileUpload record in the DB so students see it in /resources.
 */
export async function POST(req: NextRequest) {
  const { error } = requireInternalSecret(req)
  if (error) return error

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return ERRORS.VALIDATION('Invalid JSON body')
  }

  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) return ERRORS.VALIDATION(parsed.error.message)

  const { name, driveId, driveUrl, downloadUrl, mimeType, sizeBytes, category, courseCode, folderLabel, source } = parsed.data

  // Resolve courseCode → courseId
  let courseId: string | null = null
  if (courseCode) {
    const course = await prisma.course.findUnique({
      where: { code: courseCode.toUpperCase() },
      select: { id: true },
    })
    if (course) {
      courseId = course.id
    }
  }

  // Check for duplicate driveId (idempotency)
  const existing = await prisma.fileUpload.findUnique({ where: { driveId } })
  if (existing) {
    return ok(existing) // Already created — return existing record
  }

  // Get system user for uploadedById
  const authorId = await getSystemUserId()

  const fileRecord = await prisma.fileUpload.create({
    data: {
      name,
      driveId,
      driveUrl,
      downloadUrl: downloadUrl ?? null,
      mimeType,
      sizeBytes,
      category,
      courseId,
      uploadedById: authorId,
    },
    include: {
      course: { select: { id: true, code: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
  })

  await logAudit(authorId, 'CREATE', 'file', fileRecord.id, {
    name,
    driveId,
    source,
    courseCode: courseCode ?? null,
    folderLabel: folderLabel ?? null,
  })

  return ok(fileRecord)
}

// Lazy-loaded system user ID — cached after first call
let _systemUserId: string | null = null
async function getSystemUserId(): Promise<string> {
  if (process.env.SYSTEM_USER_ID) return process.env.SYSTEM_USER_ID
  if (_systemUserId) return _systemUserId

  const admin = await prisma.user.findFirst({
    where: { role: 'super_admin' },
    select: { id: true },
  })
  if (!admin) {
    throw new Error('No super_admin found. Set SYSTEM_USER_ID env var.')
  }
  _systemUserId = admin.id
  return _systemUserId
}
