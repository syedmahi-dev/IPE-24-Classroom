import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'

describe('Password Hashing', () => {
  it('should hash a password and verify it', async () => {
    const password = 'my-secure-password'
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)
    
    expect(hash).not.toBe(password)
    expect(await bcrypt.compare(password, hash)).toBe(true)
    expect(await bcrypt.compare('wrong-password', hash)).toBe(false)
  })

  it('should generate different hashes for the same password due to random salt', async () => {
    const password = 'my-secure-password'
    const hash1 = await bcrypt.hash(password, 10)
    const hash2 = await bcrypt.hash(password, 10)
    
    expect(hash1).not.toBe(hash2)
    expect(await bcrypt.compare(password, hash1)).toBe(true)
    expect(await bcrypt.compare(password, hash2)).toBe(true)
  })
})
