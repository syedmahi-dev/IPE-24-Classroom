# Backend Implementation — IPE-24 Class Portal

## Project Initialization

```bash
npx create-next-app@latest apps/web \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd apps/web
npm install --save-exact \
  prisma @prisma/client \
  next-auth@beta \
  @auth/prisma-adapter \
  zod \
  ioredis \
  @google/generative-ai \
  googleapis \
  firebase-admin \
  @upstash/ratelimit

npm install --save-dev \
  @types/node \
  prisma
```

---

## Folder Structure (`apps/web/src`)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── auth/error/page.tsx
│   ├── (student)/
│   │   ├── layout.tsx           # student shell layout
│   │   ├── dashboard/page.tsx
│   │   ├── routine/page.tsx
│   │   ├── resources/page.tsx
│   │   ├── exams/page.tsx
│   │   ├── polls/page.tsx
│   │   ├── chat/page.tsx        # AI Virtual CR
│   │   ├── study-groups/page.tsx
│   │   └── profile/page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx           # admin shell layout
│   │   ├── admin/page.tsx       # admin overview
│   │   ├── admin/announcements/page.tsx
│   │   ├── admin/files/page.tsx
│   │   ├── admin/exams/page.tsx
│   │   ├── admin/polls/page.tsx
│   │   ├── admin/users/page.tsx
│   │   ├── admin/knowledge/page.tsx
│   │   └── admin/audit-log/page.tsx
│   └── api/
│       └── v1/
│           ├── health/route.ts
│           ├── announcements/route.ts
│           ├── announcements/[id]/route.ts
│           ├── routine/route.ts
│           ├── files/route.ts
│           ├── exams/route.ts
│           ├── polls/route.ts
│           ├── polls/[id]/vote/route.ts
│           ├── chat/route.ts
│           ├── notifications/route.ts
│           ├── push/subscribe/route.ts
│           ├── profile/route.ts
│           ├── admin/announcements/route.ts
│           ├── admin/files/route.ts
│           ├── admin/exams/route.ts
│           ├── admin/polls/route.ts
│           ├── admin/users/route.ts
│           ├── admin/knowledge/route.ts
│           └── internal/
│               └── announcements/route.ts
├── lib/
│   ├── auth.ts                  # NextAuth config
│   ├── prisma.ts                # Prisma singleton
│   ├── redis.ts                 # Redis singleton
│   ├── gemini.ts                # Gemini AI client
│   ├── google-drive.ts          # Drive API client
│   ├── google-sheets.ts         # Sheets API client
│   ├── fcm.ts                   # Firebase Admin
│   ├── vector-search.ts         # pgvector RAG search
│   ├── embeddings.ts            # Local embedding caller
│   ├── rate-limit.ts            # Redis rate limiter
│   ├── api-guards.ts            # Role enforcement helpers
│   ├── audit.ts                 # Audit log writer
│   └── api-response.ts          # Standardized response helpers
├── middleware.ts
└── types/
    ├── next-auth.d.ts           # Session type augmentation
    └── api.ts                   # API response types
```

---

## API Guard & Audit Utilities

### `lib/api-guards.ts`
```typescript
import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

type Role = 'student' | 'admin' | 'super_admin'

const ROLE_HIERARCHY: Record<Role, number> = {
  student: 0,
  admin: 1,
  super_admin: 2,
}

// Require minimum role level
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

// Just require authentication
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

// Require internal API secret (for inter-service calls)
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
```

### `lib/audit.ts`
```typescript
import { prisma } from './prisma'

export async function logAudit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetType,
        targetId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        createdAt: new Date(),
      },
    })
  } catch (error) {
    // Audit log failures should not break the main operation
    console.error('Audit log write failed:', error)
  }
}
```

---

## Core Library Files

### `lib/prisma.ts`
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### `lib/redis.ts`
```typescript
import { Redis } from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis }

export const redis =
  globalForRedis.redis ||
  new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 100, 2000),
    lazyConnect: true, // Optional — app falls back to in-memory cache if Redis unavailable
  })

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis
```

**Note:** Redis is optional for local development. If `REDIS_URL` is not set or Redis is unavailable, the application uses in-memory cache as fallback.

### `lib/rate-limit.ts`
```typescript
import { redis } from './redis'

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

export async function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - windowSeconds * 1000
  const redisKey = `rl:${key}`

  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(redisKey, 0, windowStart)
  pipeline.zadd(redisKey, now, `${now}-${Math.random()}`)
  pipeline.zcard(redisKey)
  pipeline.expire(redisKey, windowSeconds)
  const results = await pipeline.exec()

  const count = results?.[2]?.[1] as number ?? 0
  const success = count <= maxRequests

  return {
    success,
    remaining: Math.max(0, maxRequests - count),
    reset: Math.ceil((windowStart + windowSeconds * 1000) / 1000),
  }
}
```

### `lib/api-response.ts`
```typescript
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
  RATE_LIMITED: () => err('RATE_LIMITED', 'Too many requests', 429),
  INTERNAL: () => err('INTERNAL_ERROR', 'Something went wrong', 500),
}
```

### `lib/auth.ts`
```typescript
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
              if (!credentials?.email) return null

              const email = credentials.email as string
              let user = await prisma.user.findUnique({ where: { email } })

              if (!user) {
                // Create user for testing
                user = await prisma.user.create({
                  data: {
                    email,
                    name: email.includes('admin') ? 'Admin User' : 'Test Student',
                    role: email.includes('admin') ? 'super_admin' : 'student',
                    studentId: email.includes('admin') ? 'IPE-24-CR' : 'IPE-24-001',
                    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
                  },
                })
              }

              return { id: user.id, email: user.email, name: user.name } as any
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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role ?? 'student'
        token.studentId = (user as any).studentId ?? null
      }
      if (trigger === 'update' && session?.role) {
        token.role = session.role
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? ''
        session.user.role = (token.role as any) ?? 'student'
        session.user.studentId = (token.studentId as any) ?? null
      }
      return session
    },

    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        // CRITICAL: Domain restriction for Google OAuth
        const email = profile?.email ?? user.email ?? ''
        if (!email.endsWith(`@${process.env.ALLOWED_DOMAIN}`)) {
          return '/auth/error?reason=domain'
        }
      }
      return true
    },
  },

  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
})
```

### `types/next-auth.d.ts`
```typescript
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'student' | 'admin' | 'super_admin'
      studentId: string | null
    } & DefaultSession['user']
  }
}
```

---

---

## Implementation Status

### ✅ Completed
- All core library files (`lib/`) — prisma, redis, auth, rate-limit, api-response, gemini, embeddings, fcm, google-drive, google-sheets, vector-search, knowledge-indexer, api-guards, audit
- Prisma schema with full database models
- NextAuth configuration with JWT strategy, Google OAuth, and development Credentials provider
- Middleware with role-based access control
- Student layout shell with Sidebar and TopBar components

### ⚠️ Needs Implementation
The following critical API routes and pages are documented but not yet implemented:

**API Routes** (to be created in `src/app/api/v1/`):
- `GET /api/v1/announcements` — fetch announcements with filtering
- `POST /api/v1/announcements` — create announcement (admin only)
- `POST /api/v1/chat` — streaming RAG chatbot
- `GET /api/v1/routine` — fetch weekly routine from Google Sheets
- `GET /api/v1/files` — list files by course
- `POST /api/v1/files` — upload to Google Drive (admin only)
- `GET /api/v1/exams` — list exams with countdown info
- `POST /api/v1/admin/exams` — manage exams (admin only)
- `GET /api/v1/polls` — list active polls
- `POST /api/v1/polls/[id]/vote` — submit poll vote
- `POST /api/v1/push/subscribe` — register push notification token
- `GET /api/v1/notifications` — fetch user notifications
- `GET /api/v1/profile` — user profile info
- `POST /api/v1/admin/announcements` — publish announcement
- `POST /api/v1/admin/files` — upload file (admin)
- `POST /api/v1/admin/knowledge` — manage AI knowledge base
- `POST /api/v1/internal/announcements` — internal broadcast endpoint

**Pages** (to be created):
- `(auth)/login/page.tsx` — login page
- `(auth)/auth/error/page.tsx` — OAuth error page
- `(admin)/layout.tsx` — admin shell
- `(admin)/admin/page.tsx` — admin overview
- `(admin)/admin/announcements/page.tsx` — announcement management
- `(student)/routine/page.tsx` — class routine
- `(student)/resources/page.tsx` — resource library
- `(student)/exams/page.tsx` — exam tracker
- `(student)/polls/page.tsx` — poll voting interface
- `(student)/chat/page.tsx` — AI Virtual CR chat
- `(student)/study-groups/page.tsx` — study group board
- `(student)/profile/page.tsx` — user profile

---

## API Route Examples

### GET /api/v1/announcements
```typescript
// app/api/v1/announcements/route.ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  type: z.enum(['general','exam','file_update','routine_update','urgent','event']).optional(),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return ERRORS.UNAUTHORIZED()

  const url = new URL(req.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return ERRORS.VALIDATION(parsed.error.message)

  const { page, limit, type } = parsed.data
  const skip = (page - 1) * limit

  const [items, total] = await prisma.$transaction([
    prisma.announcement.findMany({
      where: { isPublished: true, ...(type ? { type } : {}) },
      orderBy: { publishedAt: 'desc' },
      skip,
      take: limit,
      include: { author: { select: { name: true } }, courses: { include: { course: true } } },
    }),
    prisma.announcement.count({ where: { isPublished: true, ...(type ? { type } : {}) } }),
  ])

  return ok(items, { page, limit, total, totalPages: Math.ceil(total / limit) })
}
```

### POST /api/v1/chat (Streaming RAG)
```typescript
// app/api/v1/chat/route.ts
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { ERRORS, ok } from '@/lib/api-response'
import { searchKnowledge } from '@/lib/vector-search'
import { getEmbedding } from '@/lib/embeddings'
import { gemini } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bodySchema = z.object({
  question: z.string().min(2).max(500).trim(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return ERRORS.UNAUTHORIZED()

  const { success } = await rateLimit(`chat:${session.user.id}`, 20, 3600)
  if (!success) return ERRORS.RATE_LIMITED()

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return ERRORS.VALIDATION(parsed.error.message)

  const { question } = parsed.data

  try {
    // 1. Embed the question
    const queryEmbedding = await getEmbedding(question)

    // 2. Retrieve relevant chunks from knowledge base (pgvector)
    const chunks = await searchKnowledge(queryEmbedding, 5)
    const context = chunks.map(c => c.content).join('\n\n---\n\n')

    // 3. Build prompt
    const systemPrompt = `You are the Virtual Class Representative (Virtual CR) of IPE-24 batch 
at the Islamic University of Technology (IUT), Bangladesh. You help students with questions about 
their courses, exams, class schedules, syllabus, and university policies.

Answer based ONLY on the following class information. If the answer is not in the provided context, 
say "I don't have that specific information — please ask the CR directly or check the notice board."

Be friendly, concise, and helpful. Use bullet points for lists.

CLASS INFORMATION:
${context}`

    // 4. Stream response from Gemini
    const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const chat = model.startChat({ systemInstruction: systemPrompt })
          const result = await chat.sendMessageStream(question)
          let fullAnswer = ''

          for await (const chunk of result.stream) {
            const text = chunk.text()
            fullAnswer += text
            controller.enqueue(new TextEncoder().encode(text))
          }

          // Log to DB after stream completes
          await prisma.chatLog.create({
            data: { userId: session.user.id, question, answer: fullAnswer },
          })

          controller.close()
        } catch (error) {
          console.error('Chat error:', error)
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff' 
      },
    })
  } catch (error) {
    console.error('Chat route error:', error)
    return ERRORS.INTERNAL()
  }
}
```

### POST /api/v1/admin/files (File Upload to Drive)
```typescript
// app/api/v1/admin/files/route.ts
import { requireRole } from '@/lib/api-guards'
import { uploadToDrive } from '@/lib/google-drive'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg', 'image/png', 'image/webp',
]
const MAX_SIZE_BYTES = 25 * 1024 * 1024 // 25MB

export async function POST(req: Request) {
  const { user, error } = await requireRole(req, 'admin')
  if (error) return error

  const formData = await req.formData()
  const file = formData.get('file') as File
  const courseId = formData.get('courseId') as string | null
  const category = formData.get('category') as string | null

  if (!file) return ERRORS.VALIDATION('No file provided')
  if (!ALLOWED_TYPES.includes(file.type)) return ERRORS.VALIDATION('File type not allowed')
  if (file.size > MAX_SIZE_BYTES) return ERRORS.VALIDATION('File exceeds 25MB limit')

  // Sanitize filename — remove path traversal and special chars
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200)

  const buffer = Buffer.from(await file.arrayBuffer())
  const driveFile = await uploadToDrive(buffer, safeName, file.type)

  const record = await prisma.fileUpload.create({
    data: {
      name: safeName,
      driveId: driveFile.id,
      driveUrl: driveFile.webViewLink,
      downloadUrl: driveFile.webContentLink,
      mimeType: file.type,
      sizeBytes: file.size,
      category: (category as any) ?? 'other',
      courseId: courseId ?? undefined,
      uploadedById: user.id,
    },
  })

  await logAudit(user.id, 'CREATE', 'file', record.id, { name: safeName })

  return ok(record)
}
```

---

## Google Sheets Routine Fetcher

```typescript
// lib/google-sheets.ts
import { google } from 'googleapis'
import { redis } from './redis'

const CACHE_KEY = 'routine:sheets'
const CACHE_TTL = 300 // 5 minutes

function getAuthClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!, 'base64').toString()
  )
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

export async function fetchRoutine() {
  const cached = await redis.get(CACHE_KEY)
  if (cached) return JSON.parse(cached)

  const auth = getAuthClient()
  const sheets = google.sheets({ version: 'v4', auth })

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ROUTINE_ID!,
    range: 'Routine!A1:G20', // adjust to your sheet layout
  })

  const data = response.data.values ?? []
  await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(data))
  return data
}

export async function invalidateRoutineCache() {
  await redis.del(CACHE_KEY)
}
```

---

## Notification Broadcasting

```typescript
// lib/fcm.ts
import admin from 'firebase-admin'
import { prisma } from './prisma'

if (!admin.apps.length && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString())
    ),
  })
}

export async function broadcastPushNotification(title: string, body: string, link?: string) {
  if (!admin.apps.length) return // Firebase not configured

  const tokens = await prisma.pushToken.findMany({ select: { token: true } })
  if (tokens.length === 0) return

  const tokenList = tokens.map((t) => t.token)

  // FCM batch send (max 500 per batch)
  const chunks: string[][] = []
  for (let i = 0; i < tokenList.length; i += 500) {
    chunks.push(tokenList.slice(i, i + 500))
  }

  for (const chunk of chunks) {
    try {
      await admin.messaging().sendMulticast({
        tokens: chunk,
        notification: { title, body },
        webpush: link ? { fcmOptions: { link } } : undefined,
      })
    } catch (err) {
      console.error('FCM broadcast error:', err)
    }
  }
}
```

**Note:** Firebase is optional. If `FIREBASE_SERVICE_ACCOUNT_KEY` is not set, push notifications are silently skipped.

---

## Local Embeddings Caller

```typescript
// lib/embeddings.ts
// Calls the Python transcriber/embedder service running locally

export async function getEmbedding(text: string): Promise<number[]> {
  const baseUrl = process.env.TRANSCRIBER_URL ?? 'http://transcriber:8000'
  const response = await fetch(`${baseUrl}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    throw new Error(`Embedding service error: ${response.status}`)
  }

  const data = await response.json()
  return data.embedding as number[]
}

export async function transcribeAudio(audioBase64: string, filename: string): Promise<string> {
  const baseUrl = process.env.TRANSCRIBER_URL ?? 'http://transcriber:8000'
  const response = await fetch(`${baseUrl}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_base64: audioBase64, filename }),
  })

  if (!response.ok) {
    throw new Error(`Transcription service error: ${response.status}`)
  }

  const data = await response.json()
  return data.transcript as string
}
```

---

## Vector Similarity Search (pgvector)

```typescript
// lib/vector-search.ts
import { prisma } from './prisma'

/**
 * Search knowledge base using vector similarity
 * Returns top-K most relevant chunks using cosine distance
 */
export async function searchKnowledge(queryEmbedding: number[], topK = 5) {
  const results = await prisma.$queryRaw<
    Array<{
      id: string
      content: string
      document_id: string
      title: string
      source_type: string
      course_code: string | null
      similarity: number
    }>
  >`
    SELECT
      kc.id,
      kc.content,
      kc.document_id,
      kd.title,
      kd.source_type,
      kd.course_code,
      1 - (kc.embedding <=> ${queryEmbedding}::vector) AS similarity
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kc.document_id = kd.id
    WHERE kc.embedding IS NOT NULL
    ORDER BY kc.embedding <=> ${queryEmbedding}::vector
    LIMIT ${topK}
  `
  // Filter by relevance threshold (0.55 = moderate relevance)
  return results.filter((r) => r.similarity > 0.55)
}
```

**Note:** This function requires PostgreSQL with pgvector extension. For SQLite development, vector search will fail. For production deployment, migrate to PostgreSQL.

---

## Middleware & Route Protection

```typescript
// src/middleware.ts
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
        { success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid internal secret' } },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.webp).*)',
  ],
}
```

**Key points:**
- Public routes: `/login`, `/auth/*`, `/api/auth/*`, health checks
- Protected routes: require authentication via session
- `/admin/*` routes: require `admin` or `super_admin` role
- `/api/v1/internal/*` routes: require `x-internal-secret` header (for inter-service calls)
- Role hierarchy: `student` (0) < `admin` (1) < `super_admin` (2)

---

## Getting Started (Local Development)

1. **Copy `.env.example` or create `.env`:**
   ```bash
   cd apps/web
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

4. **Run migrations:**
   ```bash
   npx prisma migrate dev
   ```

5. **Seed test data:**
   ```bash
   npx tsx prisma/seed.ts
   ```

6. **Start dev server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

7. **For credentials auth (no Google setup needed):**
   - Email: `student@iut-dhaka.edu` → logs in as student
   - Email: `admin@iut-dhaka.edu` → logs in as super_admin

---

## Environment Variables

```bash
# .env file for development

# ── DATABASE ─────────────────────────────────────────────────────────────────
# Development: SQLite (no external database needed!)
DATABASE_URL=file:./prisma/dev.db
# Production: Switch to PostgreSQL with pgvector
# DATABASE_URL=postgresql://user:password@host:5432/ipe24?schema=public

# ── CACHE ────────────────────────────────────────────────────────────────────
# Optional: Redis for caching and rate limiting
# Leave empty for in-memory fallback
REDIS_URL=redis://localhost:6379

# ── AUTH ─────────────────────────────────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-64-hex-chars

# Google OAuth credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Restrict login to this domain
ALLOWED_DOMAIN=iut-dhaka.edu

# ── GOOGLE APIS (Service Account) ────────────────────────────────────────────
# Generate with: base64 -w 0 service-account-key.json
GOOGLE_SERVICE_ACCOUNT_KEY=<base64_encoded_json>

# Google Drive folder where files are uploaded
GOOGLE_DRIVE_FOLDER_ID=1ABC_YOUR_FOLDER_ID

# Google Sheets with class routine
GOOGLE_SHEETS_ROUTINE_ID=YOUR_SPREADSHEET_ID

# ── AI CHATBOT ───────────────────────────────────────────────────────────────
# Free tier from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSyXXX...

# Python transcriber/embedder service URL
TRANSCRIBER_URL=http://transcriber:8000

# ── INTERNAL API ────────────────────────────────────────────────────────────
INTERNAL_API_SECRET=your-internal-secret-64-hex-chars

# ── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────
# Firebase Admin SDK service account (base64 encoded)
FIREBASE_SERVICE_ACCOUNT_KEY=<base64_encoded_json>
# Web push public key (from Firebase Console)
NEXT_PUBLIC_FCM_VAPID_KEY=BNT_...

# ── LOGGING & MONITORING ────────────────────────────────────────────────────
# Enable query logging in development
NODE_ENV=development
```

---

```typescript
// lib/knowledge-indexer.ts
import { prisma } from './prisma'
import { getEmbedding } from './embeddings'

const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 80

function chunkText(text: string): string[] {
  // Prefer splitting at sentence boundaries to preserve meaning
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) ?? [text]
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if ((current + sentence).length > CHUNK_SIZE) {
      if (current.trim()) chunks.push(current.trim())
      current = current.slice(-CHUNK_OVERLAP) + sentence
    } else {
      current += sentence
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.filter((c) => c.length > 50)
}

/**
 * Index a single knowledge document by creating vector embeddings for text chunks
 */
export async function indexDocument(documentId: string): Promise<number> {
  const doc = await prisma.knowledgeDocument.findUnique({ where: { id: documentId } })
  if (!doc) throw new Error('Document not found')

  // Remove old chunks
  await prisma.knowledgeChunk.deleteMany({ where: { documentId } })

  const textChunks = chunkText(doc.content)

  for (let i = 0; i < textChunks.length; i++) {
    const embedding = await getEmbedding(textChunks[i])

    await prisma.$executeRaw`
      INSERT INTO knowledge_chunks (id, document_id, chunk_index, content, embedding, created_at)
      VALUES (uuid_generate_v4(), ${documentId}::uuid, ${i}, ${textChunks[i]}, ${embedding}::vector, NOW())
    `
  }

  return textChunks.length
}

/**
 * Reindex all knowledge documents (use after updating many documents)
 */
export async function reindexAllDocuments(): Promise<{ total: number; chunks: number }> {
  const docs = await prisma.knowledgeDocument.findMany({ select: { id: true } })
  let totalChunks = 0

  for (const doc of docs) {
    totalChunks += await indexDocument(doc.id)
  }

  return { total: docs.length, chunks: totalChunks }
}
```
