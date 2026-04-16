import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getEmbedding, transcribeAudio } from '../embeddings'

describe('Embedding Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn() as any
  })

  it('should return embedding array on success', async () => {
    const mockEmbedding = [0.1, 0.2, 0.3]
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: mockEmbedding }),
    })

    const result = await getEmbedding('test text')
    expect(result).toEqual(mockEmbedding)
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/embed'), expect.any(Object))
  })

  it('should throw error on API failure', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    })

    await expect(getEmbedding('test text')).rejects.toThrow('Embedding service error: 500')
  })
})

describe('Transcription Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn() as any
  })

  it('should return transcript on success', async () => {
    const mockTranscript = 'Hello world'
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ transcript: mockTranscript }),
    })

    const result = await transcribeAudio('base64data', 'audio.mp3')
    expect(result).toBe(mockTranscript)
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/transcribe'), expect.any(Object))
  })

  it('should throw error on API failure', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
    })

    await expect(transcribeAudio('data', 'file.mp3')).rejects.toThrow('Transcription service error: 400')
  })
})
