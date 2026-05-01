export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { FileCategory } from '@prisma/client'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { notifyAll } from '@/lib/notifications'
import { uploadToDrive } from '@/lib/google-drive'
import { z } from 'zod'
import { NextResponse } from 'next/server'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  courseId: z.string().optional(),
  category: z.enum(['lecture_notes', 'assignment', 'past_paper', 'syllabus', 'other']).optional(),
  source: z.enum(['all', 'bot', 'discord', 'telegram', 'web']).default('all'),
  search: z.string().optional(),
})

/**
 * GET /api/v1/admin/files
 * List all files, admin only
 */
export async function GET(req: Request) {
  const session = await auth() as any
  if (!session?.user) return ERRORS.UNAUTHORIZED()
  
  let role = session.user.role
  if (!['admin', 'super_admin'].includes(role)) {
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (dbUser) role = dbUser.role
  }

  if (!['admin', 'super_admin'].includes(role)) return ERRORS.FORBIDDEN()

  try {
    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) return ERRORS.VALIDATION('Invalid query parameters')

    const { page, limit, courseId, category, source, search } = parsed.data
    const skip = (page - 1) * limit

    let filteredIdsBySource: string[] | null = null
    if (source !== 'all') {
      const sourceLogs = await prisma.auditLog.findMany({
        where: {
          targetType: 'file',
          ...(source === 'bot'
            ? {
                OR: [
                  { metadata: { path: ['source'], equals: 'discord' } },
                  { metadata: { path: ['source'], equals: 'telegram' } },
                ],
              }
            : source === 'web'
              ? {
                  NOT: [
                    { metadata: { path: ['source'], equals: 'discord' } },
                    { metadata: { path: ['source'], equals: 'telegram' } },
                  ],
                }
              : { metadata: { path: ['source'], equals: source } }),
        },
        select: { targetId: true },
      })

      filteredIdsBySource = Array.from(new Set(sourceLogs.map((l) => l.targetId))).filter(Boolean)
      if (filteredIdsBySource.length === 0) {
        return ok([], { page, limit, total: 0, totalPages: 0 })
      }
    }

    const where: any = {
      ...(filteredIdsBySource ? { id: { in: filteredIdsBySource } } : {}),
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

    const itemIds = items.map((item) => item.id)
    const itemAuditLogs = itemIds.length > 0
      ? await prisma.auditLog.findMany({
          where: {
            targetType: 'file',
            targetId: { in: itemIds },
          },
          select: { targetId: true, metadata: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        })
      : []

    const sourceByTargetId = new Map<string, 'discord' | 'telegram' | 'web'>()
    for (const log of itemAuditLogs) {
      if (sourceByTargetId.has(log.targetId)) continue
      const sourceValue = (log.metadata as any)?.source
      if (sourceValue === 'discord' || sourceValue === 'telegram' || sourceValue === 'web') {
        sourceByTargetId.set(log.targetId, sourceValue)
      } else {
        sourceByTargetId.set(log.targetId, 'web')
      }
    }

    const enrichedItems = items.map((item) => ({
      ...item,
      uploadSource: sourceByTargetId.get(item.id) ?? 'web',
    }))

    return ok(enrichedItems, { page, limit, total, totalPages: Math.ceil(total / limit) })
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

  let role = session.user.role
  if (!['admin', 'super_admin'].includes(role)) {
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (dbUser) role = dbUser.role
  }

  if (!['admin', 'super_admin'].includes(role)) return ERRORS.FORBIDDEN()

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const name = formData.get('name') as string || ''
    const courseId = formData.get('courseId') as string || ''
    const category = formData.get('category') as string || 'other'
    const connectedDriveId = formData.get('connectedDriveId') as string || ''

    if (!file) return ERRORS.VALIDATION('File is required')
    if (!name.trim()) return ERRORS.VALIDATION('File name is required')

    let targetDriveToken: string | undefined = undefined;
    if (connectedDriveId) {
      const drive = await prisma.connectedDrive.findUnique({ where: { id: connectedDriveId } });
      if (drive) targetDriveToken = drive.refreshToken;
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const sizeBytes = buffer.length;
    const THRESHOLD = 300 * 1024 * 1024;
    const makePublic = sizeBytes > THRESHOLD;

    // Upload to Google Drive (with optional override token & visibility flag)
    const driveResult = await uploadToDrive(buffer, file.name, file.type, targetDriveToken, makePublic)

    // Create database record
    const fileRecord = await prisma.fileUpload.create({
      data: {
        name: name.trim(),
        driveId: driveResult.id,
        driveUrl: driveResult.webViewLink,
        downloadUrl: driveResult.webContentLink || null,
        mimeType: file.type,
        sizeBytes: sizeBytes,
        category: category as FileCategory,
        courseId: courseId || null,
        uploadedById: session.user.id,
        connectedDriveId: connectedDriveId || null,
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

    // Persist notification records + push broadcast (non-blocking)
    const categoryLabel: Record<string, string> = {
      lecture_notes: 'Lecture Note',
      assignment: 'Assignment',
      past_paper: 'Past Paper',
      syllabus: 'Syllabus',
      other: 'File',
    }
    const label = categoryLabel[category] ?? 'File'
    const courseInfo = fileRecord.course ? ` for ${fileRecord.course.code}` : ''
    notifyAll({
      title: `New ${label} Uploaded`,
      body: `${name.trim()}${courseInfo}`,
      link: '/resources',
    }).catch((err) => console.error('[Notify] File broadcast failed:', err))

    return ok(fileRecord)
  } catch (error: any) {
    console.error('API ERROR [POST /api/v1/admin/files]:', error);
    
    // Check if it's a Drive API error
    if (error.response?.data?.error) {
       console.error('GOOGLE DRIVE ERROR DETAIL:', JSON.stringify(error.response.data.error, null, 2));
    }

    return NextResponse.json(
      { error: error.message || 'Something went wrong while uploading the file' },
      { status: 500 }
    );
  }
}
