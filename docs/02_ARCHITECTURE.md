# Architecture — IPE-24 Class Portal

## System Overview

The portal is a monorepo with four independently deployable services, all orchestrated by Docker Compose on a single Linux server.

```
Internet
    │
    ▼
[Nginx reverse proxy :443]
    │
    ├──► /           → Next.js web app          :3000
    ├──► /n8n        → n8n automation UI         :5678
    ├──► /uptime     → Uptime Kuma dashboard      :3001
    └──► (internal)  → WhatsApp bot              :3002
                     → Discord bot              (no HTTP, uses gateway)
                     → Telegram bot             (no HTTP, uses polling)
                     → Transcriber service       :8000 (internal only)
```

---

## Service Map

### 1. Next.js Web App (`apps/web`)
The main user-facing application. Handles everything students and the CR interact with directly.

**Responsibilities:**
- Serve all pages (student dashboard, admin panel, chatbot, resource library)
- Expose REST API at `/api/v1/*` consumed by the frontend and by n8n
- Run server-side business logic (announcement creation, file indexing, poll counting)
- Communicate with PostgreSQL via Prisma
- Communicate with Redis for sessions and rate limiting
- Call Gemini API for chatbot responses
- Call Google Drive API for file indexing
- Call Google Sheets API for routine data

### 2. WhatsApp Bot (`apps/bot`)
A standalone Node.js process running Baileys. Maintains a persistent WhatsApp Web session.

**Responsibilities:**
- Keep the WhatsApp session alive (handles reconnect on drop)
- Accept HTTP POST requests from n8n at `POST /send`
- Send formatted text messages to the configured group JID
- Expose a `/health` endpoint

### 3. Discord Bot (`services/discord-bot`)
A standalone Node.js process using discord.js.

**Responsibilities:**
- On startup, connect to the Discord gateway
- Accept HTTP POST from n8n at `POST /announce`
- Post formatted embeds to the configured channel
- Update a pinned routine message when routine changes
- Expose a `/health` endpoint

### 4. Telegram Bot + Transcriber Pipeline
The CR's control interface. Telegraf.js handles the Telegram side; n8n handles orchestration; a Python service handles transcription.

**Responsibilities (Telegraf bot):**
- Receive voice notes or text from the CR's Telegram
- Download voice notes and pass to transcriber
- Forward transcripts + text to n8n via webhook
- Send confirmation previews back to CR
- Listen for approval/rejection responses

**Responsibilities (Python Transcriber `services/transcriber`):**
- FastAPI server exposing `POST /transcribe`
- Accepts audio file path, runs faster-whisper, returns transcript text
- Model loaded once on startup for fast response

---

## Data Flow Diagrams

### Flow 1: Student Views Dashboard

```
Browser → GET / (Next.js server component)
    → Prisma query: latest 5 announcements
    → Google Sheets API: today's routine
    → Prisma query: upcoming 3 exam deadlines
    → Prisma query: unread notification count
    ← Rendered HTML streamed to browser
    → Client JS hydrates interactive elements
    → SWR polls /api/v1/notifications every 60s
```

### Flow 2: CR Posts Announcement via Telegram

```
CR sends voice note to Telegram bot
    → Telegraf downloads OGG file to /tmp/
    → Telegraf POSTs file path to n8n webhook
    → n8n: Execute Command node runs transcriber
        → Python FastAPI → faster-whisper → transcript
    → n8n: HTTP Request node → Gemini Flash API
        → Prompt: "Classify and format this announcement..."
        → Response: { type, title, body, urgency }
    → n8n: Telegram Send Message
        → Preview sent to CR: "📢 ANNOUNCEMENT\n[title]\n[body]\nSend? (yes/no)"
    → n8n: Wait node listens for CR reply
    → CR replies "yes"
    → n8n: HTTP POST → /api/v1/internal/announcements (Next.js)
        → Prisma: insert announcement
        → FCM: send push notification to all subscribers
    → n8n: HTTP POST → Discord bot /announce
        → Discord embed posted to #announcements
    → n8n: HTTP POST → WhatsApp bot /send
        → WhatsApp message sent to group
    → n8n: Telegram Send → "✅ Published to all platforms"
```

### Flow 3: Student Asks AI Virtual CR

```
Student types question in chatbot UI
    → POST /api/v1/chat
    → Rate limit check (Redis: 20 req/user/hour)
    → Embed query via local sentence-transformer Python call
    → pgvector: SELECT top 5 similar chunks
        (cosine similarity search on knowledge_chunks table)
    → Build prompt:
        System: "You are the Virtual CR of IPE-24 at IUT..."
        Context: [5 retrieved document chunks]
        User: [student question]
    → Gemini 1.5 Flash API (streaming)
    → Stream response tokens back to browser via ReadableStream
    → Log conversation to chat_logs table
```

### Flow 4: File Upload by CR

```
CR selects file in admin panel
    → Client: multipart POST /api/v1/admin/files
    → Server: validate file type (PDF, DOCX, PPTX, image only)
    → Server: validate size (max 25MB)
    → Google Drive API: upload to class folder
    → Prisma: insert file_uploads record
        { name, drive_id, drive_url, course_id, uploaded_by }
    → Return drive_url to client
    → Client: show success toast with link
```

### Flow 5: User Login (First Time)

```
User clicks "Login with Google"
    → NextAuth.js redirect to Google OAuth consent screen
    → User grants permission
    → Google redirects back with auth code
    → NextAuth.js callback:
        → Exchange code for tokens
        → CHECK: email ends with @iut-dhaka.edu?
            → NO: redirect to /auth/error?reason=domain
            → YES: continue
        → Check Prisma: does user exist?
            → NO: create user record { email, name, avatar, role: 'student' }
            → YES: update last_login
        → Create session (database session stored in sessions table)
    → Redirect to /dashboard
```

---

## API Contract

All routes prefixed with `/api/v1/`. All responses follow:
```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": { "page": 1, "total": 40 }
}
```

Error response:
```json
{
  "success": false,
  "data": null,
  "error": { "code": "UNAUTHORIZED", "message": "..." }
}
```

### Public Routes (no auth required)
```
GET  /api/v1/health              → { status: "ok", uptime: 1234 }
```

### Authenticated Routes (student + admin)
```
GET  /api/v1/announcements       → list announcements (paginated)
GET  /api/v1/announcements/:id   → single announcement
GET  /api/v1/routine             → fetch and cache Google Sheets data
GET  /api/v1/files               → list files (filterable by course_id)
GET  /api/v1/exams               → upcoming exams list
GET  /api/v1/polls               → active polls
POST /api/v1/polls/:id/vote      → submit vote
POST /api/v1/chat                → AI chatbot query (streaming)
GET  /api/v1/notifications       → unread notification count
POST /api/v1/notifications/read  → mark notifications read
POST /api/v1/push/subscribe      → register FCM token
GET  /api/v1/profile             → current user profile
PATCH /api/v1/profile            → update phone, bio
```

### Admin Routes (admin + super_admin only)
```
POST   /api/v1/admin/announcements         → create announcement
PATCH  /api/v1/admin/announcements/:id     → update announcement
DELETE /api/v1/admin/announcements/:id     → delete announcement
POST   /api/v1/admin/files                 → upload file to Drive
DELETE /api/v1/admin/files/:id             → remove file record
POST   /api/v1/admin/exams                 → create exam entry
PATCH  /api/v1/admin/exams/:id             → update exam
DELETE /api/v1/admin/exams/:id             → delete exam
POST   /api/v1/admin/polls                 → create poll
PATCH  /api/v1/admin/polls/:id/close       → close poll
GET    /api/v1/admin/users                 → list all users
PATCH  /api/v1/admin/users/:id/role        → change user role
GET    /api/v1/admin/audit-log             → view audit log
POST   /api/v1/admin/knowledge             → add knowledge base doc
DELETE /api/v1/admin/knowledge/:id         → remove knowledge doc
POST   /api/v1/admin/knowledge/reindex     → re-embed all docs
```

### Internal Routes (n8n → Next.js, protected by secret key)
```
POST /api/v1/internal/announcements   → create announcement from n8n
POST /api/v1/internal/files           → index file from n8n
```

---

## Middleware Stack

Every request passes through this chain in order:

```
Request
    │
    ▼
1. Nginx (SSL termination, rate limiting by IP at nginx level)
    │
    ▼
2. Next.js Middleware (middleware.ts)
   - Check session cookie
   - If /admin/* → verify role is admin or super_admin
   - If /api/v1/internal/* → verify X-Internal-Secret header
   - If /api/v1/* → verify session
    │
    ▼
3. Route Handler
   - Zod input validation
   - Redis rate limit check (per user)
   - Business logic
   - Prisma query
    │
    ▼
4. Response
   - Standardized JSON envelope
   - Audit log write (admin actions only)
```

---

## Caching Strategy

| Data | Cache | TTL | Invalidation |
|---|---|---|---|
| Google Sheets routine | Redis | 5 minutes | Explicit flush on routine update |
| Announcement list | SWR (client) | 30 seconds | On new announcement creation |
| File list | SWR (client) | 60 seconds | On file upload/delete |
| User session | Redis | 30 days | On logout |
| Gemini responses | None | — | Always fresh |
| Vector search results | Redis | 24 hours | On knowledge base reindex |

---

## Environment Variables

### Next.js Web App
```env
# Database
DATABASE_URL=postgresql://ipe24:secret@postgres:5432/ipe24_db
REDIS_URL=redis://redis:6379

# Auth
NEXTAUTH_URL=https://your-domain.me
NEXTAUTH_SECRET=generate-with-openssl-rand-hex-32
GOOGLE_CLIENT_ID=from-google-cloud-console
GOOGLE_CLIENT_SECRET=from-google-cloud-console
ALLOWED_DOMAIN=iut-dhaka.edu

# Google APIs
GOOGLE_SERVICE_ACCOUNT_KEY=base64-encoded-service-account-json
GOOGLE_DRIVE_FOLDER_ID=class-drive-folder-id
GOOGLE_SHEETS_ROUTINE_ID=spreadsheet-id

# AI
GEMINI_API_KEY=from-google-ai-studio

# Internal
INTERNAL_API_SECRET=generate-with-openssl-rand-hex-32

# Push Notifications
FCM_SERVER_KEY=from-firebase-console
NEXT_PUBLIC_FCM_VAPID_KEY=from-firebase-console
```

### WhatsApp Bot
```env
WHATSAPP_GROUP_JID=120363XXXXXXXXXX@g.us
INTERNAL_API_SECRET=same-as-above
PORT=3002
```

### Discord Bot
```env
DISCORD_BOT_TOKEN=from-discord-developer-portal
DISCORD_GUILD_ID=your-server-id
DISCORD_ANNOUNCE_CHANNEL_ID=channel-id
DISCORD_ROUTINE_CHANNEL_ID=channel-id
INTERNAL_API_SECRET=same-as-above
PORT=3003
```

### Telegram Bot
```env
TELEGRAM_BOT_TOKEN=from-botfather
AUTHORIZED_CHAT_IDS=your-telegram-id,deputy-cr-id
N8N_WEBHOOK_URL=http://n8n:5678/webhook/telegram-incoming
```

### n8n
```env
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https
N8N_EDITOR_BASE_URL=https://your-domain.me/n8n
WEBHOOK_URL=https://your-domain.me/n8n
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=strong-password-here
```
