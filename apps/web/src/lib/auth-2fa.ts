import { authenticator } from 'otplib'

export function verifyTOTP(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret })
}

export function generateTOTPSecret(): string {
  return authenticator.generateSecret()
}

export function getTOTPUrl(email: string, issuer: string, secret: string): string {
  return authenticator.keyuri(email, issuer, secret)
}
