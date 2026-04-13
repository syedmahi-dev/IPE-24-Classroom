# Admin UI — IPE-24 Class Portal
> Role: `admin` (Deputy CR) | Access: Admin panel + all student views

---

## Design Language

**Theme:** Professional, operational — confident but not intimidating  
**Color Palette:**
```
--primary:        #1A56DB   (IUT Blue)
--admin-accent:   #7E3AF2   (Purple — marks admin-exclusive areas)
--success:        #0E9F6E
--warn:           #E3A008
--danger:         #F05252
--surface:        #FFFFFF
--bg:             #F3F4F6
--sidebar-bg:     #1E2939
--sidebar-text:   #D1D5DB
--sidebar-active: #FFFFFF
--text-primary:   #111827
--text-muted:     #6B7280
--border:         #E5E7EB
```
**Typography:** `'DM Sans'` for UI text, `'Fira Code'` for IDs/timestamps  
**Distinguishing marker:** Purple left border or badge on all admin-exclusive UI elements

---

## Layout — Admin Shell

```
┌─────────────────────────────────────────────────────────┐
│  TOPBAR (Admin)                                         │
│  IPE-24 Admin     [🔔 Notifications]  [Ahsan ▾]        │
├─────────────┬───────────────────────────────────────────┤
│             │                                           │
│  SIDEBAR    │   ADMIN CONTENT AREA                     │
│  (260px)    │   (fluid, max-width 1440px)              │
│  Dark bg    │                                           │
│             │                                           │
└─────────────┴───────────────────────────────────────────┘
```

### Admin Sidebar Navigation
```
  ← Back to Student View    (link to /dashboard)
  ─────────────────────────
  📊  Overview              /admin
  📢  Announcements         /admin/announcements
  📁  Files                 /admin/files
  📝  Exam Schedule         /admin/exams
  📅  Routine               /admin/routine
  🗳️   Polls                /admin/polls
  🤖  Knowledge Base        /admin/knowledge
  📜  Audit Log             /admin/audit       [read-only]
  ─────────────────────────
  👤  My Profile
  🚪  Sign Out
```

**Locked items (super_admin only — grayed out with lock icon):**
```
  🔒  Users & Roles         /admin/users
  🔒  System Settings       /admin/settings
```
Hovering shows tooltip: "Only the CR (super_admin) can access this."

---

## Page: Admin Overview `/admin`

### Stats Row
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  STUDENTS    │ │ ANNOUNCEMENTS│ │  FILES       │ │  POLLS       │
│     52       │ │     18       │ │     47       │ │   2 active   │
│  registered  │ │   this month │ │  in library  │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Recent Activity Feed
```
┌─────────────────────────────────────────────────────────┐
│ RECENT ACTIVITY                                         │
├──────────────────────────────────────────────────────────┤
│ ✅  You uploaded CSE-4101 Slides Wk11.pdf     2h ago    │
│ 📢  CR posted "Mid-term Schedule Released"    3h ago    │
│ 🗳️   You created poll "Study session day"    Yesterday  │
│ ✅  You created exam entry: CSE-4101 Mid-term Yesterday │
└─────────────────────────────────────────────────────────┘
```

### Quick Action Buttons
```
[+ New Announcement]  [+ Upload File]  [+ Exam Entry]  [+ Poll]
```

### Platform Delivery Status
```
┌─────────────────────────────────────────────────────────┐
│ LAST ANNOUNCEMENT DELIVERY STATUS                       │
│ "Mid-term Schedule Released" — Jun 16, 10:32 AM         │
├─────────────────────────────────────────────────────────┤
│  🌐 Website      ✅ Published                            │
│  💬 WhatsApp     ✅ Delivered to 52 members              │
│  🎮 Discord      ✅ Posted to #announcements             │
│  📱 Push Notifs  ✅ Sent to 38 subscribers               │
└─────────────────────────────────────────────────────────┘
```

---

## Page: Announcements `/admin/announcements`

### Toolbar
```
[+ Create Announcement]                    🔍 Search...  [Filter: All ▾]
```

### Announcement Management Table
```
┌────────────────────────┬────────┬──────────┬───────────┬──────────────┐
│ Title                  │ Type   │ Posted   │ Platforms │ Actions      │
├────────────────────────┼────────┼──────────┼───────────┼──────────────┤
│ Mid-term Schedule      │ [EXAM] │ 2h ago   │ ✅✅✅📱  │ [Edit] [···] │
│ CSE-4101 Slides Wk11   │ [FILE] │ 4h ago   │ ✅✅✅📱  │ [Edit] [···] │
│ CR Meeting Friday      │ [GEN]  │ 2d ago   │ ✅✅✅📱  │ [Edit] [···] │
└────────────────────────┴────────┴──────────┴───────────┴──────────────┘
```

**Platform icons:** 🌐 Website | 💬 WhatsApp | 🎮 Discord | 📱 Push

**`[···]` dropdown (admin's OWN announcements only):**
```
  Edit
  ─────────────
  ⚠️ Delete (admin can only delete their own)
```

> Note: Editing/deleting announcements posted by CR requires super_admin.

---

## Modal: Create / Edit Announcement

```
┌─────────────────────────────────────────────────────────┐
│  CREATE ANNOUNCEMENT                              [✕]   │
├─────────────────────────────────────────────────────────┤
│  Title *                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Mid-term Exam Schedule Released                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Type *                                                 │
│  [● General]  [○ Exam]  [○ File]  [○ Routine]          │
│                                                         │
│  Body *                                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [B] [I] [U] [Link] [List] [Heading]  Rich Text │   │
│  │─────────────────────────────────────────────────│   │
│  │  Type your announcement here...                  │   │
│  │                                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Attach File (optional)                                 │
│  [ 📎 Choose from Google Drive ]                        │
│                                                         │
│  Publish To:                                            │
│  [✓] Website  [✓] WhatsApp  [✓] Discord  [✓] Push      │
│                                                         │
│  ┌──────────────────────────┬────────────────────┐      │
│  │   Save as Draft          │   Publish Now ▶    │      │
│  └──────────────────────────┴────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

---

## Page: Files `/admin/files`

### Toolbar
```
[↑ Upload File]  [Filter: Course ▾]  [Sort: Newest ▾]    🔍 Search...
```

### File Table
```
┌──────────────────────────┬──────────┬────────┬──────────┬──────────────┐
│ File Name                │ Course   │ Size   │ Uploaded │ Actions      │
├──────────────────────────┼──────────┼────────┼──────────┼──────────────┤
│ 📄 Slides_Wk11.pdf       │ CSE-4101 │ 2.3 MB │ You, 2h  │ [↓] [🗑️ own] │
│ 📄 Assignment3Brief.pdf  │ CSE-4101 │ 450KB  │ CR, 4d   │ [↓]         │
│ 📊 Lab_Data.xlsx         │ IPE-3201 │ 1.1 MB │ You, 1w  │ [↓] [🗑️ own] │
└──────────────────────────┴──────────┴────────┴──────────┴──────────────┘
```

> Admins can only delete files they uploaded. CR's files show [↓] only.

### Upload Modal
```
┌─────────────────────────────────────────────────────────┐
│  UPLOAD FILE                                      [✕]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │                                                  │  │
│   │          ☁️  Drag & drop file here               │  │
│   │         or [ Browse Files ]                      │  │
│   │         Max size: 50 MB                          │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
│  Course Tag *                                           │
│  [Select course ▾]                                      │
│                                                         │
│  File Label (optional)                                  │
│  [e.g. "Lecture Notes Week 11"       ]                  │
│                                                         │
│              [ Upload to Google Drive → ]               │
└─────────────────────────────────────────────────────────┘
```

---

## Page: Exam Schedule `/admin/exams`

### Toolbar
```
[+ Add Exam Entry]                         🔍 Search...  [Course ▾]
```

### Exam Table with Edit Actions
```
┌────────────┬──────────────┬──────────────┬───────┬──────────────┐
│ Date       │ Course       │ Time         │ Room  │ Actions      │
├────────────┼──────────────┼──────────────┼───────┼──────────────┤
│ Jun 22 Sun │ CSE-4101     │ 10:00–12:00  │ R301  │ [Edit] [🗑️]  │
│ Jun 24 Tue │ IPE-3201     │ 2:00–4:00 PM │ Lab-2 │ [Edit] [🗑️]  │
│ Jun 26 Thu │ MATH-4401    │ 10:00–12:00  │ R205  │ [Edit] [🗑️]  │
└────────────┴──────────────┴──────────────┴───────┴──────────────┘
```

### Add/Edit Exam Modal
```
┌─────────────────────────────────────────────────────────┐
│  ADD EXAM ENTRY                                   [✕]   │
├─────────────────────────────────────────────────────────┤
│  Course *       [Select course ▾]                       │
│  Exam Type *    [● Mid-term  ○ Final  ○ Quiz  ○ Other]  │
│  Date *         [📅 Date picker]                        │
│  Start Time *   [⏰ Time picker]                        │
│  End Time *     [⏰ Time picker]                        │
│  Room *         [e.g. Room 301              ]           │
│  Notes          [Any special instructions   ]           │
│                                                         │
│  Submission Link (optional)                             │
│  [https://...                               ]           │
│                                                         │
│              [Cancel]    [ Save Entry ✓ ]               │
└─────────────────────────────────────────────────────────┘
```

---

## Page: Polls `/admin/polls`

### Toolbar
```
[+ Create Poll]                                   [Filter: Active ▾]
```

### Poll Management Table
```
┌────────────────────────────┬──────────┬──────────┬──────────────────┐
│ Question                   │ Status   │ Votes    │ Actions          │
├────────────────────────────┼──────────┼──────────┼──────────────────┤
│ Best day for study session?│ 🟢 Active │ 42/52   │ [Results] [Close]│
│ Makeup class preference?   │ 🔴 Closed │ 49/52   │ [Results]        │
└────────────────────────────┴──────────┴──────────┴──────────────────┘
```

### Create Poll Modal
```
┌─────────────────────────────────────────────────────────┐
│  CREATE POLL                                      [✕]   │
├─────────────────────────────────────────────────────────┤
│  Question *                                             │
│  [What day works best for the study session? ]          │
│                                                         │
│  Options *                                              │
│  [Thursday evening                           ] [✕]      │
│  [Friday afternoon                           ] [✕]      │
│  [Saturday morning                           ] [✕]      │
│  [+ Add Option]                                         │
│                                                         │
│  Closes At *   [📅 Date]  [⏰ Time]                     │
│  Anonymous     [✓ Yes — votes are anonymous]            │
│                                                         │
│              [Cancel]    [ Publish Poll ✓ ]             │
└─────────────────────────────────────────────────────────┘
```

### Poll Results View
```
┌─────────────────────────────────────────────────────────┐
│  POLL RESULTS — "Best day for study session?"           │
│  Status: 🟢 Active  •  Closes in 2 days  •  42/52 voted│
├─────────────────────────────────────────────────────────┤
│  Thursday evening  ████████████████░░░  42%  (18)       │
│  Friday afternoon  ████████░░░░░░░░░░░  28%  (12)       │
│  Saturday morning  ██████████░░░░░░░░░  30%  (12)       │
│                                                         │
│  Total votes: 42  •  Abstained: 10                      │
│                                                         │
│  [ Close Poll Now ]                                     │
└─────────────────────────────────────────────────────────┘
```

---

## Page: Knowledge Base `/admin/knowledge`

### Toolbar
```
[+ Add Document]                        🔍 Search knowledge base...
```

### Knowledge Base Table
```
┌──────────────────────────┬────────────┬──────────┬─────────────────┐
│ Document Name            │ Type       │ Indexed  │ Actions         │
├──────────────────────────┼────────────┼──────────┼─────────────────┤
│ CSE-4101 Course Outline  │ PDF        │ Jun 5    │ [View] [Re-add] │
│ IPE-24 Class Policy      │ Text       │ May 20   │ [View] [Re-add] │
│ Exam Guidelines 2025     │ PDF        │ Jun 1    │ [View] [Re-add] │
└──────────────────────────┴────────────┴──────────┴─────────────────┘
```

> Admins can **add** documents but **cannot delete** them. Deletion is super_admin only.  
> Delete button is hidden; replaced with [Re-add] to update content.

### Add Document Modal
```
┌─────────────────────────────────────────────────────────┐
│  ADD TO KNOWLEDGE BASE                            [✕]   │
├─────────────────────────────────────────────────────────┤
│  Document Name *                                        │
│  [CSE-4101 Course Outline                    ]          │
│                                                         │
│  Source *                                               │
│  [● Upload File]  [○ Paste Text]  [○ Google Drive URL]  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │      ☁️  Drag & drop PDF or text file here      │   │
│  │              or [ Browse ]                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ⚠️ This will be added to the AI chatbot's knowledge.   │
│     Ensure content is accurate before adding.           │
│                                                         │
│              [Cancel]    [ Add to Knowledge Base ]      │
└─────────────────────────────────────────────────────────┘
```

---

## Page: Audit Log `/admin/audit` (Read-Only)

### Filter Bar
```
[Action: All ▾]  [User: All ▾]  [Date Range: Last 7 days ▾]    🔍 Search...
```

### Audit Table
```
┌──────────────────┬──────────────┬────────────┬──────────────────────┐
│ Timestamp        │ Actor        │ Action     │ Details              │
├──────────────────┼──────────────┼────────────┼──────────────────────┤
│ Jun 16, 10:32 AM │ Ahsan (You)  │ CREATE     │ Announcement: "Mid-  │
│                  │              │            │  term Schedule"      │
├──────────────────┼──────────────┼────────────┼──────────────────────┤
│ Jun 16, 9:15 AM  │ CR           │ CREATE     │ Poll: "Study session" │
├──────────────────┼──────────────┼────────────┼──────────────────────┤
│ Jun 15, 3:44 PM  │ Ahsan (You)  │ UPLOAD     │ File: Slides_Wk11    │
└──────────────────┴──────────────┴────────────┴──────────────────────┘
```

**Action color codes:**
- `CREATE` → Green
- `UPDATE` → Blue
- `DELETE` → Red
- `ROLE_CHANGE` → Purple
- `UPLOAD` → Teal

> "You cannot modify audit log entries. This is read-only." — info banner at top.

---

## Page: Class Routine `/admin/routine`

### Banner
```
┌─────────────────────────────────────────────────────────┐
│  ℹ️  The routine is pulled live from Google Sheets.     │
│  To update the routine, edit the linked spreadsheet     │
│  and changes will reflect within 5 minutes.             │
│                          [ Open Google Sheet ↗ ]        │
└─────────────────────────────────────────────────────────┘
```

### Routine Preview (same as student view, but with edit note)
Same timetable grid as student view. No inline edit — changes go through Sheets.

---

## Permission Guard UI Patterns

### Locked Feature (hover tooltip)
```
  [🔒 Users & Roles]
       ↓ hover
  ┌─────────────────────────────┐
  │ This section is restricted  │
  │ to the CR (super_admin).    │
  │ Contact your CR if you      │
  │ need to manage user roles.  │
  └─────────────────────────────┘
```

### Inline Disabled Action
For things like "Delete CR's announcement":
```
[Edit]  [Delete — CR only 🔒]   ← grayed out, tooltip on hover
```

---

## Toast Notifications (Admin)

```
✅  "Announcement published to all platforms."         [green, 4s]
✅  "File uploaded successfully to Google Drive."      [green, 4s]
✅  "Poll created and visible to students."            [green, 4s]
✅  "Exam entry saved."                                [green, 4s]
⚠️  "Document added to knowledge base. Indexing…"     [amber, 6s]
❌  "Failed to publish to WhatsApp. Retry?"            [red, persist]
🔒  "You don't have permission to do that."           [red, 4s]
```

---

## Responsive Behavior

- On mobile (≤768px), admin sidebar collapses to a hamburger menu
- All tables become horizontally scrollable cards
- Modals become full-screen bottom sheets
- Quick action buttons stack vertically
