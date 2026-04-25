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

const CLASSIFY_PROMPT = `You are an assistant for a university class CR (Class Representative).
Analyze the following Discord message and respond with ONLY a JSON object — no markdown, no explanation.

Message: "{MESSAGE}"

{FILE_CONTEXT}

Respond with this exact JSON structure:
{
  "type": "general|exam|file_update|routine_update|urgent|event|course_update",
  "title": "short title (max 60 chars)",
  "body": "clean formatted message body — preserve important details, clean up casual language",
  "urgency": "low|medium|high",
  "fileCategory": "lecture_notes|assignment|past_paper|syllabus|other",
  "detectedCourseCode": "IPE4208" or null
}

Rules:
- type "exam" = any mention of tests, quizzes, assessments, exam schedules, viva, CT (class test)
- type "routine_update" = class schedule changes, room changes, time changes, class cancellations, makeup classes
- type "file_update" = notes, slides, documents, resources shared
- type "urgent" = anything time-critical with less than 24 hours notice
- type "event" = meetings, trips, workshops, optional gatherings
- type "course_update" = any general update related to a specific course that does NOT fit exam/file/routine (e.g. course syllabus changes, teacher info, course policy, marks update, grade release, assignment deadline reminders, lab instructions)
- type "general" = everything else not related to a specific course
- fileCategory: if attachments are present, classify them as lecture_notes (slides, notes, lectures), assignment (homework, lab reports, assignments), past_paper (previous question papers, exam papers), syllabus (course syllabus, outline), or other. Default to "other" if no attachments.
- detectedCourseCode: if the message mentions a specific course code (e.g. IPE4208, PHY4214, ME4226, EEE4282, CHEM4215, MATH4211, HUM4212), extract it in uppercase with space removed (e.g. IPE4208). Return null if no course code is mentioned.`

export async function classifyMessage(
  text: string,
  attachmentNames: string[] = []
): Promise<ClassificationResult> {
  const genAI = new GoogleGenerativeAI(getConfig().GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
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
      detectedCourseCode = parsed.detectedCourseCode.toUpperCase().trim()
    }

    const VALID_TYPES = ['general','exam','file_update','routine_update','urgent','event','course_update']
    return {
      type: (VALID_TYPES.includes(parsed.type)
        ? parsed.type
        : 'general') as AnnouncementType,
      title: String(parsed.title).slice(0, 60),
      body: String(parsed.body).slice(0, 4000),
      urgency: (['low','medium','high'].includes(parsed.urgency) ? parsed.urgency : 'medium') as 'low'|'medium'|'high',
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
