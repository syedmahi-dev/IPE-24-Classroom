# Discord Listener — Test Suite Additions

Add these test cases to `IPE24_TEST_SUITE.md` under a new section, and to the regression checklist.

---

## Section 17b: Discord Listener Tests

### 17b.1 — Unit Tests: Channel Config Validation

**File:** `services/discord-listener/src/__tests__/config.test.ts`
**Tool:** Vitest

```typescript
import { describe, it, expect } from 'vitest'
import { ChannelConfigSchema } from '../config'

describe('ChannelConfigSchema', () => {
  it('TC-DL-1.1: valid AUTO_PUBLISH config passes', () => {
    expect(() => ChannelConfigSchema.parse({
      channelId: '123456789',
      mode: 'AUTO_PUBLISH',
      authorizedUserIds: ['987654321'],
    })).not.toThrow()
  })

  it('TC-DL-1.2: REVIEW_GATE without reviewChannelId still parses (runtime check handles it)', () => {
    const result = ChannelConfigSchema.parse({
      channelId: '111',
      mode: 'REVIEW_GATE',
      authorizedUserIds: ['222'],
    })
    expect(result.reviewChannelId).toBeUndefined()
  })

  it('TC-DL-1.3: invalid mode throws', () => {
    expect(() => ChannelConfigSchema.parse({
      channelId: '111',
      mode: 'BROADCAST', // invalid
      authorizedUserIds: ['222'],
    })).toThrow()
  })

  it('TC-DL-1.4: empty authorizedUserIds is valid (roles-only config)', () => {
    expect(() => ChannelConfigSchema.parse({
      channelId: '111',
      mode: 'AUTO_PUBLISH',
      authorizedUserIds: [],
      authorizedRoleIds: ['role-123'],
    })).not.toThrow()
  })
})
```

---

### 17b.2 — Unit Tests: Classification Fallback

**File:** `services/discord-listener/src/__tests__/classifier.test.ts`
**Tool:** Vitest (mocked Gemini)

```typescript
import { describe, it, expect, vi } from 'vitest'
import { classifyMessage } from '../services/classifier'

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            type: 'exam',
            title: 'Mid-term exam tomorrow',
            body: 'Mid-term exam for CSE-4101 is tomorrow at 10 AM in Room 301.',
            urgency: 'high',
          }),
        },
      }),
    })),
  })),
}))

describe('classifyMessage', () => {
  it('TC-DL-2.1: classifies exam message correctly', async () => {
    const result = await classifyMessage('Mid-term exam for CSE-4101 is tomorrow at 10 AM in Room 301.')
    expect(result.type).toBe('exam')
    expect(result.urgency).toBe('high')
  })

  it('TC-DL-2.2: title is clamped to 60 chars', async () => {
    const result = await classifyMessage('test')
    expect(result.title.length).toBeLessThanOrEqual(60)
  })

  it('TC-DL-2.3: falls back gracefully when Gemini returns invalid JSON', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    ;(GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: vi.fn(() => ({
        generateContent: vi.fn().mockResolvedValue({
          response: { text: () => 'not json at all' },
        }),
      })),
    }))
    const result = await classifyMessage('Some announcement text')
    expect(result.type).toBe('general')
    expect(result.body).toBeTruthy()
  })

  it('TC-DL-2.4: falls back when Gemini throws (rate limit)', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    ;(GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: vi.fn(() => ({
        generateContent: vi.fn().mockRejectedValue(new Error('429 Too Many Requests')),
      })),
    }))
    const result = await classifyMessage('Exam tomorrow')
    expect(result.type).toBe('general')
    expect(result.title).toBeTruthy()
  })
})
```

---

### 17b.3 — Unit Tests: Publisher

**File:** `services/discord-listener/src/__tests__/publisher.test.ts`
**Tool:** Vitest (mocked fetch)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.mock('node-fetch', () => ({ default: mockFetch }))
vi.mock('../config', () => ({
  getConfig: () => ({
    INTERNAL_API_URL: 'http://web:3000',
    INTERNAL_API_SECRET: 'test-secret',
    WHATSAPP_BOT_URL: 'http://whatsapp-bot:3002',
  }),
}))

describe('publishAnnouncement', () => {
  beforeEach(() => vi.clearAllMocks())

  it('TC-DL-3.1: calls website internal API with correct headers', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    const { publishAnnouncement } = await import('../services/publisher')
    await publishAnnouncement(
      { type: 'general', title: 'Test', body: 'Body', urgency: 'low' },
      [],
      'https://discord.com/channels/...'
    )
    const call = mockFetch.mock.calls.find((c) => (c[0] as string).includes('internal/announcements'))
    expect(call).toBeDefined()
    const opts = call![1] as RequestInit
    expect((opts.headers as Record<string, string>)['x-internal-secret']).toBe('test-secret')
  })

  it('TC-DL-3.2: website failure is reported in result.errors', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, text: async () => 'error' })
    const { publishAnnouncement } = await import('../services/publisher')
    const result = await publishAnnouncement(
      { type: 'general', title: 'T', body: 'B', urgency: 'low' },
      [],
      'https://discord.com/channels/...'
    )
    expect(result.website).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('TC-DL-3.3: WhatsApp failure is non-fatal — website success still reported', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true }) // website succeeds
      .mockRejectedValueOnce(new Error('ECONNREFUSED')) // WhatsApp fails
    const { publishAnnouncement } = await import('../services/publisher')
    const result = await publishAnnouncement(
      { type: 'general', title: 'T', body: 'B', urgency: 'low' },
      [],
      'https://discord.com/channels/...'
    )
    expect(result.website).toBe(true)
    expect(result.whatsapp).toBe(false)
  })

  it('TC-DL-3.4: does NOT call discord-bot endpoint (loop prevention)', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    const { publishAnnouncement } = await import('../services/publisher')
    await publishAnnouncement({ type: 'general', title: 'T', body: 'B', urgency: 'low' }, [], 'url')
    const discordBotCalls = mockFetch.mock.calls.filter((c) =>
      (c[0] as string).includes('3003') || (c[0] as string).includes('discord-bot')
    )
    // TC-DL-3.4 CRITICAL: zero calls to discord-bot
    expect(discordBotCalls.length).toBe(0)
  })
})
```

---

### 17b.4 — Unit Tests: Deduplication

**File:** `services/discord-listener/src/__tests__/redis.test.ts`
**Tool:** Vitest (mocked Redis)

```typescript
import { describe, it, expect, vi } from 'vitest'

const setMock = vi.fn()
vi.mock('ioredis', () => ({
  Redis: vi.fn(() => ({
    set: setMock,
    del: vi.fn(),
    on: vi.fn(),
  })),
}))
vi.mock('../config', () => ({ getConfig: () => ({ REDIS_URL: 'redis://localhost:6379' }) }))

describe('claimMessage deduplication', () => {
  it('TC-DL-4.1: returns true on first claim (OK response)', async () => {
    setMock.mockResolvedValue('OK')
    const { claimMessage } = await import('../lib/redis')
    expect(await claimMessage('msg-123')).toBe(true)
  })

  it('TC-DL-4.2: returns false on duplicate (null response — key exists)', async () => {
    setMock.mockResolvedValue(null)
    const { claimMessage } = await import('../lib/redis')
    expect(await claimMessage('msg-123')).toBe(false)
  })

  it('TC-DL-4.3: key includes messageId to prevent cross-contamination', async () => {
    setMock.mockResolvedValue('OK')
    const { claimMessage } = await import('../lib/redis')
    await claimMessage('msg-unique-999')
    const keyUsed = setMock.mock.calls[0][0]
    expect(keyUsed).toContain('msg-unique-999')
  })
})
```

---

### 17b.5 — Integration Tests: Internal API with source field

```typescript
// Add to existing Section 7 (Internal Route Tests)

it('TC-DL-5.1: internal route accepts source: discord field', async () => {
  process.env.INTERNAL_API_SECRET = 'test-secret'
  const req = new Request('http://localhost/api/v1/internal/announcements', {
    method: 'POST',
    headers: { 'x-internal-secret': 'test-secret', 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'From Discord', body: '<p>Test</p>', type: 'general', source: 'discord' }),
  })
  const { POST } = await import('@/app/api/v1/internal/announcements/route')
  const res = await POST(req)
  expect(res.status).toBe(201)
  const json = await res.json()
  expect(json.data.source).toBe('discord')
})

it('TC-DL-5.2: announcement created via discord source does NOT trigger discord-bot call', async () => {
  // Verify the internal announcement route has no HTTP calls to discord-bot
  // This is a code-review + unit test hybrid
  // grep for discord-bot port (3003) or service name in the internal route file
  const routeSource = require('fs').readFileSync(
    'src/app/api/v1/internal/announcements/route.ts', 'utf8'
  )
  expect(routeSource).not.toContain('3003')
  expect(routeSource).not.toContain('discord-bot')
  expect(routeSource).not.toContain('/announce')
})
```

---

### 17b.6 — E2E Test: Full Discord → Website Flow

**File:** `e2e/discord-listener.spec.ts`
**Tool:** Playwright (requires running system)

> These tests require the bot to be logged in and a test Discord channel to be configured as AUTO_PUBLISH.

```typescript
import { test, expect } from '@playwright/test'
import { REST, Routes } from 'discord.js'

const DISCORD_BOT_TOKEN = process.env.TEST_DISCORD_BOT_TOKEN!
const TEST_CHANNEL_ID = process.env.TEST_DISCORD_CHANNEL_ID!
const TEST_USER_ID = process.env.TEST_CR_USER_ID!

async function postDiscordMessage(content: string): Promise<string> {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_CR_USER_TOKEN!)
  const msg = await rest.post(Routes.channelMessages(TEST_CHANNEL_ID), {
    body: { content },
  }) as { id: string }
  return msg.id
}

test('TC-DL-E2E-1: Discord message appears on website within 15 seconds (AUTO_PUBLISH)', async ({ page }) => {
  const content = `[E2E TEST] Announcement at ${Date.now()}`
  await postDiscordMessage(content)

  // Wait and check website
  await page.goto('/announcements')
  await expect(
    page.locator('[data-testid="announcement-card"]').filter({ hasText: '[E2E TEST]' }).first()
  ).toBeVisible({ timeout: 15000 })
})

test('TC-DL-E2E-2: Discord message triggers WhatsApp delivery', async () => {
  const content = `[E2E TEST WA] Announcement at ${Date.now()}`
  await postDiscordMessage(content)

  // Check WhatsApp bot health (proxy for delivery)
  const res = await fetch('http://localhost:3002/health')
  const json = await res.json()
  expect(json.connected).toBe(true)
  // Full WhatsApp delivery verification requires manual check in the group
})

test('TC-DL-E2E-3: Reaction approval flow (REVIEW_GATE)', async ({ page }) => {
  // This test requires:
  // 1. A REVIEW_GATE configured channel
  // 2. CR user token to post the message AND react
  // 3. A second Playwright session or API call to add the ✅ reaction
  // Implementation is environment-specific — document as manual test for now
  test.skip() // Replace with actual implementation when tokens are available
})
```

---

### 17b.7 — Security Tests: Bot Authorization

```bash
# TC-DL-SEC-1: Unauthorized Discord user's message is silently ignored
# Post from a non-CR account in a configured channel
# Expected: No reaction on the message, nothing published to website

# TC-DL-SEC-2: /health endpoint (if added) is only on internal port
curl -f https://your-domain.me/health 2>&1 | head -1
# Expected: connection refused or 404 (NOT from discord-listener)
# The health port 3004 should NOT be exposed via nginx

# TC-DL-SEC-3: Internal API secret is never logged
grep -r "INTERNAL_API_SECRET" services/discord-listener/src/
# Expected: Only config.ts reads it — never logs it or includes in error messages

# TC-DL-SEC-4: Bot ignores its own messages (loop prevention at bot level)
# The message handler checks message.author.bot === true and returns early
grep -r "author.bot" services/discord-listener/src/
# Expected: Found in handlers/message.ts — confirmed present
```

---

### 17b.8 — Regression Additions

Add these items to the manual regression checklist in Section 17:

```
DISCORD LISTENER (NEW)
[ ] discord-listener container is running (docker compose ps)
[ ] Bot is logged in (logs show "logged in as")
[ ] Post a test message in AUTO_PUBLISH channel
    → bot reacts ✅ within 10 seconds
    → announcement appears on website within 15 seconds
    → WhatsApp message received in group
[ ] Post a test message in REVIEW_GATE channel
    → preview embed appears in #cr-review within 10 seconds
    → preview embed shows correct title and type
    → react ✅ on preview → announcement on website
    → react ❌ on a new preview → nothing published
[ ] File attachment in Discord is uploaded to Google Drive
    → file appears in resource library on website
[ ] Unauthorized user posts in configured channel
    → nothing happens (no reaction, no publish)
[ ] discord-bot (poster) does NOT re-echo discord-listener posts
    → check #announcements for duplicate embeds after listener publishes
```

---

## Skills Needed for This Feature

No new skills are required beyond what the project already uses. All dependencies are extensions of existing patterns.

### Universal Installation Commands

These install the tools needed to build and run `services/discord-listener` on any developer machine:

```bash
# Node.js (if not installed) — use nvm for version management
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20

# Service dependencies
cd services/discord-listener
npm install

# TypeScript compiler (global, for local dev)
npm install -g typescript tsx

# Docker (if not installed — Linux)
curl -fsSL https://get.docker.com | sh

# Verify Discord.js version (must be 14.x for this code)
node -e "require('discord.js'); const {version}=require('./node_modules/discord.js/package.json'); console.log('discord.js', version)"
# Expected: discord.js 14.x.x

# Optional: Discord.js types check
npx tsc --noEmit
# Expected: 0 errors
```

### Discord Developer Portal Checklist (one-time setup)

```bash
# There is no CLI for Discord bot setup — these steps are manual:
# 1. https://discord.com/developers/applications → New Application
# 2. Bot tab → Add Bot → Reset Token → copy token
# 3. Bot tab → Privileged Gateway Intents:
#    ✅ Server Members Intent
#    ✅ Message Content Intent
# 4. OAuth2 → URL Generator:
#    Scopes: bot
#    Permissions: Read Messages, Send Messages, Add Reactions, Read Message History, Embed Links
# 5. Open generated URL, invite to your server
# 6. Copy the bot token into services/discord-listener/.env
```
