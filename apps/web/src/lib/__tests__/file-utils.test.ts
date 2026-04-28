import { describe, it, expect } from 'vitest'
import { sanitizeFilename } from '@/lib/sanitize'

describe('sanitizeFilename', () => {
  it('TC-1.2.1: removes double-dot sequences (path traversal)', () => {
    expect(sanitizeFilename('../../etc/passwd')).not.toContain('..')
  })

  it('TC-1.2.2: removes forward slashes', () => {
    expect(sanitizeFilename('folder/evil.pdf')).not.toContain('/')
  })

  it('TC-1.2.3: removes backslashes', () => {
    expect(sanitizeFilename('folder\\evil.pdf')).not.toContain('\\')
  })

  it('TC-1.2.4: removes null bytes', () => {
    expect(sanitizeFilename('file\x00.pdf')).not.toContain('\x00')
  })

  it('TC-1.2.5: preserves safe filename characters', () => {
    expect(sanitizeFilename('Lecture-Notes_v2.pdf')).toBe('Lecture-Notes_v2.pdf')
  })

  it('TC-1.2.6: truncates filenames longer than 200 chars', () => {
    expect(sanitizeFilename('a'.repeat(300) + '.pdf').length).toBeLessThanOrEqual(200)
  })

  it('TC-1.2.7: replaces spaces with underscores', () => {
    expect(sanitizeFilename('my lecture notes.pdf')).not.toContain(' ')
  })

  it('TC-1.2.8: handles empty string', () => {
    expect(() => sanitizeFilename('')).not.toThrow()
  })

  it('TC-1.2.9: strips unicode control characters', () => {
    expect(sanitizeFilename('file\u202e.pdf')).not.toContain('\u202e')
  })

  it('TC-1.2.10: windows reserved filenames (CON, PRN, AUX) are transformed', () => {
    const result = sanitizeFilename('CON.pdf')
    // Should not produce the exact reserved name
    expect(result).not.toBe('CON.pdf')
  })
})
