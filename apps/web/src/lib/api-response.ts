import { NextResponse } from 'next/server'

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ success: true, data, error: null, meta: meta ?? null })
}

export function err(code: string, message: string, status: number) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message } },
    { status }
  )
}

export const ERRORS = {
  UNAUTHORIZED: () => err('UNAUTHORIZED', 'Login required', 401),
  FORBIDDEN: () => err('FORBIDDEN', 'Insufficient permissions', 403),
  NOT_FOUND: (entity: string) => err('NOT_FOUND', `${entity} not found`, 404),
  VALIDATION: (msg: string) => err('VALIDATION_ERROR', msg, 400),
  RATE_LIMITED: () => err('RATE_LIMITED', 'Too many requests. Please try again later.', 429),
  INTERNAL: () => err('INTERNAL_ERROR', 'Something went wrong', 500),
}
