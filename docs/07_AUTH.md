# Authentication — Google OAuth with IUT Domain Restriction

## Flow Overview

```
1. User visits /login
2. Clicks "Sign in with Google"
3. Redirected to Google consent screen
4. Google redirects back to /api/auth/callback/google
5. NextAuth signIn callback:
   a. Check email ends with @iut-dhaka.edu
      → NO: redirect to /auth/error?reason=domain
      → YES: continue
   b. Upsert user in DB
6. Session created (database session)
7. Redirect to /dashboard
```

---

## Google Cloud Console Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create new project: `IPE24 Class Portal`
3. Enable APIs:
   - Google OAuth 2.0 (under Credentials)
   - Google Drive API
   - Google Sheets API
4. OAuth Consent Screen:
   - User type: External (for @iut-dhaka.edu accounts)
   - App name: IPE-24 Class Portal
   - Authorized domains: `your-domain.me`
   - Scopes: `email`, `profile`
5. Create OAuth Client ID:
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://your-domain.me/api/auth/callback/google` (production)
6. Copy Client ID and Client Secret → `.env`

---

## Service Account (for Drive + Sheets)

1. In Google Cloud Console → IAM & Admin → Service Accounts
2. Create service account: `ipe24-bot@ipe24-class-portal.iam.gserviceaccount.com`
3. Create and download JSON key
4. Share your class Google Drive folder with the service account email (Viewer for reading, Editor for uploading)
5. Share your Google Sheets routine with the service account email (Viewer)
6. Encode key for .env:
   ```bash
   base64 -w 0 service-account-key.json
   # Paste output into GOOGLE_SERVICE_ACCOUNT_KEY=
   ```

---

## NextAuth Configuration

```typescript
// apps/web/src/lib/auth.ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Request only minimal scopes
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'select_account',  // Always show account picker
        },
      },
    }),
  ],

  session: {
    strategy: 'database',     // Store sessions in PostgreSQL
    maxAge: 30 * 24 * 60 * 60,  // 30 days
    updateAge: 24 * 60 * 60,    // Refresh session daily
  },

  callbacks: {
    async signIn({ account, profile }) {
      const email = profile?.email ?? ''

      // CRITICAL: Domain restriction
      if (!email.toLowerCase().endsWith(`@${process.env.ALLOWED_DOMAIN}`)) {
        console.warn(`Login attempt from non-IUT email: ${email}`)
        return `/auth/error?reason=domain`
      }

      // Upsert user (create on first login, update lastLogin on subsequent)
      await prisma.user.upsert({
        where: { email },
        create: {
          email,
          name: profile?.name ?? 'Student',
          avatarUrl: (profile as any)?.picture ?? null,
          role: 'student',
        },
        update: {
          name: profile?.name ?? undefined,
          avatarUrl: (profile as any)?.picture ?? undefined,
          lastLogin: new Date(),
        },
      })

      return true
    },

    async session({ session, user }) {
      if (session.user && user?.id) {
        // Fetch fresh role from DB on every session check
        // This ensures revoked roles take effect immediately
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, role: true, studentId: true },
        })

        session.user.id = dbUser?.id ?? user.id
        session.user.role = dbUser?.role ?? 'student'
        session.user.studentId = dbUser?.studentId ?? null
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/auth/error',
  },

  // Enable debug in development only
  debug: process.env.NODE_ENV === 'development',
})
```

---

## Auth Route Handler

```typescript
// apps/web/src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

---

## Login Page

```tsx
// apps/web/src/app/(auth)/login/page.tsx
import { signIn } from '@/lib/auth'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Image from 'next/image'

export default async function LoginPage() {
  // Already logged in? Send to dashboard
  const session = await auth()
  if (session) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm text-center">
        {/* IUT Logo */}
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">IPE</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">IPE-24 Class Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Islamic University of Technology</p>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Sign in with your IUT Google account to access the class portal.
        </p>

        {/* Sign In Form — uses Server Action */}
        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/dashboard' })
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              {/* Google SVG icon */}
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-4">
          Only <strong>@iut-dhaka.edu</strong> accounts can access this portal.
        </p>
      </div>
    </div>
  )
}
```

---

## Error Page

```tsx
// apps/web/src/app/(auth)/auth/error/page.tsx
import Link from 'next/link'

const ERROR_MESSAGES: Record<string, { title: string; body: string }> = {
  domain: {
    title: 'Access Denied',
    body: 'This portal is only accessible to students and staff with an @iut-dhaka.edu Google account. Please sign in with your IUT email.',
  },
  default: {
    title: 'Sign In Error',
    body: 'Something went wrong during sign in. Please try again.',
  },
}

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { reason?: string }
}) {
  const reason = searchParams.reason ?? 'default'
  const { title, body } = ERROR_MESSAGES[reason] ?? ERROR_MESSAGES.default

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-xl">✕</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-600 mb-6">{body}</p>
        <Link
          href="/login"
          className="inline-block bg-blue-600 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}
```

---

## Session Type Augmentation

```typescript
// apps/web/src/types/next-auth.d.ts
import { DefaultSession, DefaultUser } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'student' | 'admin' | 'super_admin'
      studentId: string | null
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role: 'student' | 'admin' | 'super_admin'
    studentId: string | null
  }
}
```

---

## Logout

```tsx
// In any component that needs a logout button:
import { signOut } from '@/lib/auth'

// Server component (layout):
<form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }) }}>
  <button type="submit">Sign out</button>
</form>
```

---

## Session Usage in Server Components

```typescript
// In any Server Component:
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const session = await auth()
  if (!session) redirect('/login')

  // session.user.id, session.user.role, session.user.email are all typed
  return <div>Hello {session.user.name}</div>
}
```

## Session Usage in API Routes

```typescript
// In any Route Handler:
import { auth } from '@/lib/auth'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // session.user.id and session.user.role available
}
```
