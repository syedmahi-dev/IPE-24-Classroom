/**
 * virtual-cr-context.ts
 *
 * READ-ONLY live context builder for Virtual CR.
 * Pulls fresh data from the main database to supplement RAG vector search.
 * NEVER writes to any table — read only.
 */

import { prisma } from './prisma'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LiveContext {
  todayRoutine: string
  upcomingExams: string
  recentAnnouncements: string
  courseCatalog: string
  availableFiles: string
  routineOverrides: string
  discordHistory: string
  timestamp: string
}

// ── Day helpers ───────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

function getBangladeshDay(): string {
  const now = new Date()
  // Bangladesh is UTC+6
  const bdTime = new Date(now.getTime() + (6 * 60 + now.getTimezoneOffset()) * 60_000)
  return DAY_NAMES[bdTime.getDay()]
}

function getBangladeshDate(): Date {
  const now = new Date()
  return new Date(now.getTime() + (6 * 60 + now.getTimezoneOffset()) * 60_000)
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Fetch functions (all READ-ONLY) ───────────────────────────────────────────

async function fetchTodayRoutine(): Promise<string> {
  const today = getBangladeshDay()

  const classes = await prisma.baseRoutine.findMany({
    where: { dayOfWeek: today, archivedAt: null },
    orderBy: { startTime: 'asc' },
  })

  if (classes.length === 0) {
    return `TODAY'S CLASSES (${today}):\nNo classes scheduled today.`
  }

  let text = `TODAY'S CLASSES (${today}):\n`
  for (const cls of classes) {
    const group = cls.targetGroup !== 'ALL' ? ` [${cls.targetGroup}]` : ''
    const lab = cls.isLab ? ' [LAB]' : ''
    text += `• ${cls.startTime}–${cls.endTime} | ${cls.courseCode}${cls.courseName ? ' ' + cls.courseName : ''} | Room ${cls.room}${group}${lab}${cls.teacher ? ' | ' + cls.teacher : ''}\n`
  }
  return text
}

async function fetchRoutineOverrides(): Promise<string> {
  const now = new Date()
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const overrides = await prisma.routineOverride.findMany({
    where: {
      date: { gte: now, lte: twoWeeks },
      archivedAt: null,
    },
    orderBy: { date: 'asc' },
  })

  if (overrides.length === 0) {
    return 'SCHEDULE CHANGES (Next 2 weeks):\nNo changes announced.'
  }

  let text = 'SCHEDULE CHANGES (Next 2 weeks):\n'
  for (const ov of overrides) {
    const dateStr = formatDate(new Date(ov.date))
    text += `• ${dateStr} — ${ov.type.toUpperCase()}: ${ov.courseCode || 'Unknown course'}\n`
    if (ov.room) text += `  Room: ${ov.room}\n`
    if (ov.startTime) text += `  Time: ${ov.startTime}${ov.endTime ? '–' + ov.endTime : ''}\n`
    if (ov.reason) text += `  Reason: ${ov.reason}\n`
  }
  return text
}

async function fetchUpcomingExams(): Promise<string> {
  const now = new Date()
  const fourWeeks = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000)

  const exams = await prisma.exam.findMany({
    where: {
      examDate: { gte: now, lte: fourWeeks },
      isActive: true,
    },
    orderBy: { examDate: 'asc' },
    include: { course: true },
  })

  if (exams.length === 0) {
    return 'UPCOMING EXAMS (Next 4 weeks):\nNo exams scheduled.'
  }

  let text = 'UPCOMING EXAMS (Next 4 weeks):\n'
  for (const exam of exams) {
    const dateStr = formatDate(new Date(exam.examDate))
    text += `• ${exam.title} — ${exam.course.code} ${exam.course.name}\n`
    text += `  Date: ${dateStr}\n`
    if (exam.room) text += `  Room: ${exam.room}\n`
    if (exam.duration) text += `  Duration: ${exam.duration} min\n`
    if (exam.syllabus) text += `  Syllabus: ${exam.syllabus}\n`
  }
  return text
}

async function fetchRecentAnnouncements(): Promise<string> {
  const announcements = await prisma.announcement.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    take: 15,
    include: { author: { select: { name: true } } },
  })

  if (announcements.length === 0) {
    return 'RECENT ANNOUNCEMENTS:\nNo recent announcements.'
  }

  let text = 'RECENT ANNOUNCEMENTS:\n'
  for (const a of announcements) {
    const dateStr = a.publishedAt ? formatDate(new Date(a.publishedAt)) : 'Unknown date'
    const source = a.source ? ` (via ${a.source})` : ''
    text += `• [${a.type.toUpperCase()}] ${a.title}${source}\n`
    text += `  ${dateStr} | by ${a.author.name}\n`
    // Truncate long bodies for context efficiency
    const body = a.body.length > 300 ? a.body.slice(0, 300) + '…' : a.body
    text += `  ${body.replace(/\n/g, ' ')}\n`
  }
  return text
}

async function fetchCourseCatalog(): Promise<string> {
  const courses = await prisma.course.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
  })

  if (courses.length === 0) {
    return 'COURSE CATALOG:\nNo active courses.'
  }

  let text = 'COURSE CATALOG:\n'
  for (const c of courses) {
    text += `• ${c.code} — ${c.name} (${c.creditHours} credits)${c.teacherName ? ' | Teacher: ' + c.teacherName : ''}\n`
  }
  return text
}

async function fetchAvailableFiles(): Promise<string> {
  const files = await prisma.fileUpload.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { course: { select: { code: true, name: true } } },
  })

  if (files.length === 0) {
    return 'CLASS FILES & RESOURCES:\nNo files uploaded yet.'
  }

  let text = 'CLASS FILES & RESOURCES:\n'
  for (const f of files) {
    const courseLabel = f.course ? `${f.course.code}` : 'General'
    text += `• ${f.name} [${courseLabel}] — ${f.category}\n`
    text += `  Drive: ${f.driveUrl}\n`
  }
  return text
}

async function fetchDiscordHistory(): Promise<string> {
  // Fetch all Discord-sourced knowledge documents (past Discord chats/messages)
  const discordDocs = await prisma.knowledgeDocument.findMany({
    where: {
      sourceType: { startsWith: 'discord_' },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })

  if (discordDocs.length === 0) {
    return 'DISCORD CHAT HISTORY:\nNo Discord messages ingested yet.'
  }

  let text = `DISCORD CHAT HISTORY (${discordDocs.length} messages):\n`
  for (const doc of discordDocs) {
    const dateStr = doc.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const channel = doc.sourceChannel ? `#${doc.sourceChannel}` : ''
    const type = doc.sourceType.replace('discord_', '').toUpperCase()
    const course = doc.courseCode ? ` [${doc.courseCode}]` : ''
    // Truncate content to keep total token count manageable
    const content = doc.content.length > 400 ? doc.content.slice(0, 400) + '…' : doc.content
    text += `• [${type}]${course} ${doc.title} ${channel} (${dateStr})\n`
    text += `  ${content.replace(/\n/g, ' ')}\n`
  }
  return text
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetches all live context from the main DB (READ-ONLY).
 * Returns formatted text sections for the system prompt.
 * All errors are caught individually — partial context is better than none.
 */
export async function fetchLiveContext(): Promise<LiveContext> {
  const bdDate = getBangladeshDate()

  const [
    todayRoutine,
    routineOverrides,
    upcomingExams,
    recentAnnouncements,
    courseCatalog,
    availableFiles,
    discordHistory,
  ] = await Promise.all([
    fetchTodayRoutine().catch(() => 'TODAY\'S CLASSES:\nUnable to load.'),
    fetchRoutineOverrides().catch(() => 'SCHEDULE CHANGES:\nUnable to load.'),
    fetchUpcomingExams().catch(() => 'UPCOMING EXAMS:\nUnable to load.'),
    fetchRecentAnnouncements().catch(() => 'RECENT ANNOUNCEMENTS:\nUnable to load.'),
    fetchCourseCatalog().catch(() => 'COURSE CATALOG:\nUnable to load.'),
    fetchAvailableFiles().catch(() => 'CLASS FILES:\nUnable to load.'),
    fetchDiscordHistory().catch(() => 'DISCORD HISTORY:\nUnable to load.'),
  ])

  return {
    todayRoutine,
    routineOverrides,
    upcomingExams,
    recentAnnouncements,
    courseCatalog,
    availableFiles,
    discordHistory,
    timestamp: formatDate(bdDate),
  }
}

/**
 * Formats the live context into a single string block for the system prompt.
 */
export function formatLiveContext(ctx: LiveContext): string {
  return [
    ctx.todayRoutine,
    ctx.routineOverrides,
    ctx.upcomingExams,
    ctx.recentAnnouncements,
    ctx.discordHistory,
    ctx.courseCatalog,
    ctx.availableFiles,
  ].join('\n\n')
}
