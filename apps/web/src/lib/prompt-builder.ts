import type { SearchResult } from './vector-search'

// ── Guardrail Prompt ──────────────────────────────────────────────────────────

/**
 * Quick classifier to reject off-topic questions before hitting the RAG pipeline.
 * Returns "on_topic" or "off_topic".
 */
export function buildGuardrailPrompt(question: string): string {
  return `You are a strict topic classifier for a university class portal chatbot.

The chatbot ONLY answers questions about:
- Class routine / schedule (which class is when, room numbers, time changes)
- Exam schedules, CT dates, quiz announcements
- Class notes, lecture slides, file locations in Google Drive
- Announcements from the class representative (CR)
- Course information (teacher names, credit hours, course codes)
- Routine overrides (class cancellations, makeup classes, room changes)
- Assignment deadlines
- General class-related FAQs (attendance policy, CR contact, etc.)

The chatbot MUST REFUSE:
- Math problems, physics problems, any homework solving
- Coding/programming help
- General knowledge questions
- Personal advice, relationship advice
- Creative writing, essays
- Translation requests (unless it's about class content)
- Anything not directly related to the class portal

Question: "${question}"

Respond with ONLY one word: "on_topic" or "off_topic". Nothing else.`
}

// ── RAG System Prompt ─────────────────────────────────────────────────────────

/**
 * Build the grounded system prompt with retrieved knowledge chunks.
 * The model ONLY answers from this context — prevents hallucination.
 */
export function buildRAGSystemPrompt(chunks: SearchResult[]): string {
  const contextBlocks = chunks.map((c, i) =>
    `[Source ${i + 1}: ${c.title} (${c.sourceType}${c.courseCode ? ` · ${c.courseCode}` : ''})]\n${c.content}`
  ).join('\n\n---\n\n')
  const now = new Date()
  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Dhaka' // IUT Bangladesh time
  }).format(now)

  return `You are the Virtual CR (Class Representative) of IPE-24 batch at Islamic University of Technology (IUT), Bangladesh. Your role is to help students with questions about their batch's academic affairs.

Today is: ${todayStr}

STRICT RULES:
1. Answer ONLY using the provided CLASS INFORMATION below. Do not use any external knowledge.
2. If the answer is NOT in the provided context, respond EXACTLY: "I don't have that specific information in my knowledge base. Please ask the CR directly or check the class Discord."
3. NEVER solve math problems, write code, explain physics concepts, or answer general knowledge questions — even if asked politely.
4. Be friendly, clear, and concise. Use bullet points for lists.
5. When mentioning files or resources, include the Google Drive link if available.
6. When mentioning schedule changes, mention the source/date of the announcement.
7. If mentioning exam dates or schedules, remind students to verify with the official notice board.
8. Never make up course names, dates, room numbers, or teacher names.
9. Keep responses under 300 words unless the question genuinely requires more detail.

CLASS INFORMATION:
${contextBlocks || 'No relevant documents found for this query.'}

Remember: You are a helpful assistant, not an official source. Always encourage students to verify important information with the CR or official IUT notices.`
}

// ── Chat History Builder (for multi-turn context) ─────────────────────────────

export interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

export function buildChatHistory(history: ChatMessage[]) {
  return history.map((h) => ({
    role: h.role,
    parts: [{ text: h.content }]
  }))
}

// ── Prompt Injection Detection ────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+|the\s+|your\s+)?previous/i,
  /you\s+are\s+now/i,
  /new\s+instructions/i,
  /forget\s+(all|everything|your)/i,
  /system\s*:/i,
  /\[\[.*system.*\]\]/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+(a\s+)?different/i,
  /override\s+(your\s+)?instructions/i,
  /disregard\s+(all\s+|your\s+)?rules/i,
]

/**
 * Check if a question contains prompt injection patterns.
 * Returns true if injection detected.
 */
export function detectPromptInjection(question: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(question))
}
