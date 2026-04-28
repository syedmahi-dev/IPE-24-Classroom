import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * Generate a 768-dimensional embedding using Gemini's free text-embedding-004 model.
 * Works from both Vercel and VPS — no self-hosted dependency needed.
 * Free tier: 1,500 requests/min.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-2' })
  const result = await model.embedContent({
    content: { role: 'user', parts: [{ text }] },
    outputDimensionality: 768
  } as any)
  return result.embedding.values
}

/**
 * Calls the self-hosted Python transcriber service for audio transcription.
 * Only available from the VPS Docker network (not from Vercel).
 */
export async function transcribeAudio(audioBase64: string, filename: string): Promise<string> {
  const baseUrl = process.env.TRANSCRIBER_URL ?? 'http://transcriber:8000'
  const response = await fetch(`${baseUrl}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_base64: audioBase64, filename }),
  })

  if (!response.ok) {
    throw new Error(`Transcription service error: ${response.status}`)
  }

  const data = await response.json()
  return data.transcript as string
}
