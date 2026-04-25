import { GoogleGenerativeAI } from '@google/generative-ai'

const globalForGemini = globalThis as unknown as { gemini: GoogleGenerativeAI }

export const gemini =
  globalForGemini.gemini ||
  new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

if (process.env.NODE_ENV !== 'production') globalForGemini.gemini = gemini

export async function categorizeAnnouncement(title: string, body: string) {
  try {
    const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = `
      Analyze the following announcement title and body for a university classroom portal.
      Identify the category of the announcement from the following list:
      - exam: If it's about a mid-term, final, quiz, or any test.
      - file_update: If it's about new materials, slides, or files being uploaded.
      - routine_update: If it's about class timing changes, cancellations, or makeup classes.
      - course_update: If it's a general update about a specific course that doesn't fit into exam, file, or routine.
      - event: If it's about a seminar, workshop, or student activity.
      - urgent: If it's extremely time-sensitive and critical.
      - general: For everything else.

      Also, identify if it's related to any specific courses. If so, extract the course codes (e.g., IPE 4201, MATH 4211).

      Output format (JSON only):
      {
        "category": "...",
        "courseCodes": ["...", "..."]
      }

      Announcement Title: ${title}
      Announcement Body: ${body}
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Clean up response if it contains markdown code blocks
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim()
    return JSON.parse(jsonStr) as { category: string; courseCodes: string[] }
  } catch (err) {
    console.error('[Gemini Categorize] Error:', err)
    return null
  }
}
