# Discord Listener — Infrastructure Additions

This file documents all changes needed to existing project files to integrate `services/discord-listener`. No existing service code is modified — all changes are additive.

---

## 1. `docker-compose.yml` — Add New Service

Add this block to `infrastructure/docker-compose.yml` alongside the existing `discord-bot` service:

```yaml
  discord-listener:
    build: ../services/discord-listener
    restart: always
    env_file: ../services/discord-listener/.env
    depends_on:
      - redis
      - web
      - whatsapp-bot
```

Full updated services section for reference:

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    # ... existing config

  redis:
    image: redis:7.2-alpine
    # ... existing config

  transcriber:
    build: ../services/transcriber
    # ... existing config

  web:
    build: ../apps/web
    # ... existing config

  whatsapp-bot:
    build: ../apps/bot
    # ... existing config

  discord-bot:                   # ← existing poster bot (unchanged)
    build: ../services/discord-bot
    # ... existing config

  discord-listener:              # ← NEW listener bot
    build: ../services/discord-listener
    restart: always
    env_file: ../services/discord-listener/.env
    depends_on:
      - redis
      - web
      - whatsapp-bot

  telegram-bot:
    build: ../services/telegram-bot
    # ... existing config

  n8n:
    image: n8nio/n8n:1.48.0
    # ... existing config

  uptime-kuma:
    image: louislam/uptime-kuma:1
    # ... existing config
```

---

## 2. `apps/web/app/api/v1/internal/announcements/route.ts` — Add `source` Field

The discord-listener sends a `source: 'discord'` field in the request body. The internal route should accept and store this for audit trail purposes. This is a **purely additive** change — the `source` field defaults to `null` if not provided.

### Prisma Schema Addition

In `apps/web/prisma/schema.prisma`, add the `source` field to the `Announcement` model:

```prisma
model Announcement {
  id            String           @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  title         String
  body          String           @db.Text
  type          AnnouncementType @default(general)
  source        String?          // 'telegram' | 'discord' | 'web' | null
  isPublished   Boolean          @default(false)
  // ... rest of model unchanged
}
```

Run migration:
```bash
npx prisma migrate dev --name add_announcement_source
```

### Internal Route Update

Update `apps/web/src/app/api/v1/internal/announcements/route.ts`:

```typescript
import { requireInternalSecret } from '@/lib/api-guards'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { broadcastPushNotification } from '@/lib/fcm'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { NextRequest } from 'next/server'

const bodySchema = z.object({
  title: z.string().min(1).max(60),
  body: z.string().min(1).max(50000),
  type: z.enum(['general','exam','file_update','routine_update','urgent','event']).default('general'),
  source: z.enum(['telegram','discord','web']).nullable().optional(), // NEW field
})

export async function POST(req: NextRequest) {
  const { error } = requireInternalSecret(req)
  if (error) return error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return ERRORS.VALIDATION('Invalid JSON body')
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return ERRORS.VALIDATION(parsed.error.message)

  const { title, body: htmlBody, type, source } = parsed.data

  const announcement = await prisma.announcement.create({
    data: {
      title,
      body: htmlBody,
      type,
      source: source ?? null,
      isPublished: true,
      publishedAt: new Date(),
      // Internal posts are attributed to system — requires a system user in DB
      // If you don't have a system user, use the super_admin's ID from environment
      authorId: process.env.SYSTEM_USER_ID ?? (await getSystemUserId()),
    },
  })

  // Fire FCM push notification
  await broadcastPushNotification(title, `New announcement: ${title}`, `/announcements/${announcement.id}`)
    .catch((err) => console.error('FCM push failed:', err))

  // Audit log
  await logAudit(announcement.authorId, 'CREATE', 'announcement', announcement.id, {
    title,
    source: source ?? 'internal',
  })

  return ok(announcement, undefined)
}

// Lazy-loaded system user ID — cached after first call
let _systemUserId: string | null = null
async function getSystemUserId(): Promise<string> {
  if (_systemUserId) return _systemUserId
  // Fall back to the first super_admin in the database
  const admin = await prisma.user.findFirst({ where: { role: 'super_admin' }, select: { id: true } })
  if (!admin) throw new Error('No super_admin found to use as system author. Create the CR account first.')
  _systemUserId = admin.id
  return _systemUserId
}
```

> **Note on `SYSTEM_USER_ID`:** The cleanest approach is to add a `SYSTEM_USER_ID` environment variable to the web app pointing to the CR's user ID. Set it after the CR's first login: `SYSTEM_USER_ID=<uuid from users table>`. This is the user all n8n and discord-listener announcements are attributed to.

---

## 3. Uptime Kuma — Add Monitor for New Service

The discord-listener service doesn't expose an HTTP health endpoint (it's a Discord bot using the gateway). Monitor it via Docker container health instead.

In Uptime Kuma, add a **Docker Container** monitor:
- Container name: `ipe24-discord-listener`
- Expected status: `running`
- Check interval: 1 minute

Alternatively, add a lightweight `/health` HTTP endpoint to `src/index.ts`:

```typescript
// Add to src/index.ts, before client.login()
import http from 'http'

const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      ready: client.isReady(),
      uptime: process.uptime(),
    }))
  } else {
    res.writeHead(404)
    res.end()
  }
})

healthServer.listen(3004, '0.0.0.0', () => {
  logger.info('health', 'health server on :3004')
})
```

Update `docker-compose.yml` to add port mapping (internal only):

```yaml
  discord-listener:
    build: ../services/discord-listener
    restart: always
    env_file: ../services/discord-listener/.env
    ports:
      - "127.0.0.1:3004:3004"   # Health endpoint only — not exposed publicly
    depends_on:
      - redis
      - web
      - whatsapp-bot
```

In Uptime Kuma, add **HTTP(s)** monitor:
- URL: `http://127.0.0.1:3004/health`
- Expected status: 200
- Check interval: 1 minute

---

## 4. GitHub Actions — CI/CD Addition

Add the discord-listener service to the auto-deploy workflow:

```yaml
# .github/workflows/deploy.yml
# In the deploy job, update the SSH script:
script: |
  cd ${{ secrets.SERVER_PATH }}
  git pull origin main
  cd infrastructure
  docker compose pull
  docker compose up -d --build web discord-listener  # ← add discord-listener
  docker compose exec -T web npx prisma migrate deploy
  docker image prune -f
  echo "Deploy complete at $(date)"
```

---

## 5. `.gitignore` Addition

Ensure the new service's env file is ignored:

```gitignore
# Add to root .gitignore if not already present
services/discord-listener/.env
```

---

## 6. Repository Structure Update

Update `00_PROJECT_OVERVIEW.md` repository structure section to add the new service:

```
ipe24-web/
├── apps/
│   ├── web/                    # Next.js 14 web app
│   └── bot/                    # WhatsApp Baileys bot (Node.js)
├── services/
│   ├── discord-bot/            # discord.js bot (POSTS announcements TO Discord)
│   ├── discord-listener/       # discord.js bot (READS from Discord, mirrors to site) ← NEW
│   ├── telegram-bot/           # telegraf.js bot
│   └── transcriber/            # Python faster-whisper service
├── infrastructure/
│   ├── docker-compose.yml
│   ├── nginx/
│   └── scripts/
├── docs/
└── .github/
    └── workflows/
```

---

## 7. Required Discord Server Setup

Before deploying, set up the following channels in the Discord server:

| Channel | Purpose | Who can post |
|---|---|---|
| `#announcements` or similar | Existing channel (unchanged) | Everyone reads |
| A private `#cr-review` channel | Preview embeds for REVIEW_GATE | CR + bots only |

The `#cr-review` channel should have:
- View permissions: CR + Listener Bot only
- Write permissions: Listener Bot only (to post previews)
- Reaction permissions: CR only (to approve/reject)

**To get channel IDs:** Enable Developer Mode in Discord (Settings → Advanced → Developer Mode). Right-click any channel → Copy ID.

**To get user IDs:** Right-click any user → Copy ID.

---

## 8. First-Deploy Checklist for `discord-listener`

Run through these in order after the bot is invited to the server:

```
[ ] New bot application created in Discord Dev Portal (separate from discord-bot)
[ ] Message Content Intent enabled in Dev Portal
[ ] Server Members Intent enabled in Dev Portal
[ ] Bot invited to server with correct permissions
[ ] #cr-review channel created (private, bot can write, CR can react)
[ ] CR's Discord user ID obtained (right-click → Copy ID)
[ ] All channel IDs obtained for DISCORD_CHANNEL_CONFIGS
[ ] .env file created and populated
[ ] docker compose up -d discord-listener
[ ] docker compose logs discord-listener --follow
    → should see "logged in as IPE24 Listener Bot#XXXX"
[ ] Post a test message in a configured AUTO_PUBLISH channel
    → bot should react ✅, announcement appears on website
[ ] Post a test message in a REVIEW_GATE channel
    → preview embed appears in #cr-review within ~10 seconds
    → react ✅ on preview → announcement appears on website
[ ] Uptime Kuma monitor added for discord-listener
```
