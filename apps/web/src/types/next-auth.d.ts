import { DefaultSession, DefaultUser, JWT } from 'next-auth'

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

declare module 'next-auth/jwt' {
  interface JWT {
    sub?: string
    role?: 'student' | 'admin' | 'super_admin'
    studentId?: string | null
  }
}
