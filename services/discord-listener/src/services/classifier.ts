import { GoogleGenerativeAI } from '@google/generative-ai'
import { getConfig, AnnouncementType } from '../config'
import { logger } from '../lib/logger'

export interface ClassificationResult {
  type: AnnouncementType
  title: string
  body: string
  urgency: 'low' | 'medium' | 'high'
  fileCategory: 'lecture_notes' | 'assignment' | 'past_paper' | 'syllabus' | 'other'
  detectedCourseCode: string | null
}

const CLASSIFY_PROMPT = `You are an intelligent assistant for a Bangladeshi university class CR (Class Representative) bot.
Analyze the following Discord message from a class group and respond with ONLY a JSON object — no markdown, no explanation.

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

PRIORITY RULE: If the message is both "urgent" AND fits a specific category (exam/routine_update/course_update), prefer the specific category and set urgency to "high" instead. Only use type "urgent" for truly uncategorizable critical notices.

Step 3 — EXTRACT COURSE CODE:
Look for patterns like: IPE4208, IPE 4208, ME4226, CHEM 4215, MATH4211, EEE4282, HUM4212, PHY4214
Return in uppercase without spaces (e.g. IPE4208). Return null if none found.

Step 4 — GENERATE TITLE AND BODY:
- title: Max 60 chars. Concise, informative. Do NOT include the course code in the title.
- body: Clean up the message. Fix grammar, remove excessive emojis and slang, preserve all important information (dates, times, room numbers, deadlines). Keep in formal English. If the original is in Bangla or Banglish, translate the key information to English.

Respond with this exact JSON structure:
{
  "type": "general|exam|file_update|routine_update|urgent|event|course_update",
  "title": "short title (max 60 chars)",
  "body": "clean formatted announcement body",
  "urgency": "low|medium|high",
  "fileCategory": "lecture_notes|assignment|past_paper|syllabus|other",
  "detectedCourseCode": "IPE4208 or null"
}

- fileCategory: only relevant if files are attached. lecture_notes (slides, class notes), assignment (homework, lab reports), past_paper (previous exams, question banks), syllabus (course outline), other. Default "other" if no files.`

export async function classifyMessage(
  text: string,
  attachmentNames: string[] = []
): Promise<ClassificationResult> {
  const genAI = new GoogleGenerativeAI(getConfig().GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { temperature: 0.1, maxOutputTokens: 700 },
  })

  const fileContext = attachmentNames.length > 0
    ? `Attached files: ${attachmentNames.join(', ')}`
    : 'No files attached.'

  const prompt = CLASSIFY_PROMPT
    .replace('{MESSAGE}', text.slice(0, 2000))
    .replace('{FILE_CONTEXT}', fileContext)

  try {
    const result = await model.generateContent(prompt)
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

    return {
      type: finalType,
      title: String(parsed.title).slice(0, 60),
      body: String(parsed.body).slice(0, 4000),
      urgency: finalUrgency,
      fileCategory,
      detectedCourseCode,
    }
  } catch (err) {
    logger.warn('classifier', 'Gemini classification failed, using fallback', { error: String(err) })
    // Fallback: use raw message as body, general type
    return {
      type: 'general',
      title: text.split(/[.\n]/)[0].slice(0, 60) || 'Class Announcement',
      body: text.slice(0, 4000),
      urgency: 'medium',
      fileCategory: 'other',
      detectedCourseCode: null,
    }
  }
}
