import { GoogleGenerativeAI } from '@google/generative-ai'
import { getConfig, AnnouncementType } from '../config'
import { logger } from '../lib/logger'

export interface RoutineOverrideExtract {
  type: 'CANCELLED' | 'MAKEUP' | 'ROOM_CHANGE' | 'TIME_CHANGE'
  date: string           // YYYY-MM-DD
  courseCode: string      // e.g. "CHEM4215"
  courseName?: string
  startTime?: string     // HH:mm
  endTime?: string       // HH:mm
  room?: string
  teacher?: string
  targetGroup?: 'ALL' | 'ODD' | 'EVEN'
  reason?: string
}

export interface ClassificationResult {
  type: AnnouncementType
  title: string
  body: string
  urgency: 'low' | 'medium' | 'high'
  fileCategory: 'lecture_notes' | 'assignment' | 'past_paper' | 'syllabus' | 'other'
  detectedCourseCode: string | null
  overrides: RoutineOverrideExtract[]
}

export interface ImageInput {
  base64: string
  mimeType: string
}

const CLASSIFY_PROMPT = `You are an intelligent assistant for a Bangladeshi university class CR (Class Representative) bot.
Analyze the following Discord message from a class group and respond with ONLY a JSON object — no markdown, no explanation.

If images are provided, carefully read any text visible in the image (OCR). Extract dates, room numbers, course codes, and any other announcement-relevant content from the images.

Today's date: {TODAY}

Message: "{MESSAGE}"

{FILE_CONTEXT}

=== INSTRUCTIONS ===

Step 1 — DETECT TONE AND URGENCY:
Analyze the emotional tone, language, and time-sensitivity of the message.
Urgency signals to look for:
- ALL CAPS words (e.g. "URGENT", "ASAP", "NOW", "TONIGHT")
- Exclamation marks (multiple = higher urgency)
- Time-critical phrases: "aaj raat", "tonight", "tomorrow", "by midnight", "last chance", "do it now", "jaldi", "quickly", "hurry"
- Threatening consequences: "marks deducted", "won't be allowed", "strict action"
- Deadline proximity: mentions of same-day or next-day deadlines
- Pleading or panicked tone: "please please", "everyone must", "don't miss this"

urgency scale:
- "low" = informational, no deadline pressure, calm tone
- "medium" = has a deadline but not immediate, normal tone
- "high" = same-day or next-day deadline, CAPS, exclamation marks, or threatening language

Step 2 — CLASSIFY CATEGORY:
Choose ONE of:
- "urgent" → Use ONLY when urgency is "high" AND the message doesn't fit a more specific category. This is a catch-all for critical messages.
- "exam" → About tests, quizzes, CT (class test), mid-term, final exam, viva, practical exam schedules or postponements
- "file_update" → Notes, slides, PDFs, study materials, lab manuals, books shared
- "routine_update" → Class schedule changes, cancellations, makeup classes, room changes, time shifts
- "course_update" → General update about a specific course: marks released, assignment deadline, course policy change, teacher info, lab instructions
- "event" → Seminars, workshops, club events, optional activities, field trips
- "general" → Anything that does not fit the above categories

PRIORITY RULE: If the message contains multiple pieces of information (e.g., a general note AND a class time shift), ALWAYS prioritize the most critical category (e.g., 'routine_update', 'exam', or 'urgent') over 'general'. Never use 'general' if ANY part of the message fits a specific category.

Step 3 — EXTRACT COURSE CODE:
Look for patterns like: IPE4208, IPE 4208, ME4226, CHEM 4215, MATH4211, EEE4282, HUM4212, PHY4214
Return in uppercase without spaces (e.g. IPE4208). Return null if none found.

Step 4 — GENERATE TITLE AND BODY:
- title: Max 60 chars. MUST be highly specific, punchy, and highlight the exact core action or event (e.g., 'HUM HW & Chemistry Lab Time Change' instead of 'Update on Next Week Classes'). Avoid generic titles like 'Class Announcement' or 'Update'. Do NOT include the course code in the title.
- body: Clean up the message. Fix grammar, remove excessive emojis and slang, preserve all important information (dates, times, room numbers, deadlines). Keep in formal English. If the original is in Bangla or Banglish, translate the key information to English.

Step 5 — EXTRACT ROUTINE OVERRIDES:
If the message mentions ANY schedule change, extract ALL of them as an "overrides" array. This includes:
- Class cancellations ("no class", "cancelled", "class bondho", "off")
- Room changes ("shifted to room X", "room changed")
- Time changes ("class at 2pm instead of 10am", "time shifted")
- Makeup classes ("extra class", "makeup class", "additional class")

For EACH override:
- "type": CANCELLED | MAKEUP | ROOM_CHANGE | TIME_CHANGE
- "date": YYYY-MM-DD — resolve relative dates using today's date ({TODAY}). "tomorrow" = next day, "next Tuesday" = the upcoming Tuesday, etc.
- "courseCode": uppercase, no spaces (e.g. "CHEM4215"). REQUIRED for each override.
- "courseName": full course name if mentioned (optional)
- "startTime": HH:mm format if a new time is mentioned (optional)
- "endTime": HH:mm format (optional)
- "room": new room if it's a room change or makeup (optional)
- "teacher": teacher name if mentioned (optional)
- "targetGroup": ALL | ODD | EVEN — default "ALL" unless the message specifies a lab group
- "reason": short reason (optional)

If there are NO schedule changes, set "overrides" to an empty array [].

Respond with this exact JSON structure:
{
  "type": "general|exam|file_update|routine_update|urgent|event|course_update",
  "title": "short title (max 60 chars)",
  "body": "clean formatted announcement body",
  "urgency": "low|medium|high",
  "fileCategory": "lecture_notes|assignment|past_paper|syllabus|other",
  "detectedCourseCode": "IPE4208 or null",
  "overrides": [
    {
      "type": "CANCELLED",
      "date": "2026-05-12",
      "courseCode": "CHEM4215",
      "reason": "Teacher unavailable",
      "targetGroup": "ALL"
    }
  ]
}

- fileCategory: only relevant if files are attached. lecture_notes (slides, class notes), assignment (homework, lab reports), past_paper (previous exams, question banks), syllabus (course outline), other. Default "other" if no files.
- overrides: ALWAYS include this field. Empty array [] if no schedule changes detected.`

export async function classifyMessage(
  text: string,
  attachmentNames: string[] = [],
  images: ImageInput[] = []
): Promise<ClassificationResult> {
  const genAI = new GoogleGenerativeAI(getConfig().GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    generationConfig: { temperature: 0.1, maxOutputTokens: 1200 },
  })

  const fileContext = attachmentNames.length > 0
    ? `Attached files: ${attachmentNames.join(', ')}`
    : 'No files attached.'

  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  const prompt = CLASSIFY_PROMPT
    .replaceAll('{TODAY}', `${today} (${dayName})`)
    .replace('{MESSAGE}', text.slice(0, 2000))
    .replace('{FILE_CONTEXT}', fileContext)

  const parts: Array<string | { inlineData: { data: string; mimeType: string } }> = [prompt]
  
  for (const img of images) {
    parts.push({
      inlineData: {
        data: img.base64,
        mimeType: img.mimeType
      }
    })
  }

  try {
    const result = await model.generateContent(parts as any)
    const raw = result.response.text().replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(raw)

    // Validate required fields
    if (!parsed.type || !parsed.title || !parsed.body) {
      throw new Error('Missing required classification fields')
    }

    const validFileCategories = ['lecture_notes', 'assignment', 'past_paper', 'syllabus', 'other']
    const fileCategory = validFileCategories.includes(parsed.fileCategory)
      ? parsed.fileCategory
      : 'other'

    // Validate and normalize course code
    let detectedCourseCode: string | null = null
    if (parsed.detectedCourseCode && typeof parsed.detectedCourseCode === 'string') {
      // Normalize: remove spaces, uppercase (e.g. "IPE 4208" → "IPE4208")
      detectedCourseCode = parsed.detectedCourseCode.toUpperCase().replace(/\s+/g, '').trim()
    }

    const VALID_TYPES = ['general', 'exam', 'file_update', 'routine_update', 'urgent', 'event', 'course_update']
    const validUrgency = ['low', 'medium', 'high']

    const finalType = (VALID_TYPES.includes(parsed.type) ? parsed.type : 'general') as AnnouncementType
    const finalUrgency = (validUrgency.includes(parsed.urgency) ? parsed.urgency : 'medium') as 'low' | 'medium' | 'high'

    logger.info('classifier', 'Gemini classification result', {
      type: finalType,
      urgency: finalUrgency,
      detectedCourseCode,
      title: String(parsed.title).slice(0, 60),
    })

    // Parse and validate overrides
    const VALID_OVERRIDE_TYPES = ['CANCELLED', 'MAKEUP', 'ROOM_CHANGE', 'TIME_CHANGE']
    const VALID_GROUPS = ['ALL', 'ODD', 'EVEN']
    const overrides: RoutineOverrideExtract[] = []

    if (Array.isArray(parsed.overrides)) {
      for (const ov of parsed.overrides) {
        if (
          ov &&
          VALID_OVERRIDE_TYPES.includes(ov.type) &&
          typeof ov.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ov.date) &&
          typeof ov.courseCode === 'string' && ov.courseCode.trim()
        ) {
          overrides.push({
            type: ov.type as RoutineOverrideExtract['type'],
            date: ov.date,
            courseCode: ov.courseCode.toUpperCase().replace(/\s+/g, ''),
            courseName: ov.courseName || undefined,
            startTime: ov.startTime || undefined,
            endTime: ov.endTime || undefined,
            room: ov.room || undefined,
            teacher: ov.teacher || undefined,
            targetGroup: VALID_GROUPS.includes(ov.targetGroup) ? ov.targetGroup : 'ALL',
            reason: ov.reason || undefined,
          })
        }
      }
    }

    if (overrides.length > 0) {
      logger.info('classifier', 'Extracted routine overrides', {
        count: overrides.length,
        overrides: overrides.map(o => `${o.type} ${o.courseCode} ${o.date}`),
      })
    }

    return {
      type: finalType,
      title: String(parsed.title).slice(0, 60),
      body: String(parsed.body).slice(0, 4000),
      urgency: finalUrgency,
      fileCategory,
      detectedCourseCode,
      overrides,
    }
  } catch (err) {
    logger.warn('classifier', 'Gemini classification failed, using fallback', { error: String(err) })
    const attachmentBasedTitle = attachmentNames.length > 0
      ? attachmentNames[0].replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim()
      : ''
    const firstLine = text
      .split(/[.\n]/)[0]
      .replace('No text caption was provided', '')
      .trim()

    // Fallback: use raw message as body, general type
    return {
      type: 'general',
      title: (firstLine || attachmentBasedTitle || 'Class Announcement').slice(0, 60),
      body: text.slice(0, 4000),
      urgency: 'medium',
      fileCategory: 'other',
      detectedCourseCode: null,
      overrides: [],
    }
  }
}
