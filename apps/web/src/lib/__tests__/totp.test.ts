import { describe, it, expect, vi } from 'vitest'
import { verifyTOTP, generateTOTPSecret, getTOTPUrl } from '../auth-2fa'
import { authenticator } from 'otplib'

describe('TOTP 2FA Utility', () => {
  it('should generate a secret of correct length', () => {
    const secret = generateTOTPSecret()
    expect(secret).toBeDefined()
    expect(secret.length).toBeGreaterThanOrEqual(16)
  })

  it('should generate a valid keyuri', () => {
    const secret = 'KVKFKRCPNZQUYMLXOVYDSQKJKZDTINRR'
    const url = getTOTPUrl('user@iut-dhaka.edu', 'IPE-24 Classroom', secret)
    
    expect(url).toContain('otpauth://totp/IPE-24%20Classroom:user%40iut-dhaka.edu')
    expect(url).toContain('secret=' + secret)
    expect(url).toContain('issuer=IPE-24%20Classroom')
  })

  it('should verify a correct token', () => {
    const secret = authenticator.generateSecret()
    const token = authenticator.generate(secret)
    
    expect(verifyTOTP(token, secret)).toBe(true)
  })

  it('should reject an incorrect token', () => {
    const secret = authenticator.generateSecret()
    expect(verifyTOTP('123456', secret)).toBe(false)
  })
})
