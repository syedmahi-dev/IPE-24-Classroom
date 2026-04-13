# Student UI — IPE-24 Class Portal
> Role: `student` | Access: All `@iut-dhaka.edu` authenticated users

---

## Design Language

**Theme:** Clean, academic, approachable  
**Color Palette:**
```
--primary:        #1A56DB   (IUT Blue)
--primary-light:  #EBF5FF
--accent:         #0E9F6E   (Green for success/live)
--warn:           #E3A008   (Amber for deadlines)
--danger:         #F05252   (Red for urgent)
--surface:        #FFFFFF
--bg:             #F9FAFB
--text-primary:   #111827
--text-muted:     #6B7280
--border:         #E5E7EB
```
**Typography:** `'Plus Jakarta Sans'` for UI, `'JetBrains Mono'` for codes/IDs  
**Border radius:** 12px cards, 8px inputs, 999px badges  
**Shadow:** `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)`

---

## Layout — Shell

```
┌─────────────────────────────────────────────────────────┐
│  TOPBAR                                                  │
│  [☰ Menu]  IPE-24 Portal          [🔔 3]  [Avatar ▾]   │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ SIDEBAR  │   PAGE CONTENT AREA                         │
│ (240px)  │   (fluid, max-width 1280px)                 │
│          │                                              │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

**Responsive:** Sidebar collapses to bottom tab bar on mobile (≤768px).

### Sidebar Navigation Items
```
🏠  Dashboard          /dashboard
📢  Announcements      /announcements
📅  Class Routine      /routine
📁  Resources          /resources
📝  Exam Schedule      /exams
📆  Academic Calendar  /calendar
🤖  Virtual CR         /chatbot
👥  Study Groups       /study-groups
📊  Polls              /polls
🔍  Lost & Found       /lost-found
👤  My Profile         /profile
```

**Bottom of sidebar:**
```
📱  Notification Prefs
🚪  Sign Out
```

---

## Page: Dashboard `/dashboard`

### Header Section
```
┌─────────────────────────────────────────────────────────┐
│  Good morning, Rafiq 👋                                 │
│  Monday, 16 June 2025  •  Week 11 of Semester           │
└─────────────────────────────────────────────────────────┘
```

### Today's At-a-Glance Bar (horizontal scrollable on mobile)
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 📚 TODAY     │ │ ⏰ NEXT CLASS │ │ 📝 DUE SOON  │ │ 🗳️ OPEN POLL │
│ 4 Classes    │ │ CSE-4101     │ │ 2 items      │ │ 1 active     │
│              │ │ in 35 min    │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```
Each card is tappable and navigates to the relevant page.

### Main Grid (2-column on desktop, 1-column on mobile)

**Left Column:**

#### Today's Routine Widget
```
┌─────────────────────────────────────────┐
│ 📅 TODAY'S ROUTINE  •  Mon 16 Jun       │
├─────────┬───────────────┬───────────────┤
│ 8:00 AM │ CSE-4101      │ Room 301      │
│         │ Dr. Rahman    │ ● LIVE NOW    │
├─────────┼───────────────┼───────────────┤
│ 10:00AM │ IPE-3201      │ Lab-2         │
│         │ Ms. Sultana   │ In 2h 15m    │
├─────────┼───────────────┼───────────────┤
│ 1:00 PM │ MATH-4401     │ Room 205      │
│         │ Dr. Karim     │ In 5h         │
└─────────┴───────────────┴───────────────┘
        [ View Full Routine → ]
```

#### Upcoming Deadlines Widget
```
┌─────────────────────────────────────────┐
│ ⏳ UPCOMING DEADLINES                   │
├──────────────────────────────────────────┤
│ 🔴  Assignment 3 — CSE-4101             │
│     Due: Tomorrow, 11:59 PM             │
│     [Submission Link ↗]                 │
├──────────────────────────────────────────┤
│ 🟡  Quiz 2 — IPE-3201                   │
│     Due: In 3 days                      │
├──────────────────────────────────────────┤
│ ⚪  Mid-term — MATH-4401                │
│     Due: In 12 days                     │
└─────────────────────────────────────────┘
```

**Right Column:**

#### Announcements Feed (latest 5)
```
┌─────────────────────────────────────────┐
│ 📢 ANNOUNCEMENTS                        │
├──────────────────────────────────────────┤
│ [EXAM]  Mid-term schedule released       │
│  Posted by CR • 2 hours ago             │
│  Exams start from June 22. Check the…   │
│  [Read more]                            │
├──────────────────────────────────────────┤
│ [FILE]  CSE-4101 Lecture Slides (Wk11)  │
│  Posted by Admin • Yesterday            │
│  [Download PDF ↓]                       │
├──────────────────────────────────────────┤
│ [GENERAL]  CR Meeting — Friday 3PM      │
│  Posted by CR • 2 days ago              │
└──────────────────────────────────────────┘
        [ View All Announcements → ]
```

#### Quick Actions
```
┌─────────────────────────────────────────┐
│ ⚡ QUICK ACTIONS                        │
├───────────────┬─────────────────────────┤
│ 🤖 Ask Virtual CR  │  📁 Browse Files  │
│ 🗳️ Vote in Poll   │  👥 Study Groups   │
└───────────────┴─────────────────────────┘
```

---

## Page: Announcements `/announcements`

### Filter Bar
```
[All ▾]  [Exam]  [File]  [General]  [Routine]     🔍 Search...
```

### Announcement Card
```
┌─────────────────────────────────────────────────────────┐
│  [EXAM]                                    2 hours ago  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Mid-term Exam Schedule Released                        │
│                                                         │
│  Exams will begin from June 22, 2025. The full         │
│  schedule is available in the exam tracker.             │
│                                                         │
│  Posted by: Class Representative (CR)                   │
│  📎 Attached: mid-term-schedule.pdf                     │
│  [Download ↓]                          [WhatsApp ✓ Sent]│
└─────────────────────────────────────────────────────────┘
```

**Tag Colors:**
- `[EXAM]` → Red background
- `[FILE]` → Blue background  
- `[GENERAL]` → Gray background
- `[ROUTINE]` → Purple background

---

## Page: Class Routine `/routine`

### Week Navigation
```
◀ Prev Week    Week of June 16–20, 2025    Next Week ▶
                     [Jump to Today]
```

### Timetable Grid
```
         Mon    Tue    Wed    Thu    Fri
8:00 AM  CSE    IPE    CSE    ---    IPE
         4101   3201   4101         3201
         R301   L2     R301         L2

10:00AM  ---    ---    MATH   IPE   ---
                        4401  3201
                        R205  R112

1:00 PM  MATH  CSE    ---    MATH   ---
         4401  4101          4401
         R205  R301          R205
```

Each cell is a tappable card showing:
- Course code + name
- Room number
- Teacher name

### Legend
```
● Live Now   ⏰ Next   ✓ Done   — No Class
```

---

## Page: Resources `/resources`

### Filter + Search
```
[All Courses ▾]  [Type: All ▾]  [Sort: Newest ▾]    🔍 Search files...
```

### Course Sections (accordion)
```
▼ CSE-4101 — Software Engineering                   12 files
  ┌──────────────────────────────────────────────────────┐
  │ 📄 Lecture Slides Week 11.pdf         2.3 MB  ↓      │
  │    Uploaded Jun 14 by Admin                          │
  ├──────────────────────────────────────────────────────┤
  │ 📄 Assignment 3 Brief.pdf             450 KB  ↓      │
  │    Uploaded Jun 10 by CR                             │
  └──────────────────────────────────────────────────────┘

▶ IPE-3201 — Operations Research                     8 files
▶ MATH-4401 — Numerical Methods                      5 files
```

Each file row shows:
- File icon (PDF/DOCX/XLSX/ZIP)
- File name + size
- Upload date + who uploaded
- Download button → opens Google Drive link

---

## Page: Exam Schedule `/exams`

### Countdown Hero
```
┌─────────────────────────────────────────┐
│  ⏱️  NEXT EXAM IN                       │
│      5 days  14 hours  22 min           │
│  CSE-4101 Mid-term — June 22, 10:00 AM  │
│  Room 301, Exam Hall A                  │
└─────────────────────────────────────────┘
```

### Exam Table
```
┌────────────┬──────────────┬──────────────┬───────┬────────────┐
│ Date       │ Course       │ Time         │ Room  │ Status     │
├────────────┼──────────────┼──────────────┼───────┼────────────┤
│ Jun 22 Sun │ CSE-4101     │ 10:00–12:00  │ R301  │ ⏳ Upcoming │
│ Jun 24 Tue │ IPE-3201     │ 2:00–4:00 PM │ Lab-2 │ ⏳ Upcoming │
│ Jun 26 Thu │ MATH-4401    │ 10:00–12:00  │ R205  │ ⏳ Upcoming │
│ May 15 Wed │ HUM-2101     │ 9:00–11:00   │ R101  │ ✓ Done     │
└────────────┴──────────────┴──────────────┴───────┴────────────┘
```

---

## Page: AI Virtual CR `/chatbot`

### Chat Interface
```
┌─────────────────────────────────────────────────────────┐
│  🤖 Virtual CR  •  Powered by AI                        │
│  "Ask me about exams, schedules, syllabus & policies"   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌────────────────────────────────────┐               │
│   │ 👤 What's the mid-term syllabus    │               │
│   │    for CSE-4101?                   │               │
│   └────────────────────────────────────┘               │
│                                                         │
│   ┌─────────────────────────────────────────┐          │
│   │ 🤖 Based on the course outline, the     │          │
│   │    CSE-4101 mid-term covers:            │          │
│   │    • Chapters 1–5 (Software Life Cycle) │          │
│   │    • UML Diagrams (Ch. 3)              │          │
│   │    • SDLC Models (Ch. 4–5)             │          │
│   │                                         │          │
│   │    📎 Source: CSE-4101 Course Outline   │          │
│   └─────────────────────────────────────────┘          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  💡 Suggested:                                          │
│  [When is the next class?]  [Syllabus for IPE-3201]    │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐ [Send ➤]     │
│  │ Ask anything about IPE-24...         │              │
│  └──────────────────────────────────────┘              │
│  Rate limit: 18/20 queries remaining this hour         │
└─────────────────────────────────────────────────────────┘
```

**Rate limit indicator:** Progress bar that fills as queries are used. Resets every hour.

---

## Page: Polls `/polls`

### Active Poll Card
```
┌─────────────────────────────────────────────────────────┐
│  🗳️  OPEN POLL  •  Closes in 2 days                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  What day works best for the study session?              │
│                                                         │
│  ○  Thursday evening                                    │
│  ○  Friday afternoon                                    │
│  ○  Saturday morning                                    │
│                                                         │
│              [ Submit Vote ]                            │
│                                                         │
│  👥 0/52 classmates voted • Your vote is anonymous      │
└─────────────────────────────────────────────────────────┘
```

### After Voting — Results View
```
  Thursday evening      ████████████████░░░  42%  (22)
  Friday afternoon      ████████░░░░░░░░░░░  28%  (15)
  Saturday morning      ██████████░░░░░░░░░  30%  (16)

  53 total votes  •  ✓ You voted: Thursday evening
```

### Closed Poll Card
```
┌─────────────────────────────────────────────────────────┐
│  🔒  CLOSED POLL  •  Ended June 10                     │
│  Best time for lab makeup class?                        │
│  [Show Results ▾]                                       │
└─────────────────────────────────────────────────────────┘
```

---

## Page: Study Groups `/study-groups`

### Create Button (top right)
```
[+ Post Study Group]
```

### Study Group Card
```
┌─────────────────────────────────────────────────────────┐
│  📚 CSE-4101 — Mid-term Prep Group                      │
│  Posted by: Nafisa R. • 3 hours ago                     │
│                                                         │
│  Meeting in Library Block B, Room 204                   │
│  Saturday, June 21 at 4:00 PM                           │
│  Max members: 8  •  Currently: 5 joined                 │
│                                                         │
│  [ Join Group ]                    👥 5/8 members        │
└─────────────────────────────────────────────────────────┘
```

---

## Page: Lost & Found `/lost-found`

### Post Button
```
[+ Post Lost/Found Item]
```

### Item Card
```
┌─────────────────────────────────────────────────────────┐
│  🔴 LOST  •  June 14, 2025                              │
│  Blue Casio calculator (fx-991EX)                       │
│                                                         │
│  Last seen near Lab-2 after IPE-3201 class.             │
│  Contact: Rahim (01712-XXXXXX) or DM on Discord         │
│                                                         │
│  Posted by: Rahim H.                    [Mark Found ✓]  │
└─────────────────────────────────────────────────────────┘
```

**Status badges:** `🔴 LOST` / `🟢 FOUND` / `✓ RESOLVED`

---

## Page: Profile `/profile`

```
┌─────────────────────────────────────────────────────────┐
│                    [Avatar — 80px]                      │
│                  Rafiqul Islam                          │
│                  190041234                              │
│                  Section B  •  IPE-24                   │
│              rafiqul@iut-dhaka.edu                      │
├─────────────────────────────────────────────────────────┤
│  EDITABLE FIELDS                                        │
│  Phone:     [01812-XXXXXX         ]                     │
│  Bio:       [Final year student... ]                    │
│                               [ Save Changes ]          │
├─────────────────────────────────────────────────────────┤
│  PREFERENCES                                            │
│  🔔 Push notifications    [  ON  ●──]                   │
│  📧 Email digests         [──● OFF  ]                   │
│  🌙 Dark mode             [  ON  ●──]                   │
├─────────────────────────────────────────────────────────┤
│  ACCOUNT                                                │
│  Role: Student                                          │
│  Last login: Today, 8:32 AM                             │
│  [ Sign Out ]                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Notifications Panel (Slide-in Drawer)

Triggered by 🔔 icon in topbar.

```
┌────────────────────────────────────────┐
│  Notifications                [Mark all read]           │
├─────────────────────────────────────────────────────────┤
│  🔵  NEW ANNOUNCEMENT                  2h ago           │
│  Mid-term schedule released by CR                       │
├──────────────────────────────────────────────────────────┤
│  🔵  NEW FILE                          4h ago           │
│  CSE-4101 Slides Week 11 uploaded                       │
├──────────────────────────────────────────────────────────┤
│     POLL REMINDER                      Yesterday        │
│  "Study session poll" closes in 2 days                  │
└─────────────────────────────────────────────────────────┘
```

---

## Empty States

Each page must have a friendly empty state when there's no content:

| Page | Empty State Message |
|---|---|
| Announcements | "No announcements yet. Check back soon! 📭" |
| Exams | "No upcoming exams. Enjoy the calm! 🎉" |
| Resources | "No files uploaded yet for this course." |
| Polls | "No active polls right now. 🗳️" |
| Study Groups | "No study groups yet. Be the first to post! 📚" |
| Lost & Found | "No items posted. Hopefully nothing's missing! 😄" |

---

## Error & Toast Patterns

```
✅ SUCCESS   "Vote submitted successfully!"          [green, 3s]
⚠️ WARNING   "You've already voted in this poll."   [amber, 5s]
❌ ERROR     "Something went wrong. Try again."      [red, 8s]
ℹ️ INFO      "Rate limit: 20 queries/hour."         [blue, 4s]
```

---

## Mobile Tab Bar (≤768px)

```
┌────────────────────────────────────────────────────────┐
│  🏠         📢         📅         🤖         👤        │
│ Home   Announce   Routine   ChatBot  Profile           │
└────────────────────────────────────────────────────────┘
```
Remaining nav items accessible via "More" or hamburger sheet.
