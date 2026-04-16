import { describe, it, expect } from 'vitest'
import { chunkText } from '../knowledge-indexer'

describe('chunkText', () => {
  it('should split text into chunks based on size', () => {
    const text = 'This is a long sentence. '.repeat(50) // roughly 25 * 50 = 1250 chars
    const chunks = chunkText(text)
    
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach(chunk => {
      // Each chunk should be roughly CHUNK_SIZE (500) but might be less due to sentence boundaries
      expect(chunk.length).toBeLessThanOrEqual(550) // Allow some buffer for sentence completion
    })
  })

  it('should preserve sentence boundaries', () => {
    const text = 'Sentence one. Sentence two. Sentence three. Sentence four.'
    // Small chunk size to force split
    // Note: chunkText has hardcoded CHUNK_SIZE = 500, so we test with longer text
    const longText = 'A very long sentence that exceeds the limit but ends with a period. '.repeat(10)
    const chunks = chunkText(longText)
    
    chunks.forEach(chunk => {
      expect(chunk).toMatch(/[.!?]$/) // Should end with a punctuation
    })
  })

  it('should filter out very small chunks', () => {
    const text = 'This is a long sentence that should be kept. Small.'
    const chunks = chunkText(text)
    
    // 'Small.' is less than 50 chars, so it should be filtered out
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toContain('This is a long sentence')
    expect(chunks[0]).not.toEqual('Small.')
  })

  it('should handle text with no punctuation', () => {
    const text = 'A'.repeat(1000)
    const chunks = chunkText(text)
    
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0].length).toBeGreaterThan(50)
  })
})
