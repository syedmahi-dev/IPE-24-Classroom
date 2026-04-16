import { describe, it, expect } from 'vitest'
import { sanitizeHtml, sanitizeFilename, stripHtml } from '../sanitize'

describe('sanitizeHtml', () => {
  it('should allow permitted tags', () => {
    const dirty = '<p>Hello <b>bold</b> <a href="http://test.com">link</a></p>'
    expect(sanitizeHtml(dirty)).toBe(dirty)
  })

  it('should remove scripts', () => {
    const dirty = '<p>Hello<script>alert(1)</script></p>'
    expect(sanitizeHtml(dirty)).toBe('<p>Hello</p>')
  })

  it('should remove restricted attributes', () => {
    const dirty = '<p onclick="alert(1)">Hello</p>'
    expect(sanitizeHtml(dirty)).toBe('<p>Hello</p>')
  })

  it('should handle malformed HTML', () => {
    const dirty = '<p>Hello <b>unclosed'
    expect(sanitizeHtml(dirty)).toBe('<p>Hello <b>unclosed</b></p>')
  })
})

describe('sanitizeFilename', () => {
  it('should remove path traversal', () => {
    expect(sanitizeFilename('../../../etc/passwd')).toBe('etcpasswd')
  })

  it('should remove forward and backward slashes', () => {
    expect(sanitizeFilename('folder/sub\\file.txt')).toBe('foldersubfile.txt')
  })

  it('should replace unsafe characters with underscores', () => {
    expect(sanitizeFilename('my file!@#.txt')).toBe('my_file___.txt')
  })

  it('should respect max length of 200', () => {
    const longName = 'a'.repeat(300) + '.txt'
    expect(sanitizeFilename(longName).length).toBe(200)
  })

  it('should allow dashes and dots', () => {
    expect(sanitizeFilename('my-report.v1.pdf')).toBe('my-report.v1.pdf')
  })
})

describe('stripHtml', () => {
  it('should remove all tags', () => {
    const html = '<div>Hello <b>World</b></div>'
    expect(stripHtml(html)).toBe('Hello World')
  })

  it('should trim whitespace', () => {
    const html = '   <p>Text</p>   '
    expect(stripHtml(html)).toBe('Text')
  })
})
