import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from './prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Using JWT strategy (stateless) - no adapter needed
  // For database sessions, use: adapter: PrismaAdapter(prisma) with strategy: 'database'
  providers: [
    // Google OAuth (production)
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dev-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dev-secret',
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'select_account',
        },
      },
    }),
    // Credentials provider (development/testing only)
    ...(process.env.NODE_ENV === 'development'
      ? [
          Credentials({
            id: 'credentials',
            name: 'Test Credentials',
            credentials: {
              email: { label: 'Email', type: 'email', placeholder: 'student@iut-dhaka.edu' },
            },
            async authorize(credentials) {
              console.log('[Auth] Credentials authorize called with:', credentials?.email)
              
              if (!credentials?.email) {
                console.log('[Auth] No email provided')
                return null
              }

              const email = credentials.email as string
              console.log('[Auth] Attempting to login with email:', email)

              try {
                // For development testing, accept all emails
                // In production, remove Credentials provider entirely
                let user = await prisma.user.findUnique({ where: { email } })
                console.log('[Auth] User lookup result:', user?.email)

                if (!user) {
                  console.log('[Auth] User not found, creating new user')
                  user = await prisma.user.create({
                    data: {
                      email,
                      name: email.includes('admin') ? 'Admin User' : 'Test Student',
                      role: email.includes('admin') ? 'super_admin' : 'student',
                      studentId: email.includes('admin') ? 'IPE-24-CR' : 'IPE-24-001',
                      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
                    },
                  })
                  console.log('[Auth] User created:', user.id)
                }

                console.log('[Auth] Returning user:', user.id, user.email)
                return { 
                  id: user.id, 
                  email: user.email, 
                  name: user.name,
                } as any
              } catch (error) {
                console.error('[Auth] Error in authorize:', error)
                return null
              }
            },
          }),
        ]
      : []),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Refresh session daily
  },

  callbacks: {
    async signIn({ profile, account, user, credentials }) {
      console.log('[Auth] signIn callback:', { hasCredentials: !!credentials, hasProfile: !!profile, userId: user?.id })
      
      // For Credentials provider (development only), skip domain check
      // Credentials provider already created/fetched the user in authorize()
      if (credentials) {
        console.log('[Auth] Credentials provider - allowing login')
        return true
      }

      // For Google OAuth, apply domain check
      const email = profile?.email ?? user?.email ?? ''
      console.log('[Auth] Google OAuth email:', email)

      // CRITICAL: Domain restriction — only @iut-dhaka.edu emails (Google OAuth only)
      if (email && !email.toLowerCase().endsWith(`@${process.env.ALLOWED_DOMAIN}`)) {
        console.warn(`[Auth] Login attempt from non-IUT email: ${email}`)
        return `/auth/error?reason=domain`
      }

      // Upsert user (create on first login, update lastLogin on subsequent)
      if (profile?.email) {
        console.log('[Auth] Upserting Google OAuth user:', profile.email)
        await prisma.user.upsert({
          where: { email: profile.email },
          create: {
            email: profile.email,
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
      }

      return true
    },

    async session({ session, token }) {
      console.log('[Auth] Session callback - token.sub:', token?.sub)
      
      // Add user info from token to session (NO DATABASE QUERIES - edge runtime)
      if (session.user && token?.sub) {
        session.user.id = token.sub as string
        session.user.role = (token?.role as any) || 'student'
        session.user.studentId = (token?.studentId as string) || null
        console.log('[Auth] Session set from token:', session.user.email, session.user.role)
      }
      return session
    },

    async jwt({ token, user }) {
      console.log('[Auth] JWT callback - user:', user?.id, 'token.sub:', token?.sub)
      
      // Add user info to token on initial login (runs in server context, can use Prisma)
      if (user) {
        token.sub = user.id
        token.role = user.role
        token.studentId = user.studentId
        console.log('[Auth] JWT token populated - id:', token.sub, 'role:', token.role)
      }
      return token
    },
  },

  pages: {
    signIn: '/login',
    error: '/auth/error',
  },

  debug: process.env.NODE_ENV === 'development',
})
