# IPE-24 Portal | Comprehensive UI/UX Improvement Strategy

**Date:** April 14, 2026  
**Framework:** UI/UX Pro Max  
**Scope:** Complete 20-page project audit and recommendations  
**Status:** Strategic Planning Document

---

## Executive Summary

The IPE-24 Portal is a comprehensive student/admin management system requiring a cohesive design system across 20+ pages. This document provides a **strategic UI/UX improvement plan** based on UI/UX Pro Max principles, organized by:

1. **Design System** (Foundation)
2. **Page-by-Page Recommendations** (20 pages across 3 tiers)
3. **Component Library** (Reusable elements)
4. **Implementation Priorities** (Phased rollout)
5. **Accessibility & Performance** (Cross-cutting concerns)

---

## Part 1: Design System Foundation

### 1.1 Color Palette Strategy

**Current State:** Dark theme (slate-950 → slate-900) with indigo/cyan accents ✅

**Recommendations:**

| Role | Hex | Tailwind | Usage | Priority |
|------|-----|----------|-------|----------|
| **Primary BG** | `#0F172A` | slate-950 | Main pages | ✅ Done |
| **Secondary BG** | `#1E293B` | slate-900 | Cards, modals | ✅ Done |
| **Tertiary BG** | `#334155` | slate-700 | Hover states | ⚠️ Add |
| **Text Primary** | `#F8FAFC` | slate-50 | Headings, labels | ✅ Done |
| **Text Secondary** | `#CBD5E1` | slate-400 | Body text | ✅ Done |
| **Text Muted** | `#94A3B8` | slate-500 | Footer, captions | ✅ Done |
| **CTA Primary** | `#4F46E5` | indigo-600 | Main actions (blue) | ✅ Done |
| **CTA Secondary** | `#0891B2` | cyan-600 | Alternative (teal) | ⚠️ Add |
| **Success** | `#10B981` | emerald-500 | Positive states | ⚠️ Add |
| **Warning** | `#F59E0B` | amber-500 | Caution states | ⚠️ Add |
| **Danger** | `#EF4444` | red-500 | Error, delete | ⚠️ Add |
| **Info** | `#3B82F6` | blue-500 | Informational | ⚠️ Add |
| **Admin Accent** | `#A855F7` | purple-600 | Admin UI highlights | ⚠️ Add |
| **CR Badge** | `#EC4899` | pink-500 | Class Rep indicator | ⚠️ Add |

**Action Items:**
- [ ] Define CSS variables in `globals.css`
- [ ] Add semantic color tokens (--color-success, --color-danger, etc.)
- [ ] Create color palette documentation

---

### 1.2 Typography System (Standard)

**Current:** Fira Sans + Fira Code (from project-wide MASTER.md) ✅

**Revised Scale (Responsive):**

| Use | Element | Mobile | Tablet | Desktop | Weight | Line Height |
|-----|---------|--------|--------|---------|--------|-------------|
| Hero | H1 | 32px | 40px | 48px | 700 | 1.2 |
| Major | H2 | 24px | 28px | 36px | 700 | 1.2 |
| Section | H3 | 18px | 20px | 24px | 700 | 1.25 |
| Subsection | H4 | 16px | 18px | 20px | 600 | 1.3 |
| Body | p | 16px | 16px | 16px | 500 | 1.5 |
| Small | small | 14px | 14px | 14px | 500 | 1.5 |
| Tiny | code | 12px | 12px | 12px | 400 | 1.4 |

**Recommendations:**
- ✅ Minimum 16px on mobile for body text (accessibility)
- ✅ Use 1.2–1.3 line height on headings (tight, professional)
- ✅ Use 1.5 line height on body (readable, comfortable)
- ⚠️ Add responsive typography Tailwind utilities

---

### 1.3 Spacing & Layout System

**Current:** 4px base unit (xs, sm, md, lg, xl, 2xl) ✅

**Grid System (Mobile-First):**

```
Mobile:    px-4 (16px padding)
Tablet:    px-6 (24px padding)  
Desktop:   px-8 (32px padding)

Max-width tokens:
- Section:  max-w-7xl (80rem)
- Content:  max-w-4xl (56rem)
- Form:     max-w-2xl (42rem)
- Card:     max-w-sm (24rem)
```

**Spacing Tokens:**
```
xs:   4px    (0.25rem)
sm:   8px    (0.5rem)
md:   16px   (1rem)
lg:   24px   (1.5rem)
xl:   32px   (2rem)
2xl:  48px   (3rem)
```

**Recommendations:**
- ✅ Use consistent spacing in all new pages
- ⚠️ Create Tailwind-based layout components (Container, Section, Grid)
- ⚠️ Document max-width breakpoints for tables, forms

---

### 1.4 Border & Shadow System

**Current:** Subtle borders (border-slate-800/50) ✅

**Updated Shadow Scale:**

```tailwind
shadow-sm      /* Subtle: cards, small elements */
shadow-md      /* Standard: form inputs, hover states */
shadow-lg      /* Emphasis: modals, expanded cards */
shadow-xl      /* Heavy: major CTA, panels, modals on dark */
shadow-2xl     /* Extreme: floating actions, alerts */

Dark theme adjustment:
shadow-dark    /* Add: box-shadow: 0 4px 12px rgba(0,0,0,0.3) */
```

**Border Radius Scale:**
```tailwind
rounded-lg    /* 8px: buttons, inputs, small cards */
rounded-xl    /* 12px: standard cards, modals */
rounded-2xl   /* 16px: feature cards, major containers */
rounded-3xl   /* 24px: hero sections, rounded badges */
```

---

### 1.5 Component Design Tokens

**Button Family:**
```tailwind
/* Primary (Indigo) */
bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
text-white shadow-lg hover:shadow-xl

/* Secondary (Outlined) */
border-2 border-slate-700 hover:border-slate-600
hover:bg-slate-900 text-slate-100

/* Danger (Red) */
bg-red-600 hover:bg-red-700 active:bg-red-800
text-white shadow-lg

/* Ghost (No background) */
hover:bg-slate-900 text-slate-300 hover:text-slate-100
```

**Input Family:**
```tailwind
/* Text Input */
bg-slate-950/50 border border-slate-800
focus:bg-slate-950 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50

/* Textarea */
Min height: h-32 (8rem)
Same styling as text input

/* Select/Dropdown */
Same as input + chevron icon positioning
```

**Card Family:**
```tailwind
/* Standard */
bg-slate-900/50 border border-slate-800/50 rounded-xl p-6

/* Elevated */
bg-slate-900 border border-slate-700/50 shadow-lg rounded-2xl p-8

/* Interactive */
hover:bg-slate-900 hover:border-slate-700/50 transition-all duration-300
```

---

## Part 2: Page-by-Page Recommendations

### Tier 1: Authentication Flow (2 pages) ✅ **DONE**

#### 1. `/login` — Authentication Gateway
**Status:** ✅ Redesigned  
**Completion:** 100%

**What's Done:**
- ✅ Dark modern design with gradient accents
- ✅ Tabbed interface (Google OAuth | Admin credentials)
- ✅ Form validation (Zod + React Hook Form)
- ✅ Accessible (WCAG AA, focus rings, ARIA labels)
- ✅ Responsive (mobile-first)
- ✅ Password visibility toggle
- ✅ Loading states with spinners

**Recommendations:**
- [ ] Add "Remember device" checkbox (for future 2FA reduction)
- [ ] Add "Forgot password" link (for future password reset flow)
- [ ] Add sign-up link (if user registration is added)

---

#### 2. `/` — Landing Page (Public Gateway)
**Status:** ✅ Redesigned  
**Completion:** 100%

**What's Done:**
- ✅ Hero section with clear value proposition
- ✅ Feature showcase (bento grid)
- ✅ Capabilities section
- ✅ Stats/social proof
- ✅ Clear CTAs (Access Portal, Learn More)
- ✅ Professional footer
- ✅ Responsive design
- ✅ Accessible navigation

**Recommendations:**
- [ ] Add testimonials section (student quotes)
- [ ] Add FAQ section (common questions)
- [ ] Add blog/news integration (latest updates)

---

### Tier 2: Student Pages (9 pages) ⚠️ **NEEDS DESIGN**

#### 3. `/announcements` — Announcement Feed
**Current:** None  
**Recommended Design:** Timeline-style feed with filters

**UI Recommendations:**
```
Layout: Single-column list or card grid (2-column on desktop)

Components:
├─ Navbar (dark, fixed at top)
├─ Page Title + Breadcrumb
├─ Filter Bar (by type: Exam|File|General, search, date range)
├─ Announcement Cards (vertical or grid)
│  ├─ Announcement header (icon, type, date, author)
│  ├─ Title (h3)
│  ├─ Preview text (truncated, 3 lines)
│  ├─ Attachments (if any)
│  └─ "Read More" CTA
└─ Pagination (bottom)

Visual Hierarchy:
- Featured announcement (larger, top)
- Recent announcements (standard cards)
- Archived announcements (muted, toggled)

Color Coding:
- Exam:    Blue badge + icon
- File:    Green badge + download icon
- General: Slate badge + bell icon
```

**Accessibility:**
- ✅ Filter button: keyboard accessible (Tab, Enter)
- ✅ Announcement cards: clickable via keyboard
- ✅ Search: live results with aria-live region

**Responsive:**
- Mobile: Single column, full-width cards
- Tablet: 1.5 columns or single
- Desktop: 2-column grid with sidebar (OR single column full-width)

---

#### 4. `/routine` — Weekly Class Schedule
**Current:** None  
**Recommended Design:** Timetable grid with time indicators

**UI Recommendations:**
```
Layout: Horizontal scrollable timetable on mobile, fixed on desktop

Components:
├─ Navbar
├─ Week Navigator (← Previous | Show week dates | Next →)
├─ "Jump to Today" button (prominent if not current week)
├─ Timetable Grid (Mon–Fri, 8AM–6PM)
│  ├─ Time labels (Y-axis)
│  ├─ Day headers (X-axis)
│  ├─ Class blocks (colored by course)
│  │  ├─ Course code (bold)
│  │  ├─ Instructor name
│  │  ├─ Room/location
│  │  ├─ Status indicator:
│  │  │  ├─ ● Red (Live Now)
│  │  │  ├─ ⏰ Amber (Next in X min)
│  │  │  └─ ✓ Green (Completed)
│  └─ Empty slots (subtle background)
└─ Legend (color codes by course)

Visual Design:
- Light grid lines (slate-800/30)
- Course colors (distinct palette)
- Current time indicator (vertical red line)
- Hover card with full details

Mobile Behavior:
- Horizontal scroll for days
- Smaller course cards
- Time axis smaller font
- Touch-friendly spacing (44×44px targets)
```

**Responsive:**
- Mobile: Horizontal scroll (1 day visible at a time)
- Tablet: 2–3 days visible
- Desktop: Full week 5 days visible

**Features:**
- [ ] Sync indicator (last synced from Google Sheets)
- [ ] Sync refresh button (for admins)
- [ ] Calendar view toggle (grid ↔ list)
- [ ] Export to calendar (iCal)

---

#### 5. `/resources` — Study Materials Library
**Current:** None  
**Recommended Design:** Searchable file browser with course grouping

**UI Recommendations:**
```
Layout: Sidebar (filters) + Main area (file list/grid)

Components:
├─ Navbar
├─ Page Title + Upload button (if enabled for students)
├─ Sidebar (sticky on desktop, collapsible on mobile)
│  ├─ Search box (top fixed)
│  ├─ Course filter (checkboxes, searchable)
│  ├─ File type filter (PDF, PPT, DOC, ZIP, etc.)
│  ├─ Date filter (This month, This semester, All)
│  └─ Sort options (Recent, Name, Course)
├─ Main Area
│  ├─ Results count ("42 files found")
│  ├─ View toggle (list ↔ grid)
│  ├─ File table/grid
│  │  ├─ File icon (by type)
│  │  ├─ File name (bold, clickable)
│  │  ├─ Course tag (badge)
│  │  ├─ File size
│  │  ├─ Upload date
│  │  ├─ Download button (chevron-right)
│  │  └─ Preview option (for PDF/IMG)
│  └─ Pagination
└─ "No results" state (with clear filter CTA)

Color Scheme:
- PDF:      Red     (#EF4444)
- PowerPoint: Orange (#F97316)
- Word:     Blue    (#3B82F6)
- ZIP:      Purple  (#A855F7)
- Image:    Green   (#10B981)
```

**Responsive:**
- Mobile: Single-column list, sidebar collapses to drawer
- Tablet: Sidebar left + list or grid
- Desktop: Sidebar + grid view (2–3 columns)

**Features:**
- [ ] Full-text search across file metadata
- [ ] Star/favorite files
- [ ] Recently downloaded list
- [ ] Course-based quick filters

---

#### 6. `/exams` — Exam Schedule & Countdown
**Current:** ExamCountdown component exists  
**Recommended Design:** Hero countdown + detailed schedule

**UI Recommendations:**
```
Layout: Hero section + table/card list

Components:
├─ Navbar
├─ Hero Countdown (If exam within 7 days)
│  ├─ Large countdown timer (Days | Hours | Minutes | Seconds)
│  ├─ "Next Exam" label
│  ├─ Course name (h3, bold)
│  ├─ Date & time (subtitle)
│  ├─ Location/room (if available)
│  ├─ Background: Gradient (course color)
│  └─ Animation: Subtle pulse/glow
├─ Quick Actions (sticky or below hero)
│  ├─ "Add to Calendar" button
│  ├─ "Set Reminder" button
│  └─ "View All Exams" link
├─ Exam List (table or cards)
│  ├─ Course code | Date | Time | Room | Status
│  ├─ Status badges:
│  │  ├─ "Upcoming" (amber, text-sm)
│  │  ├─ "Today" (blue, bold)
│  │  ├─ "Completed" (green, muted)
│  │  └─ "Cancelled" (red, strikethrough)
│  ├─ Expandable rows (show seating info, instructions)
│  └─ Sort options (Date, Course, Status)
└─ Empty state (if no exams)

Mobile Behavior:
- Hero countdown still visible (scaled down to fit)
- Switch table to card view for small screens
- Vertical layout for exam details
```

**Responsive:**
- Mobile: Card view, stacked layout
- Tablet: Compact table or 1-column cards
- Desktop: Full table with status badges

**Features:**
- [ ] Calendar integration (export ICS)
- [ ] Exam seating chart PDF link
- [ ] Study material recommendations (from resources)
- [ ] Remind me option (time-based notification)

---

#### 7. `/polls` — Anonymous Polling & Voting
**Current:** None  
**Recommended Design:** Card-based polls with voting flow

**UI Recommendations:**
```
Layout: Centered column (max-w-2xl)

Components:
├─ Navbar
├─ Page Title ("Active Polls")
├─ Filter/Tab: Active | Closed | My Votes
├─ Poll Cards (stacked, max-w-2xl centered)
│  ├─ Poll header
│  │  ├─ Title (h3)
│  │  ├─ Question text
│  │  ├─ Created by (optional, anonymous)
│  │  ├─ Expires/Closed label
│  │  └─ Vote count (small text)
│  ├─ Options
│  │  ├─ Option text (left-aligned)
│  │  ├─ Radio/checkbox input
│  │  ├─ Vote count + percentage (if closed or user voted)
│  │  └─ Progress bar (visual percentage)
│  └─ Actions
│     ├─ "Vote" button (submit – if active, not voted)
│     ├─ "View Results" button (if voted or closed)
│     └─ Status (voted/closed)
└─ Pagination (if many polls)

States:
- Active + Not voted: Radio options + Vote button (blue)
- Active + Already voted: Radio selected, results shown, disabled
- Closed: Results shown, no voting, muted
- Loading: Skeleton cards

Color Scheme:
- Active: Blue accent on "Vote" button
- Closed: Muted, slate-600 text
- Results: Green progress bar
```

**Responsive:**
- Mobile: Full-width cards, single column
- Desktop: max-w-2xl centered

**Features:**
- [ ] Anonymous voting (don't show voter names)
- [ ] Time-based auto-close
- [ ] Real-time result updates (if WebSocket available)
- [ ] Multi-choice vs multiple-choice options

---

#### 8. `/study-groups` — Peer Study Organization
**Current:** None  
**Recommended Design:** Community board with group cards

**UI Recommendations:**
```
Layout: Grid of group cards + sidebar filters/create button

Components:
├─ Navbar
├─ Page Title + "Create Group" button (sticky or hero)
├─ Sidebar/Filter section
│  ├─ Search groups (by name, course)
│  ├─ Course filter (checkboxes)
│  ├─ My Groups toggle (show only joined)
│  └─ Sort (Recent, Popular, Members)
├─ Group Grid (2-3 columns on desktop)
│  ├─ Group Card
│  │  ├─ Group name (h4)
│  │  ├─ Course tag (badge)
│  │  ├─ Description (2-3 lines, truncated)
│  │  ├─ Stats line
│  │  │  ├─ "👥 24 members"
│  │  │  ├─ "📍 [Location]"
│  │  │  └─ "⏰ Created 2 weeks ago"
│  │  ├─ Member avatars (first 3, +N more)
│  │  └─ Actions
│  │     ├─ "Join Group" button (if not member, blue)
│  │     ├─ "Leave" button (if member, danger)
│  │     └─ "View Details" link
│  └─ Group Detail Modal/Page
│     ├─ Group name + course
│     ├─ Full description
│     ├─ Full member list with join date
│     ├─ Contact info (Discord, phone channel link, etc.)
│     ├─ Next meetup (if scheduled)
│     └─ Chat preview (if chat enabled)
└─ Empty state (join a group to get started)

Create Group Modal:
├─ Group name (required)
├─ Course selector (dropdown)
├─ Description (textarea, 100–500 chars)
├─ Contact method (Discord invite link, phone number, etc.)
└─ "Create" button
```

**Responsive:**
- Mobile: Single column card list
- Tablet: 2 columns
- Desktop: 3 columns with sidebar

**Features:**
- [ ] Discord server integration (auto-invite link)
- [ ] WhatsApp group link
- [ ] Next study session scheduling
- [ ] Files sharing within group

---

#### 9. `/chat` — AI Virtual CR (24/7 Chatbot)
**Current:** ChatInterface component (stub)  
**Recommended Design:** Modern chat UI with suggested questions

**UI Recommendations:**
```
Layout: Full-height chat interface (fixed top/bottom)

Components:
├─ Header (fixed top)
│  ├─ "AI Virtual CR" title
│  ├─ Status indicator ("Online" green dot)
│  ├─ Help icon (?)
│  ├─ Clear history button (⟲)
│  └─ Info button (→ settings/about)
├─ Chat Area (scrollable middle)
│  ├─ Welcome state (first load)
│  │  ├─ "Hello! I'm the IPE-24 Virtual CR"
│  │  ├─ "Ask me about: [chips below]"
│  │  └─ Suggested questions (clickable chips)
│  ├─ Message List
│  │  ├─ User message (right-aligned, blue bubble)
│  │  ├─ Bot message (left-aligned, slate bubble)
│  │  ├─ Markdown support (bold, lists, code blocks)
│  │  ├─ Links (underlined, hover state)
│  │  └─ Typing indicator (pulsing dots)
│  ├─ Rate limit indicator (when approaching limit)
│  │  ├─ "2 of 10 messages left today"
│  │  └─ Progress bar
│  └─ Empty state (if no history)
├─ Input Area (fixed bottom)
│  ├─ Text input (multi-line, placeholder)
│  ├─ Suggested questions (chips, horizontal scroll)
│  ├─ Send button (arrow icon, blue, disabled if empty)
│  └─ "Loading..." state (on submit)
└─ Error Handling
   ├─ "Sorry, I didn't understand" message
   ├─ "System is busy" message
   └─ Retry button

Color Scheme:
- User message: bg-indigo-600, white text
- Bot message: bg-slate-800, slate-100 text
- Links: text-cyan-400 hover:text-cyan-300
```

**Responsive:**
- Mobile: Full-width, keyboard-aware (input above keyboard)
- Desktop: max-w-3xl centered or full-width

**Features:**
- [ ] Chat history persistence (local storage or backend)
- [ ] Clear history button
- [ ] Export conversation as PDF
- [ ] Copy message to clipboard
- [ ] Suggested follow-up questions
- [ ] Rate limit display (queries/day counter)

---

#### 10. `/profile` — User Account & Settings
**Current:** None  
**Recommended Design:** Tab-based settings panel

**UI Recommendations:**
```
Layout: Sidebar (nav) + Main content area

Components:
├─ Navbar
├─ Page Title ("My Profile")
├─ Sidebar/Tab Nav (sticky on desktop, collapsible on mobile)
│  ├─ "Account" (active by default)
│  ├─ "Preferences"
│  ├─ "Notifications"
│  ├─ "Security"
│  └─ "Support"
├─ Main Content Area
│  ├─ Account Tab
│  │  ├─ Profile picture (avatar, upload option)
│  │  ├─ Full name (editable, text input)
│  │  ├─ Email (non-editable, read-only)
│  │  ├─ Phone (optional, editable)
│  │  ├─ Bio / About me (textarea)
│  │  ├─ Last login (muted text, readonly)
│  │  ├─ Account created (timestamp, readonly)
│  │  └─ "Save Changes" button (bottom)
│  ├─ Preferences Tab
│  │  ├─ Theme toggle (Light | Dark | System)
│  │  ├─ Language selector (English | বাংলা | العربية)
│  │  ├─ Default page (home | dashboard)
│  │  ├─ Notification tone (sound on/off)
│  │  └─ Save button
│  ├─ Notifications Tab
│  │  ├─ Email notifications (toggle + frequency)
│  │  ├─ Browser push notifications (toggle)
│  │  ├─ SMS alerts (toggle, if supported)
│  │  ├─ Announcement types (filter which notifications to receive)
│  │  └─ Unsubscribe all (danger action)
│  ├─ Security Tab
│  │  ├─ Password change form
│  │  │  ├─ Current password (required)
│  │  │  ├─ New password (required, show/hide toggle)
│  │  │  ├─ Confirm password (required, show/hide toggle)
│  │  │  └─ "Update Password" button
│  │  ├─ 2FA setup (if admin)
│  │  ├─ Trusted devices (list, remove option)
│  │  └─ Sign out all devices button
│  └─ Support Tab
│     ├─ FAQ links
│     ├─ Contact support form
│     ├─ Report bug button
│     └─ Version info (last updated)
└─ Danger Zone (at bottom of Account tab)
   ├─ Sign out button (red)
   └─ Delete account button (red, with confirmation modal)

Forms:
- Input validation (email, phone format)
- Success/error messages (toasts)
- Field change indicators (unsaved asterisk)
- Loading states on buttons
```

**Responsive:**
- Mobile: Tabs as collapsible menu, full-width forms
- Tablet: Sidebar left, main right (side-by-side)
- Desktop: Same as tablet

**Features:**
- [ ] Profile picture upload and crop
- [ ] Multi-language support (i18n)
- [ ] Keyboard shortcuts settings
- [ ] Data export (GDPR compliance)
- [ ] Account recovery options

---

### Tier 3: Admin Pages (9 pages) ⚠️ **NEEDS DESIGN**

#### 11-19. Admin Dashboard & Management Pages
**Current:** None  
**Context:** Admin-only section with CR (Class Rep) elevation

**Design Philosophy for Admin Pages:**

```
Color Accent: Purple (not indigo like students)
├─ Purple buttons: #A855F7
├─ Purple badges: purple-600/20 background
└─ CR-only badges: Pink (#EC4899)

Navigation:
├─ Sidebar (always visible on desktop, collapsible on mobile)
├─ Breadcrumb (Admin / Announcements / Edit)
└─ Admin badge (top-right, "CR" for class reps in pink)

Layout:
├─ Max-width: 7xl (for tables)
├─ Padding: Same responsive (px-4 md:px-6)
└─ Spacing: Same grid (24px gaps between sections)

Components:
├─ Data tables (sortable, filterable, paginated)
├─ Create/Edit modals (form validation)
├─ Bulk actions (checkboxes, action menu)
├─ Status badges (color-coded by type)
├─ Confirmation dialogs (danger actions)
└─ Success/error toasts
```

**Recommended UI Pattern for All Admin Pages:**

```
Page Layout:
├─ Navbar (dark, with admin indicator)
├─ Page Title + Description
├─ Primary CTA Button (Create/Upload/Add)
├─ Filter & Sort Bar
│  ├─ Search box (by name/content)
│  ├─ Filter dropdowns (by status, date, etc.)
│  ├─ Sort selector (Recent, Alphabetical, etc.)
│  └─ Results count
├─ Data Table or Card Grid
│  ├─ Columns: Checkbox | Name | Metadata | Date | Status | Actions
│  ├─ Hover: Highlight row, show action menu (⋮)
│  ├─ Actions: Edit | Delete | More (⋯)
│  └─ Pagination (bottom)
├─ Bulk Actions Bar (if rows selected)
│  ├─ "X selected" count
│  ├─ Bulk delete button (danger)
│  └─ Clear selection link
└─ Empty State (if no items)
   ├─ Illustration
   ├─ Message ("No announcements yet")
   └─ Create button
```

---

#### 11. `/admin` — Admin Dashboard Overview
**Recommended Design:**

```
Components:
├─ Welcome section
│  ├─ "Welcome back, [Name]"
│  ├─ Current role badge (CR or Admin)
│  └─ System status indicator
├─ Stats Grid (4 cards)
│  ├─ Total Announced
│  ├─ Active Polls
│  ├─ Students Online
│  └─ Pending Approvals
├─ System Health Widget
│  ├─ Database status (● Green/Red)
│  ├─ API status (● Green/Red)
│  ├─ Last sync time
│  └─ Uptime percentage
├─ Recent Activity Feed
│  ├─ "Announcement posted" (5min ago)
│  ├─ "New file uploaded" (1h ago)
│  ├─ Timeline-style, scrollable
│  └─ View all link
├─ Quick Actions (4 buttons)
│  ├─ "Create Announcement"
│  ├─ "Upload File"
│  ├─ "Create Poll"
│  └─ "View Audit Log"
└─ (CR Only) Management Card
   ├─ "User Management"
   ├─ "Manage Admins"
   ├─ "System Settings"
   └─ "Data Export"
```

---

#### 12. `/admin/announcements` — Announcement Manager
**Recommended Design:**

```
Components:
├─ Create button: "New Announcement" (top-right, purple)
├─ Filters:
│  ├─ Status: Draft | Published | Archived
│  ├─ Type: Exam | File | General | Routine
│  └─ Date range selector
├─ Search: By title or content
├─ Table Layout:
│  ├─ Columns:
│  │  ├─ ☐ Checkbox (select)
│  │  ├─ Title (h4)
│  │  ├─ Type (badge: blue/amber/green)
│  │  ├─ Status (Draft/Published/Archived)
│  │  ├─ Created/Published date
│  │  ├─ Author (if not you)
│  │  └─ Actions (Edit | Preview | Delete)
│  ├─ Hover: Highlight, show action menu
│  └─ Expandable rows: Show preview, metadata
├─ Create/Edit Modal:
│  ├─ Title (required, text input)
│  ├─ Type (selector: Exam|File|General)
│  ├─ Content (rich text editor or markdown)
│  ├─ Featured image (optional, upload)
│  ├─ Publishing
│  │  ├─ Publish now (toggle)
│  │  ├─ Schedule publish (date/time picker)
│  │  └─ Publish to platforms (checkboxes)
│  │     ├─ ☑ Dashboard
│  │     ├─ ☑ Discord
│  │     ├─ ☑ Telegram
│  │     ├─ ☑ WhatsApp
│  │     └─ ☑ Push notifications
│  └─ Save & Publish button
└─ Success toast: "Announcement published to 5 platforms"
```

---

#### 13. `/admin/files` — File Upload & Management
**Recommended Design:**

```
Components:
├─ Upload button: "Upload File" (top-right, purple)
├─ Bulk upload example: Drag & drop zone (optional)
├─ Filters:
│  ├─ Course selector (dropdown)
│  ├─ File type (PDF, PPT, DOC, ZIP)
│  └─ Date uploaded
├─ Table Layout:
│  ├─ Columns:
│  │  ├─ ☐ Checkbox
│  │  ├─ File icon + name (clickable for preview)
│  │  ├─ Course (tag)
│  │  ├─ File size (human-readable)
│  │  ├─ Uploaded by
│  │  ├─ Uploaded date
│  │  └─ Actions (Download | Preview | Delete)
├─ Upload Modal:
│  ├─ File input (drag & drop support)
│  ├─ Course selector (required)
│  ├─ File description (optional, textarea)
│  ├─ Visibility: Public | Private (students only)
│  └─ Upload button (shows progress bar)
└─ Upload progress:
   ├─ File size + progress bar
   ├─ Speed (MB/s)
   └─ Time remaining
```

---

#### 14. `/admin/exams` — Exam Schedule Manager
**Recommended Design:**

```
Components:
├─ Create button: "Add Exam" (top-right, purple)
├─ Filters:
│  ├─ Course (dropdown)
│  ├─ Status (Upcoming | Completed | Cancelled)
│  └─ Date range
├─ Calendar view toggle (Calendar | Table | List)
├─ Table Layout (default):
│  ├─ Columns:
│  │  ├─ ☐ Checkbox
│  │  ├─ Course code (bold)
│  │  ├─ Date | Time
│  │  ├─ Room/Location
│  │  ├─ Status (badge)
│  │  ├─ Duration
│  │  └─ Actions (Edit | Delete)
├─ Create/Edit Modal:
│  ├─ Course selector (required, dropdown)
│  ├─ Date picker (required)
│  ├─ Time picker (required, HH:MM)
│  ├─ Duration (minutes, default 2h)
│  ├─ Room/Location (text input)
│  ├─ Seating chart PDF (optional, file upload)
│  ├─ Instructions (optional, textarea)
│  ├─ Exam type: Midterm | Final | Quiz
│  └─ Save button
└─ Calendar view:
   ├─ Month view with exam dots
   ├─ Week view with time slots
   └─ Click to edit exam
```

---

#### 15. `/admin/polls` — Poll Creator & Manager
**Recommended Design:**

```
Components:
├─ Create button: "New Poll" (top-right, purple)
├─ Filters:
│  ├─ Status: Active | Closed | Draft
│  └─ Created date range
├─ Table Layout:
│  ├─ Columns:
│  │  ├─ ☐ Checkbox
│  │  ├─ Question (h4)
│  │  ├─ Status (badge: Active/Closed/Draft)
│  │  ├─ Responses (X responses, Y%)
│  │  ├─ Expires (date/countdown)
│  │  └─ Actions (View Results | Edit | Close | Delete)
├─ Create/Edit Modal:
│  ├─ Question text (required, textarea)
│  ├─ Options list (add/remove options)
│  │  ├─ Option 1 (text input)
│  │  ├─ Option 2 (text input)
│  │  ├─ Add option button (+ icon)
│  │  └─ Min 2 options, max 5
│  ├─ Poll settings
│  │  ├─ Allow multiple selections (toggle)
│  │  ├─ Anonymous responses (toggle)
│  │  ├─ Show results (toggle)
│  │  └─ Expires at (date/time picker)
│  └─ Create button
├─ Results View:
│  ├─ Question (h3)
│  ├─ Responses (X total responses)
│  ├─ Options with progress bars:
│  │  ├─ Option 1 [████░░░░░░] 60% (120 votes)
│  │  ├─ Option 2 [████░░░░░░] 40% (80 votes)
│  └─ Close poll button (if admin)
└─ Status indicator: "Active until Apr 20, 2026"
```

---

#### 16. `/admin/knowledge` — AI Knowledge Base Manager
**Recommended Design:**

```
Components:
├─ Upload button: "Add Document" (top-right, purple)
├─ Reindex button: "Reindex Knowledge Base" (CR only, danger)
├─ Status indicator: "Last indexed 2h ago"
├─ Table Layout:
│  ├─ Columns:
│  │  ├─ ☐ Checkbox
│  │  ├─ Document name
│  │  ├─ Type (Syllabus | Rules | FAQ | Other)
│  │  ├─ File size
│  │  ├─ Uploaded by
│  │  ├─ Indexed status (Indexed | Pending)
│  │  └─ Actions (Preview | Delete)
├─ Upload Modal:
│  ├─ File input (drag & drop support)
│  ├─ Document type (selector: Syllabus|Rules|FAQ|Other)
│  ├─ Description (optional, textarea)
│  └─ Upload button
├─ Reindex Modal (CR only):
│  ├─ Warning: "This will re-index all documents"
│  ├─ Estimated time: "5–10 minutes"
│  ├─ Checkbox: "I understand this will temporarily slow"
│  └─ "Proceed" or "Cancel" buttons
└─ Indexing status:
   ├─ Progress bar
   ├─ "Processed X of Y documents"
   └─ Time remaining estimate
```

---

#### 17. `/admin/audit-log` — System Activity Log
**Recommended Design:**

```
Components:
├─ Filter bar:
│  ├─ Action filter (Create | Update | Delete | Login | etc.)
│  ├─ User filter (dropdown or searchable)
│  ├─ Date range (calendar picker)
│  └─ Search (by content)
├─ Export button (CR only, CSV)
├─ Table Layout:
│  ├─ Columns (sortable):
│  │  ├─ Timestamp (HH:MM:SS)
│  │  ├─ Action (badge, color-coded)
│  │  │  ├─ Create (blue)
│  │  │  ├─ Update (amber)
│  │  │  ├─ Delete (red)
│  │  │  ├─ Login (green)
│  │  │  └─ Edit (cyan)
│  │  ├─ Resource (Announcement, File, User, etc.)
│  │  ├─ Details (What was changed)
│  │  ├─ User (who performed action)
│  │  ├─ IP address (muted text)
│  │  └─ Expand (→ show full metadata JSON)
│  ├─ Hover: Highlight row
│  └─ Pagination (100 entries per page)
├─ Expandable row detail:
│  ├─ Full metadata (JSON, syntax-highlighted)
│  ├─ Before/after comparison (if applicable)
│  └─ Copy button (JSON)
└─ No filter state:
   ├─ "Showing all activity"
   ├─ Record count ("2,847 total entries")
   └─ "Apply filters to narrow results"
```

---

#### 18. `/admin/users` — User Management (CR Only)
**Recommended Design:**

```
Components:
├─ Filter bar:
│  ├─ Role filter (Student | Admin | CR)
│  ├─ Status filter (Active | Inactive)
│  ├─ Search (by name, email, ID)
│  └─ Sort (Recent, A-Z, Most Active)
├─ Bulk actions:
│  ├─ Export CSV button (top-right)
│  └─ Change role (bulk action when rows selected)
├─ Table Layout:
│  ├─ Columns:
│  │  ├─ ☐ Checkbox (for bulk actions)
│  │  ├─ Avatar + Name (h4)
│  │  ├─ Email (read-only, copyable)
│  │  ├─ Role (badge: Student|Admin|CR)
│  │  ├─ Status (badge: Active/Inactive)
│  │  ├─ Last login (timestamp)
│  │  ├─ Joined date (timestamp)
│  │  └─ Actions (Change role | View profile | More)
│  ├─ Hover: Highlight, show action menu
│  └─ Pagination
├─ Change Role Modal:
│  ├─ Current role (read-only)
│  ├─ New role (selector: Student | Admin)
│  │  ├─ "Note: Cannot change to CR"
│  │  └─ "CR is assigned by super admin only"
│  ├─ Reason (optional, textarea)
│  └─ "Confirm role change" button
├─ Export CSV:
│  ├─ Select columns (Name, Email, Role, Status, Join date)
│  ├─ Date range (from-to)
│  └─ "Export" button (triggers CSV download)
└─ Success toast: "Role updated for 5 users"
```

---

## Part 3: Component Library

### Reusable Component Specifications

#### Core Button Variants
```tsx
// Primary (Indigo, CTAs)
<Button variant="primary" size="md">Action</Button>
// Props: disabled, loading, icon

// Secondary (Outlined, alternative)
<Button variant="secondary" size="md">Learn More</Button>

// Danger (Red, delete actions)
<Button variant="danger" size="md">Delete</Button>

// Ghost (No background, text only)
<Button variant="ghost" size="md">Cancel</Button>

// Icon (Circular, icon-only)
<Button variant="icon" size="sm" icon={<Trash />} />
```

#### Card Variants
```tsx
// Standard (with border, p-6)
<Card>
  <CardHeader>Title</CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Elevated (shadow-lg)
<Card elevated>...</Card>

// Interactive (hover effect)
<Card interactive onClick={handleClick}>...</Card>

// Minimal (no border, bg-transparent)
<Card minimal>...</Card>
```

#### Input Variants
```tsx
// Text input
<Input type="text" placeholder="" label="Name" />

// Textarea
<Textarea placeholder="" label="Message" rows={4} />

// Select/Dropdown
<Select options={[]} label="Choose" placeholder="" />

// Search input
<SearchInput placeholder="Search announcements" />

// Date picker
<DatePicker label="Select date" />

// Time picker
<TimePicker label="Select time" />
```

#### Table Component
```tsx
<Table 
  columns={[
    { key: 'name', header: 'Name', sortable: true },
    { key: 'status', header: 'Status', render: (val) => <Badge>{val}</Badge> },
  ]}
  data={items}
  pagination
  checkboxes
  onRowClick={() => {}}
/>
```

#### Badge Component
```tsx
// Status badges
<Badge status="active">Active</Badge>
<Badge status="completed">Completed</Badge>
<Badge status="pending">Pending</Badge>

// Type badges
<Badge type="exam">Exam</Badge>
<Badge type="file">File</Badge>
<Badge type="general">General</Badge>

// Custom color
<Badge color="purple">Admin</Badge>
```

---

## Part 4: Implementation Roadmap

### Phase 1: Foundation (Week 1–2)
**Effort:** High, Impact: Critical

- [x] Login page redesign
- [x] Landing page redesign
- [ ] Create design system documentation (this doc)
- [ ] Set up Tailwind CSS variables (colors, spacing)
- [ ] Build core component library (Button, Card, Input, Badge, Table)
- [ ] Set up Storybook for component showcase

**Deliverables:**
- Design system guide
- Core 6 components (100% tested)
- Figma design file (exported from docs)

---

### Phase 2: Student Pages (Week 3–6)
**Effort:** Very High, Impact: High

- [ ] `/announcements` page (1–2 days)
- [ ] `/routine` page (2–3 days)
- [ ] `/resources` page (2–3 days)
- [ ] `/exams` page (1–2 days)
- [ ] `/polls` page (1–2 days)
- [ ] `/study-groups` page (2–3 days)
- [ ] `/chat` page (2–3 days)
- [ ] `/profile` page (2–3 days)
- [ ] User testing & iteration (3–4 days)

**Deliverables:**
- 8 fully designed pages
- API integration (all endpoints tested)
- Unit tests + E2E tests
- User feedback incorporated

---

### Phase 3: Admin Pages (Week 7–10)
**Effort:** Very High, Impact: High

- [ ] Admin layout & navigation (1–2 days)
- [ ] `/admin` dashboard (2–3 days)
- [ ] `/admin/announcements` (2–3 days)
- [ ] `/admin/files` (1–2 days)
- [ ] `/admin/exams` (1–2 days)
- [ ] `/admin/polls` (1–2 days)
- [ ] `/admin/knowledge` (1–2 days)
- [ ] `/admin/audit-log` (2–3 days)
- [ ] `/admin/users` (CR-only features) (2–3 days)
- [ ] Testing & refinement (3–4 days)

**Deliverables:**
- 9 fully designed admin pages
- Role-based UI (CR vs. Admin vs. Super-Admin)
- Bulk actions & advanced UI patterns
- Admin testing guide

---

### Phase 4: Accessibility & Performance (Week 11–12)
**Effort:** High, Impact: Critical

- [ ] WCAG AA audit (all 20 pages)
- [ ] Add focus visible CSS (all interactive elements)
- [ ] Add reduced-motion support
- [ ] Performance optimization (Lighthouse 95+)
- [ ] Mobile responsiveness testing (all sizes)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Dark/light mode toggle (optional)

**Deliverables:**
- WCAG AA compliance report
- Performance Lighthouse report (95+)
- Accessibility checklist (passed)

---

## Part 5: Design System Tokens (CSS Variables)

### Create `src/styles/design-tokens.css`:

```css
/* Colors */
:root {
  --color-primary-dark: #0F172A;      /* slate-950 */
  --color-primary-light: #1E293B;     /* slate-900 */
  --color-border: #1E293B;            /* slate-800 */
  
  --color-text: #F8FAFC;              /* slate-50 */
  --color-text-secondary: #CBD5E1;    /* slate-400 */
  --color-text-muted: #94A3B8;        /* slate-500 */
  
  --color-cta-primary: #4F46E5;       /* indigo-600 */
  --color-cta-secondary: #0891B2;     /* cyan-600 */
  --color-cta-admin: #A855F7;         /* purple-600 */
  
  --color-success: #10B981;           /* emerald-500 */
  --color-warning: #F59E0B;           /* amber-500 */
  --color-danger: #EF4444;            /* red-500 */
  --color-info: #3B82F6;              /* blue-500 */
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  
  /* Borders & Shadows */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
  
  /* Typography */
  --font-primary: 'Fira Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'Fira Code', monospace;
  
  /* Z-index scale */
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-fixed: 30;
  --z-modal-backdrop: 40;
  --z-modal: 50;
  --z-popover: 60;
  --z-tooltip: 70;
}
```

---

## Part 6: Accessibility Checklist

### WCAG 2.1 AA Requirements by Page Type

**All Pages:**
- ✅ Semantic HTML (`<button>`, `<a>`, `<form>`, `<label>`)
- ✅ Color contrast ratio ≥4.5:1 for body text
- ✅ Focus visible on all interactive elements (2px ring)
- ✅ Keyboard navigation (Tab, Shift+Tab, Enter)
- ✅ No keyboard traps
- ✅ Heading hierarchy (H1–H6)
- ✅ Alt text on meaningful images
- ✅ Form labels associated (`<label for="">`)
- ✅ Error messages near error field
- ✅ Respects `prefers-reduced-motion`

**Tables:**
- ✅ `<table>` with `<thead>`, `<tbody>`
- ✅ `<th scope="col">` on headers
- ✅ `<caption>` if needed
- ✅ Scrollable on mobile (no overflow hidden)

**Forms:**
- ✅ All inputs have associated labels
- ✅ Required fields marked (asterisk + aria-required)
- ✅ Error messages linked via `aria-describedby`
- ✅ Validation happens on blur, not on key press
- ✅ Success confirmation message announced

**Modals:**
- ✅ Focus trap inside modal (Tab loops within)
- ✅ Escape key closes modal
- ✅ Focus returns to trigger element on close
- ✅ `role="dialog"` with `aria-labelledby`

**Lists & Grids:**
- ✅ Semantic `<ul>`, `<ol>`, `<li>` where applicable
- ✅ Grid items are focusable/clickable via keyboard

---

## Part 7: Performance Targets

### Lighthouse Scores (Target: 95+)

```
Performance:      95+
Accessibility:    100
Best Practices:   100
SEO:              95+
```

### Core Web Vitals

```
LCP (Largest Contentful Paint):  <2.5s
FID (First Input Delay):          <100ms  →  (deprecated)
INP (Interaction to Paint):       <200ms
CLS (Cumulative Layout Shift):    <0.1
TTFB (Time to First Byte):        <600ms
```

### Bundle Size Budget

```
CSS (Tailwind):  ~15KB (gzipped)
JavaScript:     ~50KB (gzipped, with all pages)
HTML:            ~5KB (gzipped, per page)
Total per page:  ~20KB (gzipped)
```

---

## Part 8: Design System Maintenance

### Living Documentation

- **Figma file:** Design tokens, component library, page templates
- **Storybook:** Interactive component showcase
- **This document:** UI/UX principles, patterns, guidelines
- **README in /design-system:** How to use design tokens
- **Code comments:** Accessibility requirements in components

### Regular Reviews

- Quarterly design audit (check for inconsistencies)
- User feedback integration (monthly)
- Accessibility compliance (per release)
- Performance regression testing (per release)

---

## Conclusion

The IPE-24 Portal requires a **cohesive, accessible, and performant design system** across 20+ pages. This document provides the strategic framework for:

✅ **Consistent visual language** (colors, typography, spacing)  
✅ **Reusable components** (buttons, cards, inputs, tables)  
✅ **Accessible experiences** (WCAG AA across all pages)  
✅ **Performance excellence** (Lighthouse 95+)  
✅ **Phased implementation** (4-phase rollout over 12 weeks)  

---

**Next Steps:**
1. **Review & Approve** this strategy document
2. **Create Figma design file** based on recommendations
3. **Set up Tailwind CSS variables** in codebase
4. **Build component library** (Phase 1)
5. **Assign designers/developers** to each page (Phases 2–3)
6. **Start Phase 1** this week

---

**Document Version:** 1.0  
**Last Updated:** April 14, 2026  
**Status:** Ready for Implementation  
**Approval Required:** Project Lead, Design Team  
**Feedback:** Open GitHub issues or contact design team

