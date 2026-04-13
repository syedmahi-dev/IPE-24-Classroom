import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = ['p', 'b', 'i', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'br', 'h3', 'h4', 'blockquote']
const ALLOWED_ATTR = ['href']

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS, ALLOWED_ATTR })
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/\.\./g, '') // Remove path traversal
    .replace(/[\/\\]/g, '') // Remove slashes
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Only safe chars
    .slice(0, 200) // Max length
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}
