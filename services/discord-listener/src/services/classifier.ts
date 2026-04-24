import { GoogleGenerativeAI } from '@google/generative-ai'
import { getConfig, AnnouncementType } from '../config'
import { logger } from '../lib/logger'

export interface ClassificationResult {
  type: AnnouncementType
  title: string
  body: string
  urgency: 'low' | 'medium' | 'high'
}

const CLASSIFY_PROMPT = `You are an assistant for a university class CR (Class Representative).
Analyze the following Discord message and respond with ONLY a JSON object — no markdown, no explanation.

Message: "{MESSAGE}"

Respond with this exact JSON structure:
{
  "type": "general|exam|file_update|routine_update|urgent|event",
  "title": "short title (max 60 chars)",
  "body": "clean formatted message body — preserve important details, clean up casual language",
  "urgency": "low|medium|high"
}

Rules:
- type "exam" = any mention of tests, quizzes, assessments, exam schedules
- type "routine_update" = class schedule changes, room changes, time changes
- type "file_update" = notes, slides, documents, resources shared
- type "urgent" = anything time-critical with less than 24 hours notice
- type "event" = meetings, trips, workshops, optional gatherings
- type "general" = everything else`

export async function classifyMessage(text: string): Promise<ClassificationResult> {
  const genAI = new GoogleGenerativeAI(getConfig().GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
  })

  const prompt = CLASSIFY_PROMPT.replace('{MESSAGE}', text.slice(0, 2000))

  try {
    const result = await model.generateContent(prompt)
    const raw = result.response.text().replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(raw)

    // Validate required fields
    if (!parsed.type || !parsed.title || !parsed.body) {
      throw new Error('Missing required classification fields')
    }

    return {
      type: (['general','exam','file_update','routine_update','urgent','event'].includes(parsed.type)
        ? parsed.type
        : 'general') as AnnouncementType,
      title: String(parsed.title).slice(0, 60),
      body: String(parsed.body).slice(0, 4000),
      urgency: (['low','medium','high'].includes(parsed.urgency) ? parsed.urgency : 'medium') as 'low'|'medium'|'high',
    }
  } catch (err) {
    logger.warn('classifier', 'Gemini classification failed, using fallback', { error: String(err) })
    // Fallback: use raw message as body, general type
    return {
      type: 'general',
      title: text.split(/[.\n]/)[0].slice(0, 60) || 'Class Announcement',
      body: text.slice(0, 4000),
      urgency: 'medium',
    }
  }
}
