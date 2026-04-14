# Auth Backend Implementation

## 1. Dependencies
The agent must install the following packages for secure password hashing and 2FA TOTP generation:
\`\`\`bash
npm install bcryptjs otplib
npm install -D @types/bcryptjs
\`\`\`

## 2. Database Schema Updates
Update `apps/web/prisma/schema.prisma` to add authentication fields to the `User` model.

\`\`\`prisma
model User {
  id              String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  email           String    @unique
  name            String
  avatarUrl       String?
  role            Role      @default(student)
  studentId       String?   @unique
  phone           String?
  bio             String?
  passwordHash    String?   // NEW: For Admin login
  twoFactorSecret String?   // NEW: For Super Admin 2FA
  lastLogin       DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // ... existing relations
  @@map("users")
}
\`\`\`
*Agent Instruction: Run `npx prisma migrate dev --name add_admin_auth` after updating.*

## 3. NextAuth Configuration (`apps/web/lib/auth.ts`)
The authentication logic relies on `next-auth@beta` (v5). Update the configuration to enforce domain restrictions, database whitelisting, and the custom Credentials provider.

\`\`\`typescript
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { authenticator } from 'otplib'
import { prisma } from './prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { prompt: 'select_account' } },
    }),
    Credentials({
      id: 'credentials',
      name: 'Admin Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totp: { label: '2FA Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email as string
        const password = credentials.password as string
        const totp = credentials.totp as string | undefined

        const user = await prisma.user.findUnique({ where: { email } })

        // 1. Validate user and password existence
        if (!user || !user.passwordHash) return null

        // 2. Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash)
        if (!isValidPassword) return null

        // 3. Block students from using this provider
        if (user.role === 'student') return null

        // 4. Enforce 2FA strictly for super_admin
        if (user.role === 'super_admin') {
          if (!user.twoFactorSecret) throw new Error("2FA_NOT_CONFIGURED")
          if (!totp) throw new Error("2FA_REQUIRED")
          
          const isValidTotp = authenticator.verify({
            token: totp,
            secret: user.twoFactorSecret
          })
          if (!isValidTotp) throw new Error("INVALID_2FA")
        }

        return { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          role: user.role,
          studentId: user.studentId 
        } as any
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const email = profile?.email ?? user.email ?? ''
        
        // Check domain
        if (!email.endsWith(`@${process.env.ALLOWED_DOMAIN}`)) {
          return '/auth/error?error=AccessDenied&reason=domain'
        }

        // Check whitelist (User must already exist in DB)
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (!existingUser) {
          return '/auth/error?error=AccessDenied&reason=not-whitelisted'
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.studentId = (user as any).studentId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'student' | 'admin' | 'super_admin'
        session.user.studentId = token.studentId as string | null
      }
      return session
    },
  },
  pages: { signIn: '/login', error: '/auth/error' },
})
\`\`\`