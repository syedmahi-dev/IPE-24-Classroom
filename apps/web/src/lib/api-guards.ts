import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

type Role = 'student' | 'admin' | 'super_admin'

const ROLE_HIERARCHY: Record<Role, number> = {
  student: 0,
  admin: 1,
  super_admin: 2,
}

export async function requireRole(req: NextRequest, minimumRole: Role) {
  const session = await auth()

  if (!session?.user) {
    return {
      error: NextResponse.json(
        { success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Login required' } },
        { status: 401 }
      ),
    }
  }

  const userLevel = ROLE_HIERARCHY[session.user.role as Role] ?? -1
  const requiredLevel = ROLE_HIERARCHY[minimumRole]

  if (userLevel < requiredLevel) {
    return {
      error: NextResponse.json(
        { success: false, data: null, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        { status: 403 }
      ),
    }
  }

  return { user: session.user }
}

export async function requireAuth() {
  const session = await auth()

  if (!session?.user) {
    return {
      error: NextResponse.json(
        { success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Login required' } },
        { status: 401 }
      ),
    }
  }

  return { user: session.user }
}

export function requireInternalSecret(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return {
      error: NextResponse.json(
        { success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid internal secret' } },
        { status: 401 }
      ),
    }
  }
  return {}
}
