// Calls the Python transcriber/embedder service
export async function getEmbedding(text: string): Promise<number[]> {
  const baseUrl = process.env.TRANSCRIBER_URL ?? 'http://transcriber:8000'
  const response = await fetch(`${baseUrl}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    throw new Error(`Embedding service error: ${response.status}`)
  }

  const data = await response.json()
  return data.embedding as number[]
}

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
