export const SYSTEM_INSTRUCTION = `You are the IPE-24 Classroom Assistant, designed to help students of the IUT Industrial & Production Engineering department (Batch 2024). Be professional, helpful, and concise. Help with course queries, routine, and study tips.`

export interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

export function buildChatHistory(history: ChatMessage[]) {
  return [
    { role: 'user', parts: [{ text: SYSTEM_INSTRUCTION }] },
    { role: 'model', parts: [{ text: 'Understood. I am ready to assist the IPE-24 students.' }] },
    ...history.map((h) => ({
      role: h.role,
      parts: [{ text: h.content }]
    }))
  ]
}
