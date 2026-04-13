# IPE-24 Class Portal — Project Overview

## What This Is

A private, full-stack web portal for the IPE-24 batch of IUT (Islamic University of Technology). Access is restricted exclusively to students and faculty with valid `@iut-dhaka.edu` Google accounts. The system replaces fragmented WhatsApp threads, scattered PDFs, and verbal announcements with a single source of truth — while still feeding updates into WhatsApp, Discord, and push notifications automatically.

---

## Goals

- Give every student a personalized dashboard with class info, announcements, routines, and files
- Give the CR (Class Representative) a one-stop admin panel and a Telegram-based command interface to publish updates everywhere at once
- Provide a 24/7 AI Virtual CR that can answer questions about syllabus, exams, schedules, and class policies
- Automate cross-platform publishing to the website, Discord server, and WhatsApp community simultaneously
- Keep the entire project at zero recurring cost using self-hosted infrastructure and free API tiers

---

## Feature List

### Student-Facing
| Feature | Description |
|---|---|
| Personalized dashboard | Feed of announcements, today's routine, upcoming deadlines |
| Class routine | Live-rendered from Google Sheets — always up to date |
| Resource library | Course-wise PDFs, notes, slides — stored in Google Drive |
| Exam & assignment tracker | Countdown timers, course tags, submission links |
| Academic calendar | Semester events, holidays, exam windows |
| AI Virtual CR | RAG chatbot answering syllabus, exam, schedule questions |
| Study group board | Post and join study groups per course |
| Poll / voting | CR posts polls; students vote; results shown live |
| Lost & found board | Text notices for lost items |
| Push notifications | Browser push when new announcement drops |
| Profile page | Name, student ID, section, contact |

### CR / Admin-Facing
| Feature | Description |
|---|---|
| Admin dashboard | Overview of recent activity, student count, pending actions |
| Announcement editor | Rich text editor, tag by type (general / exam / file / routine) |
| File uploader | Uploads directly to Google Drive; indexes in DB |
| Routine updater | Edit Google Sheets; site auto-refreshes |
| Exam schedule manager | CRUD for exam entries with course + date + room |
| Poll creator | Create polls with options, set expiry |
| Knowledge base editor | Add/update AI chatbot source documents |
| Telegram command interface | Voice/text → classify → confirm → publish to all platforms |

### System / Infrastructure
| Feature | Description |
|---|---|
| Google OAuth | IUT domain restriction at OAuth callback level |
| Role-based access | super_admin (CR), admin (deputy CR), student |
| Audit log | Every admin action logged with timestamp and actor |
| Rate limiting | Per-IP and per-user on all API routes |
| Injection protection | SQL, XSS, CSRF, path traversal mitigations |
| Auto-deploy | GitHub Actions → SSH → Docker Compose on push to main |
| Uptime monitoring | Self-hosted Uptime Kuma |
| Error logging | Self-hosted Umami + console error capture |

---

## Scope Boundaries

**In scope:**
- Web portal (desktop + mobile responsive)
- Telegram → n8n → multi-platform automation
- Discord bot (announcements, routine updates)
- WhatsApp bot via Baileys
- AI Virtual CR via Gemini 1.5 Flash + pgvector RAG
- All self-hosted on your personal server

**Out of scope (for now):**
- Native mobile app (responsive web covers this)
- Video hosting (link to YouTube/Google Drive instead)
- Payment or fee tracking
- Live video classes

---

## Repository Structure

```
ipe24-web/
├── apps/
│   ├── web/                    # Next.js 14 web app
│   └── bot/                    # WhatsApp Baileys bot (Node.js)
├── services/
│   ├── discord-bot/            # discord.js bot
│   ├── telegram-bot/           # telegraf.js bot
│   └── transcriber/            # Python faster-whisper service
├── infrastructure/
│   ├── docker-compose.yml      # All services
│   ├── nginx/                  # Nginx configs
│   └── scripts/                # Deploy, backup scripts
├── docs/                       # This documentation folder
└── .github/
    └── workflows/              # GitHub Actions CI/CD
```

---

## Document Index

| File | Purpose |
|---|---|
| `00_PROJECT_OVERVIEW.md` | This file — goals, features, structure |
| `01_TECH_STACK.md` | Every technology used, version, and why |
| `02_ARCHITECTURE.md` | System design, data flow diagrams, API contracts |
| `03_ROLES_AND_PERMISSIONS.md` | User roles, what each can do, enforcement points |
| `04_DATABASE.md` | Full schema, migrations, indexing, pgvector setup |
| `05_BACKEND.md` | API routes, business logic, service layer patterns |
| `06_FRONTEND.md` | Pages, components, state management, styling guide |
| `07_AUTH.md` | Google OAuth flow, session management, domain restriction |
| `08_AI_CHATBOT.md` | RAG pipeline, embedding, Gemini integration, knowledge base |
| `09_AUTOMATION.md` | Telegram bot, n8n workflows, Baileys, Discord bot |
| `10_SECURITY.md` | Threat model, injection protection, hardening checklist |
| `11_TESTING.md` | Unit, integration, E2E, load, security test plans |
| `12_DEPLOYMENT.md` | Server setup, Docker, Nginx, CI/CD, SSL, monitoring |

---

## Naming Conventions

- **Files:** kebab-case (`class-notes.ts`)
- **Components:** PascalCase (`AnnouncementCard.tsx`)
- **Functions/variables:** camelCase (`fetchLatestNotes`)
- **Database tables:** snake_case (`class_announcements`)
- **Environment variables:** SCREAMING_SNAKE_CASE (`GOOGLE_CLIENT_ID`)
- **API routes:** `/api/v1/resource-name` (plural nouns, versioned)
- **Git branches:** `feat/feature-name`, `fix/bug-name`, `chore/task-name`

---

## Glossary

| Term | Meaning |
|---|---|
| CR | Class Representative — the student managing the class |
| Virtual CR | The AI chatbot assistant |
| n8n | Open-source workflow automation tool (self-hosted) |
| Baileys | Open-source WhatsApp Web API library |
| RAG | Retrieval-Augmented Generation — AI answers based on retrieved documents |
| pgvector | PostgreSQL extension for storing and querying vector embeddings |
| Gemini Flash | Google's free-tier AI model used for the chatbot and classification |
| faster-whisper | Local offline voice transcription model |
