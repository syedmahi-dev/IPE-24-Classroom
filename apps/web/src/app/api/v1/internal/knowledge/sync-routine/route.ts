export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { indexDocument } from '@/lib/knowledge-indexer'

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || ''

/**
 * POST /api/v1/internal/knowledge/sync-routine
 * 
 * Syncs the current class routine + active overrides into the knowledge base
 * so the chatbot can answer "when is my next Chemistry class?" or "is there class tomorrow?".
 * 
 * Designed to be triggered by a cron job (e.g., Uptime Kuma, daily at midnight).
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!secret || secret !== INTERNAL_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // ── 1. Fetch all active base routines ──
    const routines = await prisma.baseRoutine.findMany({
      where: { archivedAt: null },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    // ── 2. Fetch upcoming overrides (next 30 days) ──
    const now = new Date()
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const overrides = await prisma.routineOverride.findMany({
      where: {
        date: { gte: now, lte: thirtyDaysLater },
        archivedAt: null,
      },
      orderBy: { date: 'asc' },
    })

    // ── 3. Fetch all courses ──
    const courses = await prisma.course.findMany({
      where: { isActive: true },
    })

    // ── 4. Fetch upcoming exams ──
    const exams = await prisma.exam.findMany({
      where: {
        examDate: { gte: now },
        isActive: true,
      },
      orderBy: { examDate: 'asc' },
      include: { course: true },
    })

    // ── 5. Fetch recent file uploads (last 30 files) ──
    const files = await prisma.fileUpload.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { course: true },
    })

    // ── 6. Build knowledge documents ──
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']

    // 6a. Weekly routine document
    let routineText = 'IPE-24 WEEKLY CLASS ROUTINE\n\n'
    for (const day of dayOrder) {
      const dayClasses = routines.filter((r) => r.dayOfWeek === day)
      if (dayClasses.length === 0) continue
      routineText += `${day.toUpperCase()}:\n`
      for (const cls of dayClasses) {
        const group = cls.targetGroup !== 'ALL' ? ` (${cls.targetGroup} group)` : ''
        const lab = cls.isLab ? ' [LAB]' : ''
        routineText += `  ${cls.startTime}-${cls.endTime} | ${cls.courseCode} ${cls.courseName || ''} | Room: ${cls.room}${group}${lab}\n`
      }
      routineText += '\n'
    }

    // 6b. Overrides document
    let overridesText = 'UPCOMING SCHEDULE CHANGES (Next 30 days)\n\n'
    if (overrides.length === 0) {
      overridesText += 'No schedule changes currently announced.\n'
    } else {
      for (const ov of overrides) {
        const dateStr = new Date(ov.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
        overridesText += `${dateStr} — ${ov.type}: ${ov.courseCode || 'Unknown'}\n`
        if (ov.room) overridesText += `  New Room: ${ov.room}\n`
        if (ov.startTime) overridesText += `  New Time: ${ov.startTime}${ov.endTime ? '-' + ov.endTime : ''}\n`
        if (ov.reason) overridesText += `  Reason: ${ov.reason}\n`
        overridesText += '\n'
      }
    }

    // 6c. Courses catalog
    let coursesText = 'IPE-24 COURSE CATALOG\n\n'
    for (const c of courses) {
      coursesText += `${c.code} — ${c.name} (${c.creditHours} credits)\n`
      if (c.teacherName) coursesText += `  Teacher: ${c.teacherName}\n`
      coursesText += '\n'
    }

    // 6d. Exams document
    let examsText = 'UPCOMING EXAMS\n\n'
    if (exams.length === 0) {
      examsText += 'No upcoming exams scheduled.\n'
    } else {
      for (const exam of exams) {
        const dateStr = new Date(exam.examDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
        examsText += `${exam.title} — ${exam.course.code} ${exam.course.name}\n`
        examsText += `  Date: ${dateStr}\n`
        if (exam.room) examsText += `  Room: ${exam.room}\n`
        if (exam.duration) examsText += `  Duration: ${exam.duration} minutes\n`
        if (exam.syllabus) examsText += `  Syllabus: ${exam.syllabus}\n`
        examsText += '\n'
      }
    }

    // 6e. File index document
    let filesText = 'RECENT CLASS FILES & RESOURCES\n\n'
    for (const f of files) {
      const courseLabel = f.course ? `${f.course.code} ${f.course.name}` : 'General'
      filesText += `${f.name} — ${courseLabel}\n`
      filesText += `  Category: ${f.category}\n`
      filesText += `  Google Drive: ${f.driveUrl}\n`
      filesText += '\n'
    }

    // ── 7. Upsert all documents into knowledge base ──
    const docsToSync = [
      { title: 'Weekly Class Routine', content: routineText, sourceType: 'routine_sync', sourceId: 'weekly-routine' },
      { title: 'Schedule Changes & Overrides', content: overridesText, sourceType: 'routine_sync', sourceId: 'overrides' },
      { title: 'Course Catalog', content: coursesText, sourceType: 'routine_sync', sourceId: 'course-catalog' },
      { title: 'Upcoming Exams', content: examsText, sourceType: 'routine_sync', sourceId: 'exams' },
      { title: 'Recent Class Files & Resources', content: filesText, sourceType: 'routine_sync', sourceId: 'file-index' },
    ]

    let totalChunks = 0
    for (const docData of docsToSync) {
      const doc = await prisma.knowledgeDocument.upsert({
        where: {
          sourceType_sourceId: { sourceType: docData.sourceType, sourceId: docData.sourceId },
        },
        create: docData,
        update: {
          title: docData.title,
          content: docData.content,
          updatedAt: new Date(),
        },
      })

      try {
        totalChunks += await indexDocument(doc.id)
      } catch (err) {
        console.error(`[Routine Sync] Failed to index ${docData.sourceId}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        routineEntries: routines.length,
        overrides: overrides.length,
        courses: courses.length,
        exams: exams.length,
        files: files.length,
        totalChunks,
      },
    })
  } catch (error) {
    console.error('[Routine Sync] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
