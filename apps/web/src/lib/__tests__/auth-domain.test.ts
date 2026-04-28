import { describe, it, expect } from 'vitest'

// Extract domain-check logic into a testable pure function
function isDomainAllowed(email: string, allowed: string): boolean {
  if (!email || email.includes('\x00')) return false
  return email.toLowerCase().endsWith(`@${allowed}`)
}

describe('Domain restriction', () => {
  const DOMAIN = 'iut-dhaka.edu'

  it('TC-2.1.1: allows valid IUT email', () => {
    expect(isDomainAllowed('student@iut-dhaka.edu', DOMAIN)).toBe(true)
  })

  it('TC-2.1.2: rejects Gmail account', () => {
    expect(isDomainAllowed('student@gmail.com', DOMAIN)).toBe(false)
  })

  it('TC-2.1.3: rejects email with IUT domain as subdomain trick', () => {
    expect(isDomainAllowed('hack@iut-dhaka.edu.evil.com', DOMAIN)).toBe(false)
  })

  it('TC-2.1.4: rejects email with IUT domain prepended (spoofing)', () => {
    expect(isDomainAllowed('iut-dhaka.edu@evil.com', DOMAIN)).toBe(false)
  })

  it('TC-2.1.5: case-insensitive check (uppercase domain)', () => {
    expect(isDomainAllowed('STUDENT@IUT-DHAKA.EDU', DOMAIN)).toBe(true)
  })

  it('TC-2.1.6: rejects empty email', () => {
    expect(isDomainAllowed('', DOMAIN)).toBe(false)
  })

  it('TC-2.1.7: rejects email with no @ symbol', () => {
    expect(isDomainAllowed('notanemail', DOMAIN)).toBe(false)
  })

  it('TC-2.1.8: rejects email with null character injection', () => {
    expect(isDomainAllowed('user\x00@iut-dhaka.edu', DOMAIN)).toBe(false)
  })
})
