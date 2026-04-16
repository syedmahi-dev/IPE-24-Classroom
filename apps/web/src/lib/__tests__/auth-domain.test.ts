import { describe, it, expect, vi, beforeEach } from 'vitest'

// Helper function to simulate the logic in auth.ts
function checkDomain(email: string, allowedDomain: string, superAdminEmail: string): boolean | string {
  const normalizedEmail = email.toLowerCase()
  if (normalizedEmail && !normalizedEmail.endsWith(`@${allowedDomain}`)) {
    if (normalizedEmail !== superAdminEmail.toLowerCase()) {
      return '/auth/error?reason=domain'
    }
  }
  return true
}

describe('Auth Domain Restriction', () => {
  const ALLOWED_DOMAIN = 'iut-dhaka.edu'
  const SUPER_ADMIN = 'mahi@google.com'

  it('should allow emails from the restricted domain', () => {
    expect(checkDomain('test@iut-dhaka.edu', ALLOWED_DOMAIN, SUPER_ADMIN)).toBe(true)
    expect(checkDomain('STUDENT@IUT-DHAKA.EDU', ALLOWED_DOMAIN, SUPER_ADMIN)).toBe(true)
  })

  it('should reject emails from other domains', () => {
    expect(checkDomain('test@gmail.com', ALLOWED_DOMAIN, SUPER_ADMIN)).toBe('/auth/error?reason=domain')
    expect(checkDomain('hacker@evil.com', ALLOWED_DOMAIN, SUPER_ADMIN)).toBe('/auth/error?reason=domain')
  })

  it('should allow the super admin email even if on a different domain', () => {
    expect(checkDomain(SUPER_ADMIN, ALLOWED_DOMAIN, SUPER_ADMIN)).toBe(true)
    // Case sensitivity check
    expect(checkDomain(SUPER_ADMIN.toUpperCase(), ALLOWED_DOMAIN, SUPER_ADMIN)).toBe(true)
  })
})
