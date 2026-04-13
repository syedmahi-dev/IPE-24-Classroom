import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default auth((req: NextRequest) => {
  const { pathname } = req.nextUrl
  const session = (req as any).auth

  // Public routes — no auth required
  if (
    pathname.startsWith('/auth') ||
    pathname === '/login' ||
    pathname.startsWith('/api/v1/health') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Block unauthenticated users
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Login required' } },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Block non-admin users from /admin/* pages
  if (pathname.startsWith('/admin')) {
    if (!session?.user?.role || !['admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Block non-super_admin from /admin/users and /admin/settings
  if (pathname.startsWith('/admin/users') || pathname.startsWith('/admin/settings')) {
    if (session?.user?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
  }

  // Internal routes — require secret header
  if (pathname.startsWith('/api/v1/internal/')) {
    const secret = req.headers.get('x-internal-secret')
    if (secret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid secret' } },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}) as any

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/).*)'],
}
