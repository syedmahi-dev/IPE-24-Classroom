import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public routes — skip JWT decode entirely for speed
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/v1/health') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET })

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

  // Note: Role checks for /admin/* are handled securely in AdminLayout to prevent stale JWT issues
  // which lets the server fetch the latest role from the database.

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
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|iut-logo\.svg|.*\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|ttf|eot)$).*)'],
}
