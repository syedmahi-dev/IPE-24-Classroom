# Testing — Full System Test Plan

> [!IMPORTANT]
> **Development Rule:** After creating or developing any new component, module, or feature, you MUST test it first. If the test passes without any errors, ONLY then may you move on to the next task. Do not batch work without intermediate testing.
## Testing Stack

```bash
# Install testing dependencies
cd apps/web
npm install --save-dev \
  vitest \
  @vitejs/plugin-react \
  @testing-library/react \
  @testing-library/user-event \
  @testing-library/jest-dom \
  msw \
  playwright \
  @playwright/test \
  supertest \
  @types/supertest
```

---

## Test Categories

| Category | Tool | What It Tests |
|---|---|---|
| Unit tests | Vitest | Pure functions, utilities, validators |
| Component tests | Vitest + Testing Library | React components |
| API integration tests | Vitest + Supertest | Route handlers with test DB |
| End-to-end tests | Playwright | Full user journeys in browser |
| Load tests | k6 | Performance under concurrent users |
| Security tests | Manual + ZAP | Injection, auth bypass, XSS |

---

## Unit Tests

### Test: Rate Limiter
```typescript
// src/lib/__tests__/rate-limit.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rateLimit } from '@/lib/rate-limit'

// Mock Redis
vi.mock('@/lib/redis', () => ({
  redis: {
    pipeline: vi.fn(() => ({
      zremrangebyscore: vi.fn().mockReturnThis(),
      zadd: vi.fn().mockReturnThis(),
      zcard: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([null, null, [null, 3], null]),
    })),
  },
}))

describe('rateLimit', () => {
  it('allows requests within limit', async () => {
    const result = await rateLimit('test:user1', 10, 60)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(7)  // 10 - 3 = 7
  })

  it('blocks requests exceeding limit', async () => {
    const { redis } = await import('@/lib/redis')
    ;(redis.pipeline as any).mockImplementation(() => ({
      zremrangebyscore: vi.fn().mockReturnThis(),
      zadd: vi.fn().mockReturnThis(),
      zcard: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([null, null, [null, 11], null]),
    }))

    const result = await rateLimit('test:user1', 10, 60)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })
})
```

### Test: HTML Sanitizer
```typescript
// src/lib/__tests__/sanitize.test.ts
import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '@/lib/sanitize'

describe('sanitizeHtml', () => {
  it('allows safe HTML tags', () => {
    const input = '<p>Hello <strong>world</strong></p>'
    expect(sanitizeHtml(input)).toBe('<p>Hello <strong>world</strong></p>')
  })

  it('strips script tags', () => {
    const input = '<script>alert("xss")</script><p>Hello</p>'
    expect(sanitizeHtml(input)).not.toContain('<script>')
    expect(sanitizeHtml(input)).toContain('<p>Hello</p>')
  })

  it('strips event handlers', () => {
    const input = '<p onclick="steal()">Click me</p>'
    expect(sanitizeHtml(input)).not.toContain('onclick')
  })

  it('strips javascript: links', () => {
    const input = '<a href="javascript:alert(1)">Click</a>'
    expect(sanitizeHtml(input)).not.toContain('javascript:')
  })

  it('allows safe anchor tags', () => {
    const input = '<a href="https://iut-dhaka.edu">IUT</a>'
    expect(sanitizeHtml(input)).toContain('href="https://iut-dhaka.edu"')
  })
})
```

### Test: API Response Helpers
```typescript
// src/lib/__tests__/api-response.test.ts
import { describe, it, expect } from 'vitest'
import { ok, err, ERRORS } from '@/lib/api-response'

describe('API response helpers', () => {
  it('ok() returns 200 with data', async () => {
    const res = ok({ id: '123', name: 'Test' })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.id).toBe('123')
  })

  it('ERRORS.UNAUTHORIZED() returns 401', async () => {
    const res = ERRORS.UNAUTHORIZED()
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
  })

  it('ERRORS.FORBIDDEN() returns 403', async () => {
    const res = ERRORS.FORBIDDEN()
    expect(res.status).toBe(403)
  })

  it('ERRORS.RATE_LIMITED() returns 429', async () => {
    const res = ERRORS.RATE_LIMITED()
    expect(res.status).toBe(429)
  })
})
```

### Test: File Sanitization
```typescript
// src/lib/__tests__/file-sanitize.test.ts
import { describe, it, expect } from 'vitest'
import { sanitizeFilename } from '@/lib/file-utils'

describe('sanitizeFilename', () => {
  it('strips path traversal sequences', () => {
    expect(sanitizeFilename('../../etc/passwd')).not.toContain('..')
  })

  it('strips forward slashes', () => {
    expect(sanitizeFilename('folder/file.pdf')).not.toContain('/')
  })

  it('strips backslashes', () => {
    expect(sanitizeFilename('folder\\file.pdf')).not.toContain('\\')
  })

  it('preserves safe characters', () => {
    const safe = 'Lecture-Notes_v2.pdf'
    expect(sanitizeFilename(safe)).toBe(safe)
  })

  it('truncates to 200 characters', () => {
    const long = 'a'.repeat(300) + '.pdf'
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(200)
  })
})
```

---

## Component Tests

### Test: AnnouncementCard
```typescript
// src/components/announcements/__tests__/AnnouncementCard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnnouncementCard } from '../AnnouncementCard'

const mockAnnouncement = {
  id: '1',
  title: 'Mid-Term Exam Schedule',
  body: '<p>Mid-term exams start on November 15th.</p>',
  type: 'exam' as const,
  publishedAt: new Date('2024-11-01'),
  author: { name: 'CR Test' },
}

describe('AnnouncementCard', () => {
  it('renders title', () => {
    render(<AnnouncementCard announcement={mockAnnouncement} />)
    expect(screen.getByText('Mid-Term Exam Schedule')).toBeInTheDocument()
  })

  it('shows type badge', () => {
    render(<AnnouncementCard announcement={mockAnnouncement} />)
    expect(screen.getByText('Exam')).toBeInTheDocument()
  })

  it('shows author name', () => {
    render(<AnnouncementCard announcement={mockAnnouncement} />)
    expect(screen.getByText(/CR Test/)).toBeInTheDocument()
  })

  it('does not render script tags from body', () => {
    const xssAnnouncement = { ...mockAnnouncement, body: '<script>alert("xss")</script><p>Safe</p>' }
    render(<AnnouncementCard announcement={xssAnnouncement} />)
    expect(document.querySelector('script')).toBeNull()
    expect(screen.getByText('Safe')).toBeInTheDocument()
  })
})
```

---

## API Integration Tests

Use a separate test database. Set `TEST_DATABASE_URL` in `.env.test`.

### Setup
```typescript
// vitest.setup.ts
import { execSync } from 'child_process'

beforeAll(() => {
  // Apply migrations to test DB
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL }
  })
})

afterAll(async () => {
  // Clean up test DB
  const { prisma } = await import('@/lib/prisma')
  await prisma.$executeRaw`TRUNCATE TABLE users, announcements, sessions CASCADE`
})
```

### Test: Authentication Flow
```typescript
// src/app/api/v1/__tests__/announcements.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { GET } from '../announcements/route'

describe('GET /api/v1/announcements', () => {
  it('returns 401 when not authenticated', async () => {
    // Mock auth() to return null
    vi.mock('@/lib/auth', () => ({ auth: vi.fn().mockResolvedValue(null) }))

    const req = new Request('http://localhost/api/v1/announcements')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns paginated announcements for authenticated users', async () => {
    vi.mock('@/lib/auth', () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: 'user-1', email: 'test@iut-dhaka.edu', role: 'student' }
      })
    }))

    // Seed test announcement
    await prisma.announcement.create({
      data: { title: 'Test', body: '<p>Test</p>', type: 'general',
              isPublished: true, publishedAt: new Date(), authorId: 'user-1' }
    })

    const req = new Request('http://localhost/api/v1/announcements?page=1&limit=10')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.length).toBeGreaterThan(0)
    expect(json.meta.total).toBeGreaterThan(0)
  })

  it('rejects invalid page parameter', async () => {
    const req = new Request('http://localhost/api/v1/announcements?page=abc')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })
})
```

---

## End-to-End Tests (Playwright)

### Setup (`playwright.config.ts`)
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
})
```

### Test: Login Flow
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test('non-IUT email shows error', async ({ page }) => {
  await page.goto('/login')
  // This would need to mock the OAuth flow in E2E
  // In practice, test with a real IUT test account
  await expect(page.getByText('Sign in with Google')).toBeVisible()
})

test('authenticated student sees dashboard', async ({ page }) => {
  // Use a stored auth state (set up once with a real IUT test account)
  await page.goto('/dashboard')
  await expect(page.getByText('Dashboard')).toBeVisible()
  await expect(page.getByText('Latest Announcements')).toBeVisible()
})

test('student cannot access admin pages', async ({ page }) => {
  // Using student auth state
  await page.goto('/admin')
  // Should redirect to dashboard
  await expect(page).toHaveURL('/dashboard')
})
```

### Test: Chatbot
```typescript
// e2e/chatbot.spec.ts
import { test, expect } from '@playwright/test'

test('chatbot shows initial message', async ({ page }) => {
  await page.goto('/chat')
  await expect(page.getByText("I'm your Virtual CR")).toBeVisible()
})

test('chatbot responds to questions', async ({ page }) => {
  await page.goto('/chat')
  const input = page.getByPlaceholder('Ask anything about IPE-24...')
  await input.fill('What is the class routine?')
  await input.press('Enter')

  // Wait for response (streaming might take a few seconds)
  await expect(page.locator('.message-assistant').last()).not.toBeEmpty({ timeout: 15000 })
})
```

### Test: Announcement Feed
```typescript
// e2e/announcements.spec.ts
import { test, expect } from '@playwright/test'

test('dashboard shows announcements', async ({ page }) => {
  await page.goto('/dashboard')
  // If test announcements are seeded, they should appear
  await expect(page.locator('[data-testid="announcement-card"]').first()).toBeVisible()
})

test('resources page loads files', async ({ page }) => {
  await page.goto('/resources')
  await expect(page.getByText('Resources')).toBeVisible()
})
```

---

## Load Tests (k6)

```javascript
// load-tests/api-load.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m',  target: 20 },   // Stay at 20 (class of ~40, peak 50%)
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2s
    http_req_failed: ['rate<0.01'],     // Less than 1% errors
  },
}

const BASE = 'https://your-domain.me'
const SESSION_COOKIE = 'next-auth.session-token=test-student-token'

export default function () {
  // Dashboard
  const dashRes = http.get(`${BASE}/dashboard`, {
    headers: { Cookie: SESSION_COOKIE }
  })
  check(dashRes, { 'dashboard 200': (r) => r.status === 200 })

  // Announcements API
  const annRes = http.get(`${BASE}/api/v1/announcements`, {
    headers: { Cookie: SESSION_COOKIE }
  })
  check(annRes, { 'announcements 200': (r) => r.status === 200 })

  // Routine (Google Sheets cached)
  const routineRes = http.get(`${BASE}/api/v1/routine`, {
    headers: { Cookie: SESSION_COOKIE }
  })
  check(routineRes, { 'routine 200': (r) => r.status === 200 })

  sleep(1)
}
```

Run with:
```bash
docker run --rm -i grafana/k6 run - < load-tests/api-load.js
```

---

## Test Coverage Targets

| Area | Target Coverage |
|---|---|
| Utility functions (`lib/`) | 90% |
| API route handlers | 80% |
| React components | 70% |
| E2E critical paths | 100% of listed journeys |

Run coverage:
```bash
npx vitest run --coverage
```

---

## Critical User Journeys (E2E Must Pass)

1. ✅ Student logs in with IUT Google account → sees dashboard
2. ✅ Non-IUT email login → shows error page
3. ✅ Student views announcement list → can scroll paginated
4. ✅ Student asks chatbot question → receives non-empty answer
5. ✅ Student votes in poll → cannot vote again
6. ✅ Student joins study group → appears in group member list
7. ✅ Student visits `/admin` → redirected to `/dashboard`
8. ✅ Admin creates announcement → appears in student feed
9. ✅ Admin uploads file → appears in resource library
10. ✅ Rate limit: chatbot returns 429 after 20 requests

---

## Regression Test Checklist (Run Before Every Deploy)

```bash
# 1. Lint and type check
npm run lint
npx tsc --noEmit

# 2. Unit + integration tests
npx vitest run

# 3. Security audit
npm audit --audit-level=high

# 4. Build check
npm run build

# 5. E2E smoke test (critical paths only, fast)
npx playwright test --project=chromium e2e/auth.spec.ts e2e/chatbot.spec.ts
```

Add all steps to GitHub Actions CI so they run automatically on every pull request and push.
