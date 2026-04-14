---
name: ipe24-web
description: "IPE-24 Class Portal — full-stack Next.js 14 class management system. Includes Next.js frontend, backend API routes, Prisma ORM, PostgreSQL, Redis, NextAuth.js, AI chatbot with RAG, voice transcription, and multi-platform publishing. This project guides AI on architecture, conventions, build/test commands, auth patterns, Zod validation, Tailwind styling, testing requirements, and database design."
---

# IPE-24 Class Portal Workspace Instructions

## Project Quick Facts

**IPE-24 Class Portal** is a full-stack web application for the Islamic University of Technology (IUT) batch. Restricted to `@iut-dhaka.edu` Google accounts. Replaces fragmented WhatsApp/PDF updates with a single portal that auto-publishes to Discord, Telegram, WhatsApp, and push notifications.

- **Status:** ~8% complete (foundation + patterns ready for 20 remaining pages/API routes)
- **Stack:** Next.js 14, TypeScript, Tailwind CSS, PostgreSQL 16 + pgvector, Redis 7, Prisma ORM
- **Auth:** NextAuth.js v5 (Google OAuth + dev credentials for testing)
- **Testing:** Vitest + Testing Library + Playwright (required before committing)
- **Cost:** $0 (self-hosted + free tiers)

---

## Repository Structure

```
ipe24-web/
├── apps/
│   ├── web/                    # Main Next.js application
│   │   ├── src/
│   │   │   ├── app/            # Next.js 14 App Router (pages + layouts + API routes)
│   │   │   ├── components/     # React components (organized by feature)
│   │   │   ├── lib/            # Utilities, auth, validators, database client
│   │   │   ├── types/          # TypeScript interfaces
│   │   │   └── middleware.ts   # Auth + role-based access control
│   │   ├── prisma/             # Database schema + migrations
│   │   └── vitest.config.ts    # Test configuration
│   ├── bot/                    # WhatsApp Baileys bot
│   └── web.Dockerfile
├── services/
│   ├── transcriber/            # Python: faster-whisper + sentence-transformers CLI
│   ├── discord-bot/            # discord.js bot for Discord server
│   ├── telegram-bot/           # Telegraf.js bot for CR control
│   └── [service].Dockerfile
├── infrastructure/
│   ├── docker-compose.yml      # Postgres, Redis, Transcriber services
│   ├── postgres/
│   │   └── init.sql            # Schema initialization
│   └── nginx/
│       └── ipe24.conf          # Nginx reverse proxy
├── docs/                       # Full documentation (00-12 files)
│   ├── 00_PROJECT_OVERVIEW.md
│   ├── 01_TECH_STACK.md
│   ├── 02_ARCHITECTURE.md
│   ├── 03_ROLES_AND_PERMISSIONS.md
│   ├── 04_DATABASE.md
│   ├── 05_BACKEND.md
│   ├── 06_FRONTEND.md
│   ├── 06a_STUDENT_UI.md
│   ├── 06b_ADMIN_UI.md
│   ├── 06c_SUPER_ADMIN_UI.md
│   ├── 07_AUTH.md
│   ├── 08_AI_CHATBOT.md
│   ├── 09_AUTOMATION.md
│   ├── 10_SECURITY.md
│   ├── 11_TESTING.md
│   └── 12_DEPLOYMENT.md
├── IMPLEMENTATION_PLAN.md      # Phase breakdown for remaining work
├── SYNTHESIS_COMPLETED.md      # What's done vs. next steps
├── README.md                   # Getting started guide
└── .github/
    └── workflows/
        └── deploy.yml          # GitHub Actions CI/CD
```

---

## Getting Started (Development Environment)

### 1. Start Infrastructure Services

```bash
cd infrastructure
docker compose up -d postgres redis transcriber
# Postgres: localhost:5432
# Redis: localhost:6379
```

### 2. Configure Web App

```bash
cd apps/web
cp .env.example .env

# Fill in .env with:
# - NEXTAUTH_URL=http://localhost:3000
# - NEXTAUTH_SECRET=<random>
# - GOOGLE_CLIENT_ID=<from GCP>
# - GOOGLE_CLIENT_SECRET=<from GCP>
# - DATABASE_URL=postgresql://...
# - REDIS_URL=redis://localhost:6379
# - GEMINI_API_KEY=<from Google AI>
# - FIREBASE_PROJECT_ID / FIREBASE_PRIVATE_KEY / FIREBASE_CLIENT_EMAIL
```

### 3. Install & Initialize Database

```bash
npm install
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Run pending migrations
npm run db:seed          # Load test data
```

### 4. Start Development Server

```bash
npm run dev
# Open http://localhost:3000
```

---

## Essential Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js dev server with hot reload |
| `npm run build` | Build for production (runs type-check + next build) |
| `npm run lint` | Run ESLint on source code |
| `npm run type-check` | TypeScript validation (no build output) |
| `npm test` | Run all tests (vitest in run mode) |
| `npm run test:watch` | Run tests in watch mode (during development) |
| `npm run test:coverage` | Generate coverage report |
| `npx prisma migrate dev` | Create + run database migrations |
| `npx prisma migrate reset` | Drop DB and re-seed (dev only) |
| `npx prisma studio` | Open web UI for browsing database |
| `npm run db:seed` | Run seed script (load test data) |

---

## Architecture & Key Patterns

### API Route Pattern (RESTful v1)

All endpoints live in `src/app/api/v1/[resource]/route.ts`:

```typescript
// GET /api/v1/announcements (public read, authenticated)
// POST /api/v1/announcements (admin only)
// PATCH /api/v1/announcements/[id] (admin only)
// DELETE /api/v1/announcements/[id] (admin only)
```

**Key Guards in Every API Route:**
1. **Auth Check** – via `middleware.ts` (runs before route handler)
2. **Role Check** – inside route handler (admin/CR/student)
3. **Input Validation** – Zod schema
4. **Error Handling** – standardized response format
5. **Rate Limiting** – optional, key routes get `rateLimit()` call

### Example API Route Structure

```typescript
// src/app/api/v1/announcements/route.ts
import { apiGuard } from '@/lib/api-guards'
import { apiResponse } from '@/lib/api-response'
import { announcementSchema } from '@/lib/validators'
import { requireAdmin } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  const { user } = await apiGuard(req)  // throws 401 if not authenticated
  
  const { page = 1, type } = Object.fromEntries(new URL(req.url).searchParams)
  const announcements = await prisma.announcement.findMany({
    where: type ? { type } : undefined,
    skip: (page - 1) * 20,
    take: 20,
    orderBy: { createdAt: 'desc' },
  })
  
  return apiResponse(200, 'Announcements fetched', { announcements })
}

export async function POST(req: Request) {
  const { user } = await apiGuard(req)
  requireAdmin(user)  // throws 403 if not admin
  
  const body = announcementSchema.parse(await req.json())  // throws 400 if invalid
  
  const announcement = await prisma.announcement.create({ data: body })
  
  return apiResponse(201, 'Announcement created', { announcement })
}
```

### Component & Page Organization

**Pages** are organized by feature under route groups:
- `(student)` – `/announcements`, `/routine`, `/exams`, `/chat`, `/profile`
- `(admin)` – `/admin`, `/admin/announcements`, `/admin/users`
- `(auth)` – `/login`, `/auth/error`

**Components** are mirrored in `/components/[feature]/`:
```
components/
├── announcements/       # AnnouncementCard, AnnouncementList, AnnouncementForm
├── admin/              # AdminCard, AdminStats, AdminLayout
├── chat/               # ChatInterface, MessageList, ChatInput
├── layout/             # Navbar, Sidebar, Footer, AdminSidebar
├── exams/              # ExamCountdown, ExamTable, ExamModal
└── ui/                 # Generic: Button, Modal, Input, Select (shadcn style)
```

### Authentication Pattern (NextAuth.js v5)

```typescript
// Middleware: applied to all routes automatically
export async function middleware(req: NextRequest) {
  const { auth } = await NextAuth(...authConfig)
  
  // For protected routes: redirect to /login if not authenticated
  if (!auth && isProtectedRoute(req.pathname)) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  
  return NextResponse.next()
}
```

**In Components/Pages:**
```typescript
import { auth } from '@/lib/auth'

export default async function ProtectedPage() {
  const session = await auth()
  if (!session) redirect('/login')
  
  const user = session.user  // { id, email, name, role, ... }
  return <h1>Welcome, {user.name}</h1>
}
```

**In API Routes:**
```typescript
// Use apiGuard() to get authenticated user or throw 401
const { user } = await apiGuard(req)
console.log(user.role)  // 'admin' | 'cr' | 'student'
```

---

## Database & Prisma ORM

### Schema Structure
- **User** – Google OAuth identity + profile
- **Role** – admin, CR, student (via user.role enum)
- **Announcement** – type (general/exam/file/routine), creator, timestamps
- **Exam** – course, date, room, duration
- **Routine** – day, hour, course, instructor (synced from Google Sheets)
- **StudyGroup** – title, course, creator, members
- **ChatSession** – user, messages, RAG context, token usage
- **Poll** – title, options, expiry, votes

Full schema: `apps/web/prisma/schema.prisma`

### Key Prisma Commands

```bash
npx prisma migrate dev --name <description>    # Create + run migration
npx prisma migrate reset                        # Drop & re-seed (dev only)
npx prisma studio                              # Browse data in web UI
npx prisma generate                            # Regenerate client (after schema change)
npx prisma db execute --stdin < script.sql     # Raw SQL execution
```

**Tip:** Always commit migration files to git. The `.prisma/` folder should be ignored.

---

## Validation & Error Handling

### Zod Validation Pattern

Define validators in `src/lib/validators.ts`:

```typescript
import { z } from 'zod'

export const announcementSchema = z.object({
  title: z.string().min(5, 'Title too short').max(200),
  content: z.string().min(10),
  type: z.enum(['general', 'exam', 'file', 'routine']),
  tags: z.array(z.string()).default([]),
})

export type Announcement = z.infer<typeof announcementSchema>
```

Use in routes:
```typescript
const body = announcementSchema.parse(await req.json())  // throws ZodError → 400
```

### Response Format (Standard)

All API routes return JSON in this format (via `apiResponse()` helper):

```json
{
  "success": true,
  "status": 200,
  "message": "Resource fetched successfully",
  "data": { /* ... */ },
  "timestamp": "2024-04-14T10:30:00Z",
  "errors": null
}
```

On error:
```json
{
  "success": false,
  "status": 400,
  "message": "Validation failed",
  "data": null,
  "timestamp": "2024-04-14T10:30:00Z",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

---

## Testing Requirements

**⚠️ RULE: Before committing ANY code, tests must pass.**

Test file location: `src/[feature]/__tests__/[name].test.ts`

### Test Categories

| Type | Framework | Examples |
|---|---|---|
| **Unit** | Vitest | Pure functions, validators, utilities |
| **Component** | Vitest + Testing Library | React component rendering + user interactions |
| **API Integration** | Vitest + Supertest | Route handlers with real/test database |
| **E2E** | Playwright | Full user journeys in browser |

### Unit Test Example

```typescript
// src/lib/__tests__/rate-limit.test.ts
import { describe, it, expect } from 'vitest'
import { rateLimit } from '@/lib/rate-limit'

describe('rateLimit', () => {
  it('allows requests within limit', async () => {
    const result = await rateLimit('test:user1', 10, 60)
    expect(result.success).toBe(true)
  })

  it('blocks requests exceeding limit', async () => {
    const result = await rateLimit('test:user1', 1, 60)
    expect(result.success).toBe(false)
  })
})
```

### Component Test Example

```typescript
// src/components/announcements/__tests__/AnnouncementCard.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import AnnouncementCard from '../AnnouncementCard'

describe('AnnouncementCard', () => {
  it('renders announcement title', () => {
    render(
      <AnnouncementCard
        title="Test Announcement"
        content="Lorem ipsum"
        type="general"
        createdAt={new Date()}
        author="Admin"
      />
    )
    expect(screen.getByText('Test Announcement')).toBeInTheDocument()
  })
})
```

### API Route Test Example

```typescript
// src/app/api/v1/announcements/__tests__/route.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '@/app'
import prisma from '@/lib/prisma'

describe('GET /api/v1/announcements', () => {
  it('returns paginated announcements', async () => {
    const res = await request(app).get('/api/v1/announcements')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data.announcements')
  })

  it('returns 401 if not authenticated', async () => {
    const res = await request(app)
      .get('/api/v1/announcements')
      .set('Authorization', 'Bearer invalid')
    expect(res.status).toBe(401)
  })
})
```

---

## Styling & UI

- **Framework:** Tailwind CSS v4
- **Component Library:** Custom components (shadcn/ui inspired)
- **Theme:** Light/dark modes via `next-themes`
- **Colors:** 
  - Primary: Indigo/Purple (for admin/CR features)
  - Secondary: Cyan/Blue (for student features)
  - Neutral: Gray (standard surfaces)

**Component Patterns:**
- Use `cn()` utility (via `tailwind-merge`) to merge Tailwind classes
- Responsive design: mobile-first (sm:, md:, lg:)
- Dark mode: `dark:` prefix

```tsx
import { cn } from '@/lib/utils'

export function Button({ className, ...props }) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700',
        'dark:bg-indigo-500 dark:hover:bg-indigo-600',
        className,
      )}
      {...props}
    />
  )
}
```

---

## Common Development Tasks

### Adding a New Student Page

1. Create route: `src/app/(student)/[feature]/page.tsx`
2. Create API route: `src/app/api/v1/[resource]/route.ts`
3. Create components: `src/components/[feature]/[ComponentName].tsx`
4. Add database schema changes (if needed) to `prisma/schema.prisma`
5. Run `npx prisma migrate dev`
6. Write tests: `__tests__/[name].test.ts`
7. Run `npm test` (all tests pass?)
8. Commit to git

### Adding a New API Endpoint

1. Create route file: `src/app/api/v1/[resource]/route.ts` or `[id]/route.ts`
2. Import guards: `apiGuard`, `requireAdmin`, `rateLimit`
3. Define Zod schema in `src/lib/validators.ts`
4. Use Prisma ORM for database queries
5. Return `apiResponse(status, message, data)`
6. Write tests with Supertest + test fixtures
7. Run `npm test` to verify

### Modifying Database Schema

1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name [description]`
3. Prisma generates `.sql` file in `migrations/[timestamp]_[name]/migration.sql`
4. Review SQL before proceeding
5. Commit migration file
6. Update any related Zod schemas or types

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `next` (v14) | React framework + App Router |
| `typescript` | Static type checking |
| `prisma` | ORM + migrations |
| `next-auth` (v5) | OAuth + sessions |
| `zod` | Input validation + type inference |
| `tailwind-css` | Styling framework |
| `react-hook-form` | Form handling |
| `swr` | Data fetching + caching |
| `zustand` | State management |
| `sonner` | Toast notifications |
| `lucide-react` | Icon library |
| `vitest` | Unit/integration testing |
| `@testing-library/react` | Component testing |
| `playwright` | E2E testing |
| `firebase-admin` | FCM push notifications |
| `@google/generative-ai` | Gemini API (AI chatbot) |

---

## Security & Best Practices

### Authentication & Authorization
- All protected routes enforce user session via middleware
- API routes use `apiGuard()` to verify JWT token
- Role-based access: `requireAdmin()`, `requireCR()` guards
- Environment variables for secrets (never commit `.env`)

### Input Validation
- All user input validated with Zod before processing
- SQL injection prevented via Prisma parameterized queries
- XSS prevention: sanitize HTML via `isomorphic-dompurify`

### Rate Limiting
- Key routes use Redis-backed rate limiter
- Limits by user ID to prevent abuse of costly operations (e.g., AI chat)

### Database
- RLS (Row-Level Security) for multi-tenant isolation
- Migrations version-controlled in git
- Test database auto-reset via `npx prisma migrate reset`

---

## Documentation Links

Refer to these for deeper context:

| Doc | Topics |
|---|---|
| [00_PROJECT_OVERVIEW.md](../../docs/00_PROJECT_OVERVIEW.md) | Goals, features, glossary |
| [01_TECH_STACK.md](../../docs/01_TECH_STACK.md) | All technologies explained |
| [02_ARCHITECTURE.md](../../docs/02_ARCHITECTURE.md) | System design, API contracts |
| [03_ROLES_AND_PERMISSIONS.md](../../docs/03_ROLES_AND_PERMISSIONS.md) | Access control matrix |
| [04_DATABASE.md](../../docs/04_DATABASE.md) | Schema, vectors, migrations |
| [05_BACKEND.md](../../docs/05_BACKEND.md) | API routes, business logic |
| [06_FRONTEND.md](../../docs/06_FRONTEND.md) | Pages, components, styling |
| [07_AUTH.md](../../docs/07_AUTH.md) | Google OAuth, JWT, sessions |
| [08_AI_CHATBOT.md](../../docs/08_AI_CHATBOT.md) | RAG pipeline, Gemini |
| [09_AUTOMATION.md](../../docs/09_AUTOMATION.md) | Telegram, n8n, publishing |
| [10_SECURITY.md](../../docs/10_SECURITY.md) | Threats, mitigations, audit |
| [11_TESTING.md](../../docs/11_TESTING.md) | Test strategy, examples |
| [12_DEPLOYMENT.md](../../docs/12_DEPLOYMENT.md) | Server setup, Docker, CI/CD |

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Prisma Client Mismatch
```bash
npm install
npx prisma generate
```

### Test Failures
```bash
npm run test:watch      # Run in watch mode for debugging
npm run test:coverage   # Check coverage gaps
```

### Database Connection Issues
```bash
# Check if Postgres is running
docker compose ps   # Should show 'postgres' as 'Up'
docker compose logs postgres   # View logs

# Reset database
npx prisma migrate reset      # ⚠️ Deletes all data in dev!
```

---

## AI Agent Guidelines for This Workspace

When working on this project, follow these principles:

1. **Always run tests before committing** — `npm test` must pass
2. **Follow the API pattern** — `apiGuard()` → validate → query → `apiResponse()`
3. **Use Zod validators** — Define in `lib/validators.ts`, use in routes
4. **Organize components by feature** — Group related components in folders
5. **Document new endpoints** — Add to `05_BACKEND.md` or UPDATE as needed
6. **Check `IMPLEMENTATION_PLAN.md`** — See what pages/routes are prioritized
7. **Reference existing patterns** — Don't invent new conventions; replicate existing structure
8. **Test-first mindset** — Write test for edge cases before implementing feature
9. **Commit messages** — Be specific: "feat: add exam countdown timer" not "update code"
10. **Ask for clarification** — If unsure about architecture or requirements, ask the user

---

## Next Steps

The project is ready for rapid implementation. See `IMPLEMENTATION_PLAN.md` for:
- 9 student pages (announcements, routine, resources, exams, polls, study groups, chat, profile)
- 2 auth pages (login, error)
- 9 admin pages (overview, announcements, users, exams, files, etc.)

Each page follows the established pattern and takes ~30 min to implement once the API route is done.

**Ready to get started? Pick a page from the IMPLEMENTATION_PLAN and let's build!**
