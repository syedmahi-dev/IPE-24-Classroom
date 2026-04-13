# IPE-24 Class Portal

Private class management portal for IPE-24 batch, Islamic University of Technology (IUT), Bangladesh.

> 🔒 Access restricted to `@iut-dhaka.edu` Google accounts only.

---

## Quick Links

| Resource | URL |
|---|---|
| Class Portal | https://your-domain.me |
| Admin Panel | https://your-domain.me/admin |
| n8n Automation | http://localhost:5678 (SSH tunnel) |
| Uptime Monitor | http://localhost:3001 (SSH tunnel) |

---

## Features

- 📢 Announcements with auto-publish to Discord + WhatsApp
- 📅 Live class routine (Google Sheets)
- 📁 Resource library (Google Drive)
- 📝 Exam tracker with countdown
- 🤖 AI Virtual CR chatbot (RAG + Gemini)
- 📊 Class polls
- 👥 Study groups
- 🔔 Push notifications
- 🎙️ CR Telegram control (voice/text → multi-platform publish)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend & Backend | Next.js 14, TypeScript, Tailwind CSS |
| Database | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| Auth | NextAuth.js v5 (Google OAuth) |
| AI Chatbot | Gemini 1.5 Flash (free tier) + RAG |
| Voice Transcription | faster-whisper (local, free) |
| Embeddings | sentence-transformers (local, free) |
| WhatsApp | Baileys (unofficial client) |
| Discord | discord.js |
| Telegram | Telegraf.js |
| Automation | n8n (self-hosted) |
| Infrastructure | Docker, Nginx, GitHub Actions |

**Total recurring cost: $0** (self-hosted + free API tiers)

---

## Repository Structure

```
ipe24-web/
├── apps/
│   ├── web/          # Next.js main application
│   └── bot/          # WhatsApp Baileys bot
├── services/
│   ├── transcriber/  # Python: faster-whisper + sentence-transformers
│   ├── discord-bot/  # discord.js bot
│   └── telegram-bot/ # Telegraf.js bot
├── infrastructure/
│   ├── docker-compose.yml
│   ├── postgres/init.sql
│   └── nginx/ipe24.conf
├── docs/             # Full implementation documentation (13 files)
└── .github/
    └── workflows/deploy.yml
```

---

## Getting Started (Development)

```bash
# 1. Clone
git clone git@github.com:YOUR_USERNAME/ipe24-web.git
cd ipe24-web

# 2. Start database services
cd infrastructure
docker compose up -d postgres redis transcriber

# 3. Set up web app
cd ../apps/web
cp .env.example .env
# Fill in .env with your credentials

# 4. Install and migrate
npm install
npx prisma migrate dev
npx tsx prisma/seed.ts

# 5. Run dev server
npm run dev
# Open http://localhost:3000
```

---

## Deployment

See `docs/12_DEPLOYMENT.md` for full server setup guide.

```bash
# Quick deploy (after server is configured)
git push origin main
# GitHub Actions handles the rest
```

---

## Documentation

All implementation docs are in the `docs/` folder:

| # | File | Contents |
|---|---|---|
| 00 | PROJECT_OVERVIEW | Goals, features, glossary |
| 01 | TECH_STACK | All technologies explained |
| 02 | ARCHITECTURE | System design, API contracts |
| 03 | ROLES_AND_PERMISSIONS | Access control |
| 04 | DATABASE | Schema, migrations, pgvector |
| 05 | BACKEND | API routes, business logic |
| 06 | FRONTEND | Pages, components, styling |
| 07 | AUTH | Google OAuth implementation |
| 08 | AI_CHATBOT | RAG pipeline, Gemini |
| 09 | AUTOMATION | Telegram, n8n, Baileys, Discord |
| 10 | SECURITY | Threats, mitigations, audit |
| 11 | TESTING | Unit, integration, E2E, load |
| 12 | DEPLOYMENT | Server, Docker, CI/CD |
| 13 | PHASES | Week-by-week execution plan |
| 14 | DISCORD_SETUP | Server structure, bot setup |
| 15 | KNOWLEDGE_BASE_SEED | AI chatbot content |
| 16 | N8N_WORKFLOW_JSON | Importable automation workflow |

---

## CR Commands (Telegram)

Send these to the Telegram bot to control the portal:

| Message | Action |
|---|---|
| Any text | Classify as announcement → confirm → publish |
| Voice note | Transcribe → classify → confirm → publish |
| `edit [new text]` (reply to preview) | Replace body before publishing |
| `yes` / `ok` / `send` | Confirm and publish to all platforms |
| `no` / `cancel` | Cancel, nothing posted |

---

## License

Private — IPE-24 batch, IUT. Not for public distribution.
