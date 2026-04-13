# Implementation Plan: Pages, Components & API Routes
**Project:** IPE-24 Class Portal | **Target:** Complete remaining 92% of student/admin UI + API layer  
**Testing:** Vitest + Testing Library (follow 11_TESTING.md guidelines)

---

## PHASE 1: STUDENT PAGES (9 pages)
_All under route group `(student)`_

### 1.1 `/announcements` — Announcement List
- **Components:** AnnouncementListPage, FilterBar, SearchBox, AnnouncementCard (exists)
- **Data source:** GET /api/v1/announcements (paginated, filterable)
- **Features:** Filter by type (Exam/File/General), search, pagination
- **Tests needed:** Page rendering, filter logic, pagination
- **API dependency:** GET /api/v1/announcements

### 1.2 `/routine` — Class Routine  
- **Components:** RoutineListPage, TimetableGrid, WeekNavigator, ClassCard
- **Data source:** GET /api/v1/routine (cached from Google Sheets)
- **Features:** Week view selector, "Jump to today" button, indicator (● Live Now, ⏰ Next, ✓ Done)
- **Tests needed:** Week navigation, class highlight logic, responsive grid
- **API dependency:** GET /api/v1/routine

### 1.3 `/resources` — File Browser
- **Components:** ResourcesPage, FileBrowser, FileCard, CourseFilter, SearchBox
- **Data source:** GET /api/v1/files (grouped by course)
- **Features:** Filter by course, file type icons, download button (Google Drive link)
- **Tests needed:** Course grouping, file type detection, filter logic
- **API dependency:** GET /api/v1/files

### 1.4 `/exams` — Exam Schedule
- **Components:** ExamSchedulePage, ExamCountdown (exists), ExamTable, ExamDetailModal
- **Data source:** GET /api/v1/exams (sorted by date)
- **Features:** Countdown hero, exam list table, room info, status badges
- **Tests needed:** Countdown calculation, table sorting, status badges
- **API dependency:** GET /api/v1/exams

### 1.5 `/polls` — Active Polls & Voting
- **Components:** PollsPage, PollCard, VotingModal, PollResults, ClosedPollCard
- **Data source:** GET /api/v1/polls
- **Features:** Show active/closed, vote submission, result display (after voting or poll closed)
- **Tests needed:** Voting logic, state transitions, results calculation
- **API dependency:** GET /api/v1/polls, POST /api/v1/polls/[id]/vote

### 1.6 `/study-groups` — Study Group Board
- **Components:** StudyGroupsPage, GroupCard, GroupDetailModal, GroupForm, CreateButton
- **Data source:** GET /api/v1/study-groups
- **Features:** Create group button, group cards, join functionality, member count
- **Tests needed:** Form validation, join logic, list rendering
- **API dependency:** GET /api/v1/study-groups, POST /api/v1/study-groups/[id]/join

### 1.7 `/chat` — AI Virtual CR
- **Components:** ChatPage, ChatInterface (exists but stub), MessageList, ChatInput, SuggestedQuestions
- **Data source:** POST /api/v1/chat (streaming response)
- **Features:** Streaming message display, suggested questions, rate limit indicator, query counter
- **Tests needed:** Message streaming, rate limit display, suggested question list
- **API dependency:** POST /api/v1/chat (with streaming)

### 1.8 `/profile` — User Profile
- **Components:** ProfilePage, ProfileForm, PreferencesPanel, AccountSettings
- **Data source:** GET /api/v1/profile, PATCH /api/v1/profile
- **Features:** Edit bio/phone, toggle dark mode, notification prefs, sign out, last login time
- **Tests needed:** Form validation, update logic, toggle switches
- **API dependency:** GET /api/v1/profile, PATCH /api/v1/profile

---

## PHASE 2: AUTH PAGES (2 pages)
_Route group `(auth)`_

### 2.1 `/(auth)/login` — Login Page
- **Components:** LoginPage, LoginForm, ProviderButtons
- **Features:** 
  - Google OAuth button (production)
  - Credentials input for testing (dev only)
  - Domain validation messaging (@iut-dhaka.edu)
  - Redirect to /dashboard after successful auth
- **Tests needed:** Form submission, OAuth redirect, domain validation
- **No API** (handled by NextAuth)

### 2.2 `/(auth)/auth/error` — Auth Error Page
- **Components:** AuthErrorPage, ErrorDisplay
- **Features:** Display error reason (domain mismatch, provider error, callback mismatch)
- **Tests needed:** Error message display, retry link
- **No API** (static page)

---

## PHASE 3: ADMIN PAGES (9 pages total)
_Route group `(admin)` with new layout: AdminLayout.tsx_

### 3.1 Admin Layout & Routes
- **File:** `src/app/(admin)/layout.tsx`
- **Features:** Dark sidebar, purple admin accent, CR badge in topbar
- **Auth guard:** Redirect non-admin to /dashboard

### 3.2 `/admin` — Admin Overview
- **Components:** AdminPage, AdminStatsRow (exists), SystemHealthWidget (exists), PendingActionsWidget (exists), RecentActivityFeed, QuickActionButtons
- **Data source:** Derived from DB counts + system health checks
- **Features:** Welcome message, stats, health status, recent activity, quick action buttons
- **Tests needed:** Stats calculation, activity feed rendering, button navigation
- **No API** (renders existing components)

### 3.3 `/admin/announcements` — Manage Announcements
- **Components:** AdminAnnouncementsPage, AnnouncementTable, CreateAnnouncementModal, EditAnnouncementModal
- **Data source:** GET /api/v1/admin/announcements
- **Features:** Table of all announcements, create/edit modals, platform publishing checkboxes, delete (own only, CR can delete all)
- **Tests needed:** Modal form validation, table rendering, delete confirmation
- **API dependency:** GET/POST/PATCH/DELETE /api/v1/admin/announcements

### 3.4 `/admin/files` — Manage Files
- **Components:** AdminFilesPage, FileTable, FileUploadModal
- **Data source:** GET /api/v1/admin/files
- **Features:** Upload modal with course tag, file deletion (own only, CR all), course filter
- **Tests needed:** File upload form, deletion confirmation, course filtering
- **API dependency:** GET/POST/DELETE /api/v1/admin/files

### 3.5 `/admin/exams` — Manage Exam Schedule
- **Components:** AdminExamsPage, ExamTable, ExamFormModal
- **Data source:** GET /api/v1/admin/exams
- **Features:** Add/edit/delete exam entries, course selector, date/time picker, room input
- **Tests needed:** Date picker integration, form validation, exam list rendering
- **API dependency:** GET/POST/PATCH/DELETE /api/v1/admin/exams

### 3.6 `/admin/polls` — Manage Polls
- **Components:** AdminPollsPage, PollTable, CreatePollModal, PollResultsView
- **Data source:** GET /api/v1/admin/polls
- **Features:** Create/close/delete polls, show results, vote count
- **Tests needed:** Poll creation, results display, close action
- **API dependency:** GET/POST/DELETE /api/v1/admin/polls

### 3.7 `/admin/knowledge` — Manage AI Knowledge Base
- **Components:** AdminKnowledgePage, DocumentTable, DocumentUploadModal, ReindexModal
- **Data source:** GET /api/v1/admin/knowledge
- **Features:** Upload documents, re-add existing ones, CR-only delete & reindex buttons
- **Tests needed:** Upload form validation, reindex confirmation, document table
- **API dependency:** GET/POST/PUT/DELETE /api/v1/admin/knowledge (+ POST /reindex for CR)

### 3.8 `/admin/audit-log` — Audit Log (Read-only for all admins)
- **Components:** AdminAuditLogPage, AuditLogTable, ActionFilter, ExportButton (CR only)
- **Data source:** GET /api/v1/admin/audit-log
- **Features:** Searchable/filterable table, action badges with colors, row expansion for metadata
- **Tests needed:** Table filtering, row expansion, metadata JSON display
- **API dependency:** GET /api/v1/admin/audit-log

### 3.9 `/admin/users` — User Management (CR-only)
- **Components:** AdminUsersPage, UserTable, RoleChangeModal, UserDrawer (right panel)
- **Data source:** GET /api/v1/admin/users
- **Features:** List all users, change roles (Student ↔ Admin, but not to CR), bulk export CSV
- **Tests needed:** Table rendering, role change confirmation, export CSV
- **API dependency:** GET /api/v1/admin/users, POST /api/v1/admin/users/[id]/role

---

## PHASE 4: API ROUTES (20+ endpoints)

### 4.1 Public Routes
```
GET  /api/v1/health               Health check response
```

### 4.2 Student Routes (requires auth)
```
GET     /api/v1/announcements?page&limit&type    [Paginated list]
GET     /api/v1/routine                           [From Google Sheets, cached]
GET     /api/v1/files?course&type&sort            [Grouped by course]
GET     /api/v1/exams?sort=date                   [Sorted by exam date]
GET     /api/v1/polls                             [List of polls]
POST    /api/v1/polls/[id]/vote                   [Submit vote]
POST    /api/v1/chat                              [AI chatbot with streaming]
GET     /api/v1/notifications?read&limit          [User notifications]
POST    /api/v1/push/subscribe                    [Register push token]
GET     /api/v1/profile                           [User profile info]
PATCH   /api/v1/profile                           [Update profile]
GET     /api/v1/study-groups                      [List study groups]
POST    /api/v1/study-groups/[id]/join            [Join group]
```

### 4.3 Admin Routes (requires admin role)
```
GET     /api/v1/admin/announcements                [List all]
POST    /api/v1/admin/announcements                [Create]
PATCH   /api/v1/admin/announcements/[id]           [Edit own or CR]
DELETE  /api/v1/admin/announcements/[id]           [Delete own or CR]

GET     /api/v1/admin/files                        [List all]
POST    /api/v1/admin/files                        [Upload]
DELETE  /api/v1/admin/files/[id]                   [Delete own or CR]

GET     /api/v1/admin/exams                        [List all]
POST    /api/v1/admin/exams                        [Create]
PATCH   /api/v1/admin/exams/[id]                   [Edit]
DELETE  /api/v1/admin/exams/[id]                   [Delete]

GET     /api/v1/admin/polls                        [List all]
POST    /api/v1/admin/polls                        [Create]
DELETE  /api/v1/admin/polls/[id]                   [Delete (CR only)]

GET     /api/v1/admin/knowledge                    [List documents]
POST    /api/v1/admin/knowledge                    [Add document]
PUT     /api/v1/admin/knowledge/[id]               [Re-add document]
DELETE  /api/v1/admin/knowledge/[id]               [Delete (CR only)]
POST    /api/v1/admin/knowledge/reindex             [Reindex all (CR only)]

GET     /api/v1/admin/audit-log                    [List audit entries]
```

### 4.4 Super Admin Routes (CR only)
```
GET     /api/v1/admin/users                        [List all users]
POST    /api/v1/admin/users/[id]/role              [Change role]
GET     /api/v1/admin/audit-log?export=csv         [Export audit log]
```

### 4.5 Internal Routes (requires INTERNAL_API_SECRET header)
```
POST    /api/v1/internal/announcements/broadcast   [For n8n automation]
```

---

## IMPLEMENTATION ORDER (Sequential with Testing)

### Sprint 1: Student Pages (9 pages) + Auth Pages (2 pages)
1. Create auth pages (login, error) — no API needed
2. Create `/announcements` page + API route
3. Create `/routine` page + API route
4. **Test checkpoint:** Both pages render, data fetches correctly
5. Create `/resources` page + API route
6. Create `/exams` page + API route
7. **Test checkpoint:** Exams countdown calculation works
8. Create `/polls` page + API route (with voting)
9. Create `/study-groups` page + API route
10. Create `/chat` page + API route (streaming)
11. Create `/profile` page + API route
12. **Final checkpoint:** All student pages tested

### Sprint 2: Admin Pages (9 pages) + Admin API Routes
1. Create admin layout `(admin)/layout.tsx`
2. Create `/admin` overview page
3. Create `/admin/announcements` page + API routes (GET, POST, PATCH, DELETE)
4. **Test checkpoint:** CRUD operations work
5. Create `/admin/files` page + API routes
6. Create `/admin/exams` page + API routes
7. **Test checkpoint:** Date picker integration works
8. Create `/admin/polls` page + API routes
9. Create `/admin/knowledge` page + API routes (including reindex for CR)
10. Create `/admin/audit-log` page + API route
11. Create `/admin/users` page + API routes (CR-only)
12. **Final checkpoint:** All admin pages tested, role-based access verified

### Sprint 3: Component Tests + Integration Tests
1. Write unit tests for all API helpers (rate-limit, auth-guards, etc.)
2. Write component tests for all pages
3. Write API integration tests (test DB, mocked auth)
4. Load testing with k6 on key endpoints
5. Security testing (injection, CSRF, etc.)

---

## FILES TO CREATE

### Pages (20 files)
```
Student:
  src/app/(student)/announcements/page.tsx
  src/app/(student)/routine/page.tsx
  src/app/(student)/resources/page.tsx
  src/app/(student)/exams/page.tsx
  src/app/(student)/polls/page.tsx
  src/app/(student)/study-groups/page.tsx
  src/app/(student)/chat/page.tsx
  src/app/(student)/profile/page.tsx

Auth:
  src/app/(auth)/login/page.tsx
  src/app/(auth)/auth/error/page.tsx

Admin:
  src/app/(admin)/layout.tsx
  src/app/(admin)/page.tsx
  src/app/(admin)/announcements/page.tsx
  src/app/(admin)/files/page.tsx
  src/app/(admin)/exams/page.tsx
  src/app/(admin)/polls/page.tsx
  src/app/(admin)/knowledge/page.tsx
  src/app/(admin)/audit-log/page.tsx
  src/app/(admin)/users/page.tsx
```

### Components (30+ files)
```
Student page components, Admin page components, Shared UI components, Modals, Tables, Forms
```

### API Routes (20+ files)
```
All under src/app/api/v1/
```

### Tests (50+ files)
```
Unit tests, Component tests, Integration tests for all above
```

---

## Testing Strategy (per 11_TESTING.md)

### Each Page Gets:
1. **Unit tests** for helper functions specific to that page
2. **Component tests** with @testing-library/react
3. **API integration tests** (if page fetches data)
4. **E2E test** with Playwright (optional for critical user flows)

### Test Pattern Example:
```typescript
// src/app/(student)/announcements/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react'
import { AnnouncementsPage } from '../page'
import { vi } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn().mockResolvedValue(mockSession) }))
vi.mock('@/lib/prisma', () => ({
  prisma: { announcement: { findMany: vi.fn().mockResolvedValue([...]) } }
}))

describe('AnnouncementsPage', () => {
  it('renders page title', () => { /* ... */ })
  it('displays announcements from API', () => { /* ... */ })
  it('filters by type', () => { /* ... */ })
  // ... more tests
})
```

---

## Success Criteria
- ✅ All 20 pages render without errors
- ✅ All API routes return correct status codes & data
- ✅ Role-based access control enforced (middleware + route-level)
- ✅ Tests pass: 80%+ coverage for pages & components
- ✅ No SQL injection, XSS, or CSRF vulnerabilities
- ✅ Performance: /api endpoints respond <200ms
- ✅ Mobile responsive on all pages (≤768px)
