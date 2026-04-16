import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'



export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  providers: [
    // Google OAuth (Students & Backup Admin)
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
    // Secure Credentials provider (Admins & CRs)
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        otp: { label: '2FA Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = (credentials.email as string).toLowerCase()
        const password = credentials.password as string
        const otp = credentials.otp as string | undefined

        try {
          // Find user in DB
          const user = await prisma.user.findUnique({ where: { email } })
          
          if (!user || !user.passwordHash) {
            console.log(`[Auth] User not found or no password set for: ${email}`)
            return null
          }

          // Check if user is Admin/CR
          if (user.role === 'student' && process.env.NODE_ENV === 'production') {
            console.warn(`[Auth] Student attempted credential login: ${email}`)
            throw new Error('Please login with Google')
          }

          // Verify password
          const isValid = await bcrypt.compare(password, user.passwordHash)
          if (!isValid) {
            console.log(`[Auth] Invalid password for: ${email}`)
            return null
          }

          // Verify 2FA if enabled
          if (user.twoFactorEnabled && user.twoFactorSecret) {
            if (!otp) {
              // Special marker for client to show OTP input
              throw new Error('2FA_REQUIRED')
            }

            // Dynamic import to avoid webpack CJS/ESM interop issues
            const otplibModule = await import('otplib')
            const auth2fa = otplibModule.authenticator || (otplibModule as any).default?.authenticator
            const isOtpValid = auth2fa.verify({
              token: otp,
              secret: user.twoFactorSecret,
            })

            if (!isOtpValid) {
              console.log(`[Auth] Invalid OTP for: ${email}`)
              throw new Error('INVALID_OTP')
            }
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            studentId: user.studentId,
          } as any
        } catch (error: any) {
          console.error('[Auth] Error in authorize:', error.message)
          throw error // Propagate specific errors
        }
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async signIn({ profile, account, user, credentials }) {
      // For Credentials provider, authorize() already did the heavy lifting
      if (account?.provider === 'credentials') {
        return true
      }

      // For Google OAuth
      const email = (profile?.email ?? user?.email ?? '').toLowerCase()
      
      // Domain restriction (Student restriction)
      if (email && !email.endsWith(`@${process.env.ALLOWED_DOMAIN}`)) {
        // Allow super admin email even if on different domain
        if (email !== process.env.SUPER_ADMIN_EMAIL?.toLowerCase()) {
          return `/auth/error?reason=domain`
        }
      }

      // Sync user data
      if (profile?.email) {
        const adminEmail = (process.env.SUPER_ADMIN_EMAIL || 'cr@iut-dhaka.edu').toLowerCase()
        const isDefaultSuperAdmin = profile.email.toLowerCase() === adminEmail
        
        await prisma.user.upsert({
          where: { email: profile.email.toLowerCase() },
          create: {
            email: profile.email.toLowerCase(),
            name: profile?.name ?? 'Anonymous',
            avatarUrl: (profile as any)?.picture ?? null,
            role: isDefaultSuperAdmin ? 'super_admin' : 'student',
          },
          update: {
            name: profile?.name ?? undefined,
            avatarUrl: (profile as any)?.picture ?? undefined,
            lastLogin: new Date(),
            ...(isDefaultSuperAdmin ? { role: 'super_admin' } : {})
          },
        })
      }

      return true
    },

    async jwt({ token, user, account, profile }) {
      if (account?.provider === 'google' && profile?.email) {
        // Fetch DB user to get the Real Prisma ID and Role on initial OAuth sign-in
        const dbUser = await prisma.user.findUnique({
          where: { email: profile.email.toLowerCase() }
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role as any
          token.studentId = dbUser.studentId
        }
      } else if (user) {
        // For Credentials Provider, user object is already fully populated by authorize()
        token.id = user.id
        token.role = (user as any).role
        token.studentId = (user as any).studentId
      }
      return token
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.role = token.role as any
        session.user.studentId = token.studentId as string
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/auth/error',
  },

  debug: process.env.NODE_ENV === 'development',
})
