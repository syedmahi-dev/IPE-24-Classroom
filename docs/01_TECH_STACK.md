# Tech Stack — IPE-24 Class Portal

All tools listed here are free and open-source unless noted. No recurring paid services.

---

## Frontend

### Next.js 14 (App Router)
- **Version:** 14.x
- **Why:** Full-stack React framework. Server components reduce client JS. Built-in API routes eliminate a separate Express server. App Router enables layouts, nested routing, and streaming.
- **Key features used:** Server Components, Client Components, Server Actions, Route Handlers, Middleware, `next/image`, `next/font`

### TypeScript
- **Version:** 5.x
- **Why:** Type safety across the entire codebase. Catches role permission bugs, API contract mismatches, and schema drift at compile time rather than runtime.

### Tailwind CSS
- **Version:** 3.x
- **Why:** Utility-first CSS. No stylesheet bloat. Consistent spacing and color system. Works perfectly with component-based architecture.

### shadcn/ui
- **Version:** latest
- **Why:** Unstyled, accessible component primitives (Dialog, Dropdown, Toast, Table, etc.) built on Radix UI. Copy-pasted into the project — not a dependency that can break on upstream changes.

### React Hook Form + Zod
- **React Hook Form version:** 7.x
- **Zod version:** 3.x
- **Why:** Form validation with full TypeScript inference. Zod schemas are shared between frontend forms and backend API validation — single source of truth for data shape.

### TipTap
- **Version:** 2.x
- **Why:** Rich text editor for announcement writing. Headless, extensible, outputs clean HTML or JSON. Used in the CR admin panel.

### Zustand
- **Version:** 4.x
- **Why:** Lightweight global state for things like notification count, user preferences, and chatbot conversation history. No Redux boilerplate.

### SWR
- **Version:** 2.x
- **Why:** Data fetching with automatic revalidation. Used for dashboard feeds, announcement lists, and poll results that need to stay fresh without full page reloads.

---

## Backend

### Next.js Route Handlers
- **Why:** API endpoints live inside the same Next.js project. No separate Express/Fastify server needed. Simplifies deployment.
- **Pattern:** All API routes under `app/api/v1/`

### Prisma ORM
- **Version:** 5.x
- **Why:** Type-safe database client auto-generated from schema. Migrations built in. Works perfectly with PostgreSQL. Eliminates raw SQL for 95% of queries.

### NextAuth.js (Auth.js v5)
- **Version:** 5.x (beta, stable enough for production)
- **Why:** Handles Google OAuth flow, session management, JWT/database sessions. Has built-in callbacks for domain restriction.

---

## Database

### PostgreSQL
- **Version:** 16.x (Docker image: `postgres:16-alpine`)
- **Why:** Robust, open-source relational database. Handles all structured data: users, announcements, files, exams, polls.

### pgvector
- **Version:** 0.7.x (Docker image: `pgvector/pgvector:pg16`)
- **Why:** PostgreSQL extension for storing vector embeddings. Powers the AI chatbot's RAG retrieval. No separate vector database service needed — one less Docker container.

### Redis
- **Version:** 7.x (Docker image: `redis:7-alpine`)
- **Why:** Session caching, rate limiting counters, request queuing for the Gemini API. Lightning fast.

---

## AI & Machine Learning

### Google Gemini 1.5 Flash
- **Cost:** Free — 15 requests/minute, 1 million tokens/day
- **Used for:**
  1. Virtual CR chatbot answers (RAG pipeline)
  2. Telegram message classification (announcement / file / routine / exam / general)
  3. Formatting rough voice transcripts into clean, properly typed announcements
- **SDK:** `@google/generative-ai` (Node.js)

### faster-whisper (Local Transcription)
- **Version:** latest (`faster-whisper` Python package)
- **Model:** `base` or `small` (runs on CPU, no GPU required)
- **Cost:** Free — runs entirely on your server
- **Used for:** Transcribing Telegram voice notes sent by the CR before classification

### Sentence Transformers (Local Embeddings)
- **Model:** `all-MiniLM-L6-v2` (384 dimensions, 80MB)
- **Cost:** Free — runs locally via Python
- **Used for:** Generating embeddings for the knowledge base documents and student queries
- **Why not Gemini embeddings:** Gemini embedding API has a lower free rate limit. Local embeddings are faster and unlimited.

---

## Communication & Automation

### n8n (Self-Hosted Workflow Automation)
- **Version:** latest (Docker image: `n8nio/n8n`)
- **Cost:** Free — self-hosted
- **Used for:** Orchestrating the Telegram → classify → confirm → multi-platform publish pipeline
- **Why n8n:** Visual workflow editor, built-in Telegram and HTTP nodes, execution history, retry logic, and a cron scheduler

### Telegraf.js
- **Version:** 4.x
- **Cost:** Free
- **Used for:** Telegram bot — receives voice notes and text from the CR, sends confirmation previews, listens for approval
- **Why Telegraf:** Best-maintained Node.js Telegram bot library, great TypeScript support

### Baileys (WhatsApp)
- **Version:** latest (`@whiskeysockets/baileys`)
- **Cost:** Free — unofficial WhatsApp Web protocol
- **Critical:** Use a **dedicated SIM number**, never your personal number
- **Used for:** Sending announcements to the WhatsApp community group

### discord.js
- **Version:** 14.x
- **Cost:** Free
- **Used for:** Discord bot that posts formatted embeds to announcement channels, pins routine updates

### Firebase Cloud Messaging (FCM)
- **Cost:** Free (Spark plan, no credit card)
- **Used for:** Browser push notifications to students who opt in
- **SDK:** `firebase-admin` (server), `firebase` (client service worker)

---

## Infrastructure

### Docker & Docker Compose
- **Version:** Docker 26.x, Compose 2.x
- **Why:** All services (Next.js, PostgreSQL, Redis, n8n, WhatsApp bot, Discord bot, Uptime Kuma) run in isolated containers. Reproducible on any Linux server. One command to start everything.

### Nginx
- **Version:** latest (`nginx:alpine`)
- **Role:** Reverse proxy in front of all services. Handles SSL termination, routes traffic to the right container, serves static files.

### Certbot + Let's Encrypt
- **Cost:** Free
- **Why:** Automated SSL certificate issuance and renewal. Certbot runs as a cron job and renews 30 days before expiry.

### GitHub Actions
- **Cost:** Free (2,000 minutes/month on free tier — enough for this project)
- **Used for:** CI/CD pipeline. On push to `main`: run lint + type check → build Docker image → SSH into server → pull and restart containers

### Uptime Kuma (Self-Hosted Monitoring)
- **Cost:** Free — self-hosted
- **Why:** Monitors all your services (website, bots, database) and sends Telegram alerts if anything goes down

---

## Development Tools

### ESLint + Prettier
- **Why:** Code style consistency. ESLint catches bad patterns; Prettier formats automatically. Both run as pre-commit hooks via Husky.

### Husky + lint-staged
- **Why:** Pre-commit hooks run ESLint + Prettier + TypeScript check before every commit. Prevents broken code from reaching the repo.

### Prisma Studio
- **Why:** Visual database browser for development. Inspect rows, run quick edits without touching SQL.

---

## Free Tier Summary

| Service | Free Limit | Our Expected Usage |
|---|---|---|
| Gemini 1.5 Flash | 1M tokens/day, 15 RPM | ~5k tokens/day, ~2 RPM |
| Google OAuth | Unlimited | ~40 users |
| Google Drive API | 1B requests/day | ~100 requests/day |
| Google Sheets API | 300 requests/min | ~10 requests/min |
| FCM (Push Notifications) | Unlimited | ~40 devices |
| GitHub Actions | 2,000 min/month | ~200 min/month |
| GitHub Student Pack domain | 1 year free | 1 domain |

Everything else runs on your own server — zero external API costs.

---

## Version Lock Policy

Pin all Docker image versions in `docker-compose.yml` to avoid surprise breakage from upstream updates. Example:
```yaml
image: postgres:16.3-alpine  # not postgres:latest
image: redis:7.2-alpine
image: n8nio/n8n:1.48.0
```

Pin npm packages with exact versions in `package.json` (use `--save-exact` flag or set `save-exact=true` in `.npmrc`).
