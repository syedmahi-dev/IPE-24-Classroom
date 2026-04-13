# Super Admin UI — IPE-24 Class Portal
> Role: `super_admin` (Class Representative — CR) | Full system access

---

## Design Language

**Theme:** Authoritative, complete control — elevated version of admin with visible power indicators  
**Color Palette:**
```
--primary:           #1A56DB   (IUT Blue)
--super-accent:      #C2410C   (Burnt Orange — CR-exclusive actions)
--super-badge:       #FEF3C7   (Amber badge background)
--admin-purple:      #7E3AF2
--success:           #0E9F6E
--warn:              #E3A008
--danger:            #F05252
--surface:           #FFFFFF
--bg:                #F3F4F6
--sidebar-bg:        #111827   (Darker than admin — distinguishes CR shell)
--sidebar-text:      #9CA3AF
--sidebar-active:    #FFFFFF
--sidebar-accent:    #F59E0B   (Gold highlight for CR-only items)
--text-primary:      #111827
--text-muted:        #6B7280
--border:            #E5E7EB
```
**Typography:** `'DM Sans'` for UI text, `'Fira Code'` for IDs/timestamps  
**CR Identity Badge:** A persistent amber `◆ CR` badge next to the user avatar in the topbar.  
**Visual distinction:** CR-exclusive actions use an amber/orange color family. All other admin actions use the standard blue/purple palette.

---

## Layout — Super Admin Shell

```
┌─────────────────────────────────────────────────────────────┐
│  TOPBAR                                                     │
│  IPE-24 Portal     [🔔 5]  [Telegram ✓]  [Sakib ◆ CR ▾]   │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  SIDEBAR     │   CONTENT AREA                              │
│  (260px)     │   (fluid, max-width 1440px)                 │
│  Darkest bg  │                                              │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

**Topbar extras (CR only):**
- `[Telegram ✓]` — green pill showing Telegram bot connection status
- `◆ CR` — gold badge next to name

### Super Admin Sidebar Navigation

```
  ← Student View
  ─────────────────────────
  📊  Overview              /admin
  ─────────────────────────
  CONTENT MANAGEMENT
  📢  Announcements         /admin/announcements
  📁  Files                 /admin/files
  📝  Exam Schedule         /admin/exams
  📅  Routine               /admin/routine
  🗳️   Polls                /admin/polls
  🤖  Knowledge Base        /admin/knowledge
  ─────────────────────────
  CONTROL (CR ONLY ◆)
  👥  Users & Roles         /admin/users           [amber]
  📜  Audit Log             /admin/audit           [amber]
  ⚙️   System Settings       /admin/settings        [amber]
  📡  Telegram Interface    /admin/telegram        [amber]
  ─────────────────────────
  👤  My Profile
  🚪  Sign Out
```

CR-exclusive sidebar items are styled with an amber left accent bar and gold icon color.

---

## Page: Admin Overview `/admin`

Same as admin overview, plus additional CR-exclusive widgets.

### Stats Row (Extended)
```
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│ STUDENTS  │ │ ADMINS    │ │ ANNOUNCE- │ │ FILES     │ │ POLLS     │
│    52     │ │    2      │ │ MENTS: 18 │ │    47     │ │ 2 active  │
│ registered│ │ appointed │ │ this month│ │ in library│ │           │
└───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘
```

### System Health Widget (CR only)
```
┌─────────────────────────────────────────────────────────┐
│ ◆ SYSTEM HEALTH                                         │
├─────────────────────────────────────────────────────────┤
│  🌐 Web Portal       ● Online         Uptime: 99.8%     │
│  🤖 AI Chatbot       ● Online         Last query: 4m ago│
│  💬 WhatsApp Bot     ● Connected      52 members        │
│  🎮 Discord Bot      ● Online         Last post: 2h ago │
│  📡 Telegram Bot     ● Connected      Authorized: You   │
│  🔄 n8n Automation   ● Running        Last run: 10m ago │
│  🗄️ Database          ● Healthy        pgvector: Active  │
└─────────────────────────────────────────────────────────┘
```

### Pending Actions Widget (CR only)
```
┌─────────────────────────────────────────────────────────┐
│ ◆ REQUIRES YOUR ATTENTION                              │
├─────────────────────────────────────────────────────────┤
│  ⚠️  1 knowledge base document needs reindexing         │
│      [Reindex Now]                                      │
│  ℹ️   Ahsan (Admin) added 2 docs to knowledge base      │
│      [Review]                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Page: Announcements `/admin/announcements`

Same as admin view, with these additions:

### Actions Column — Extended
```
┌────────────────────────┬────────┬──────────┬───────────┬──────────────────┐
│ Title                  │ Type   │ Posted By│ Platforms │ Actions          │
├────────────────────────┼────────┼──────────┼───────────┼──────────────────┤
│ Mid-term Schedule      │ [EXAM] │ You (CR) │ ✅✅✅📱  │ [Edit][Delete]   │
│ CSE-4101 Slides Wk11   │ [FILE] │ Ahsan    │ ✅✅✅📱  │ [Edit][Delete] ◆ │
│ CR Meeting Friday      │ [GEN]  │ You (CR) │ ✅✅✅📱  │ [Edit][Delete]   │
└────────────────────────┴────────┴──────────┴───────────┴──────────────────┘
```

- CR can edit **and delete** ALL announcements, including those posted by admins
- CR-exclusive delete actions on others' posts are marked with `◆`

---

## Page: Files `/admin/files`

Same as admin view, with these additions:

- CR can delete **all files** (not just their own)
- Files uploaded by admins show `[↓] [🗑️ ◆]`

---

## Page: Polls `/admin/polls`

Same as admin view, with these additions:

### Actions Column — Extended
```
│ Best day for study session? │ 🟢 Active │ 42/52 │ [Results] [Close] [Delete ◆] │
│ Makeup class preference?    │ 🔴 Closed │ 49/52 │ [Results] [Delete ◆]         │
```

CR can **delete** any poll (even after voting). Admin can only close.

---

## Page: Knowledge Base `/admin/knowledge`

Same as admin view, with these additions:

### Toolbar
```
[+ Add Document]   [◆ Reindex All Embeddings]            🔍 Search...
```

### Knowledge Base Table — Extended Actions
```
┌──────────────────────────┬────────────┬──────────┬────────────────────────┐
│ Document Name            │ Type       │ Indexed  │ Actions                │
├──────────────────────────┼────────────┼──────────┼────────────────────────┤
│ CSE-4101 Course Outline  │ PDF        │ Jun 5    │ [View] [Re-add] [🗑️ ◆]  │
│ IPE-24 Class Policy      │ Text       │ May 20   │ [View] [Re-add] [🗑️ ◆]  │
└──────────────────────────┴────────────┴──────────┴────────────────────────┘
```

CR can **delete** knowledge base documents. Admins cannot.

### Reindex Confirmation Modal
```
┌─────────────────────────────────────────────────────────┐
│  ◆ REINDEX KNOWLEDGE BASE                         [✕]   │
├─────────────────────────────────────────────────────────┤
│  This will rebuild all AI embeddings from scratch.      │
│                                                         │
│  • Estimated time: 2–4 minutes                          │
│  • The chatbot will be unavailable during reindexing    │
│  • All 12 documents will be re-processed                │
│                                                         │
│  ⚠️ Only do this after adding/removing documents,       │
│     or if the chatbot is giving incorrect answers.      │
│                                                         │
│          [Cancel]    [ ◆ Start Reindex ]                │
└─────────────────────────────────────────────────────────┘
```

---

## Page: Users & Roles `/admin/users` *(CR only)*

### Toolbar
```
🔍 Search students...              [Export CSV]
```

### User Table
```
┌───────────────────────┬──────────────────────────┬──────────────┬──────────────────────┐
│ Name                  │ Email                    │ Role         │ Actions              │
├───────────────────────┼──────────────────────────┼──────────────┼──────────────────────┤
│ Sakib Al-Hassan       │ sakib@iut-dhaka.edu      │ ◆ CR         │ (That's you)         │
│ Ahsan Habib           │ ahsan@iut-dhaka.edu      │ 🟣 Admin      │ [Change Role]        │
│ Nafisa Rahman         │ nafisa@iut-dhaka.edu     │ Student      │ [Change Role]        │
│ Rahim Hossain         │ rahim@iut-dhaka.edu      │ Student      │ [Change Role]        │
│ ...                   │ ...                      │ ...          │ ...                  │
└───────────────────────┴──────────────────────────┴──────────────┴──────────────────────┘
```

**Visible columns:** Name, Email, Role, Last Login, Actions  
**Pagination:** 20 rows per page

### Role Badge Styles
- `◆ CR` — Amber badge, not changeable via UI
- `🟣 Admin` — Purple badge
- `Student` — Gray badge (default)

### Change Role Modal
```
┌─────────────────────────────────────────────────────────┐
│  ◆ CHANGE ROLE                                    [✕]   │
├─────────────────────────────────────────────────────────┤
│  User:  Nafisa Rahman                                   │
│  Email: nafisa@iut-dhaka.edu                            │
│                                                         │
│  Current Role: Student                                  │
│                                                         │
│  New Role:                                              │
│  [○ Student]   [● Admin]                                │
│                                                         │
│  ⚠️ Promoting to Admin grants access to the admin panel,│
│     announcements, files, exams, and polls management.  │
│                                                         │
│  ℹ️ super_admin can only be set via direct database SQL. │
│     It cannot be granted through this interface.        │
│                                                         │
│  This action will be logged in the audit log.           │
│                                                         │
│          [Cancel]    [ ◆ Confirm Role Change ]          │
└─────────────────────────────────────────────────────────┘
```

### User Profile Drawer (click on a row)
```
┌────────────────────────────────────────┐
│  Nafisa Rahman                   [✕]  │
│  nafisa@iut-dhaka.edu                  │
│  Student ID: 190041238                 │
│  Section: B                            │
│  Phone: 01812-XXXXXX                   │
│  Bio: "Likes OR and simulation..."     │
│  Joined: March 2, 2025                 │
│  Last Login: Today, 9:14 AM            │
│  Push Notifications: Enabled           │
│  Total Chatbot Queries (7d): 34        │
│                                        │
│  [ Change Role ]                       │
└────────────────────────────────────────┘
```

---

## Page: Audit Log `/admin/audit` *(Full Access)*

### Filter Bar
```
[Action: All ▾]  [User: All ▾]  [Target: All ▾]  [Date Range ▾]    🔍 Search...
```

### Full Audit Table
```
┌────────────────────┬───────────────┬────────────────┬────────────────────────────────┐
│ Timestamp          │ Actor         │ Action         │ Details                        │
├────────────────────┼───────────────┼────────────────┼────────────────────────────────┤
│ Jun 16, 10:32 AM   │ Ahsan (Admin) │ CREATE         │ Announcement: "Mid-term Sched" │
│ Jun 16, 10:05 AM   │ Sakib (CR)    │ ROLE_CHANGE    │ nafisa@… → Admin               │
│ Jun 16, 9:44 AM    │ Sakib (CR)    │ KNOWLEDGE_ADD  │ Doc: "Exam Guidelines 2025"    │
│ Jun 15, 3:44 PM    │ Ahsan (Admin) │ UPLOAD         │ File: Slides_Wk11.pdf          │
│ Jun 15, 2:12 PM    │ Sakib (CR)    │ DELETE         │ Poll: "Lunch preference"       │
│ Jun 14, 11:00 AM   │ Sakib (CR)    │ REINDEX        │ Knowledge base full reindex    │
└────────────────────┴───────────────┴────────────────┴────────────────────────────────┘
```

**Action badge colors:**
- `CREATE` → Green
- `UPDATE` → Blue
- `DELETE` → Red
- `ROLE_CHANGE` → Amber (CR exclusive)
- `UPLOAD` → Teal
- `KNOWLEDGE_ADD` → Indigo
- `KNOWLEDGE_DELETE` → Red-orange (CR exclusive)
- `REINDEX` → Purple (CR exclusive)
- `PUBLISH` → Cyan

**Expandable row:** Click any row to see full metadata JSON.

```
▼ Jun 16, 10:05 AM  │  Sakib (CR)  │  ROLE_CHANGE
  ┌────────────────────────────────────────────────────┐
  │  {                                                 │
  │    "targetUser": "nafisa@iut-dhaka.edu",           │
  │    "previousRole": "student",                      │
  │    "newRole": "admin",                             │
  │    "ip": "103.x.x.x",                              │
  │    "userAgent": "Chrome/125"                       │
  │  }                                                 │
  └────────────────────────────────────────────────────┘
```

### Export Button
```
[ ◆ Export Audit Log CSV ]   (date range applies)
```

---

## Page: System Settings `/admin/settings` *(CR only)*

### Sections

#### 1. Portal Identity
```
┌─────────────────────────────────────────────────────────┐
│  PORTAL IDENTITY                                        │
├─────────────────────────────────────────────────────────┤
│  Portal Name       [ IPE-24 Class Portal         ]      │
│  Batch             [ IPE-24                      ]      │
│  Current Semester  [ Even Semester 2024–2025     ]      │
│  Semester Start    [ 📅 January 15, 2025         ]      │
│  Semester End      [ 📅 July 31, 2025            ]      │
│                                [ Save ]                 │
└─────────────────────────────────────────────────────────┘
```

#### 2. Integration Status
```
┌─────────────────────────────────────────────────────────┐
│  INTEGRATIONS                                           │
├─────────────────────────────────────────────────────────┤
│  Google Sheets (Routine)                                │
│  Sheet URL: [ https://docs.google.com/... ]             │
│  Status: ✅ Connected  Last sync: 5 min ago             │
│                              [ Sync Now ]               │
├─────────────────────────────────────────────────────────┤
│  WhatsApp Bot (Baileys)                                 │
│  Status: ✅ Connected  Members: 52                      │
│  Group ID: [ xxxxxxxxxx@g.us    ]                       │
│                              [ Test Send ]              │
├─────────────────────────────────────────────────────────┤
│  Discord Bot                                            │
│  Status: ✅ Connected  Server: IPE-24 Batch             │
│  Channel: [ #announcements     ]                        │
│                              [ Test Post ]              │
├─────────────────────────────────────────────────────────┤
│  n8n Automation                                         │
│  Webhook URL: [ https://n8n.yourserver.com/... ]        │
│  Status: ✅ Running                                     │
└─────────────────────────────────────────────────────────┘
```

#### 3. AI Chatbot Settings
```
┌─────────────────────────────────────────────────────────┐
│  AI VIRTUAL CR SETTINGS                                 │
├─────────────────────────────────────────────────────────┤
│  Model              [ Gemini 1.5 Flash (free tier)  ]   │
│  Rate Limit (per user/hr)  [ 20    ] queries/hour       │
│  System Prompt                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ You are the Virtual CR for IPE-24 batch at IUT.   │  │
│  │ Answer questions about schedules, exams, policies.│  │
│  │ Be helpful, concise, and accurate.                │  │
│  └───────────────────────────────────────────────────┘  │
│                              [ Save Chatbot Settings ]  │
└─────────────────────────────────────────────────────────┘
```

#### 4. Notifications Settings
```
┌─────────────────────────────────────────────────────────┐
│  NOTIFICATION DEFAULTS                                  │
├─────────────────────────────────────────────────────────┤
│  Auto-push to WhatsApp on new announcement  [● ON]      │
│  Auto-post to Discord on new announcement   [● ON]      │
│  Send push notifications by default         [● ON]      │
│  Exam reminder (days before)                [ 3  ] days │
└─────────────────────────────────────────────────────────┘
```

#### 5. Danger Zone
```
┌─────────────────────────────────────────────────────────┐
│  ⚠️  DANGER ZONE                                        │
├─────────────────────────────────────────────────────────┤
│  Clear all chatbot rate limit counters                  │
│  Use if students are reporting false rate limit errors.  │
│  [ Clear Rate Limits ]                                  │
├─────────────────────────────────────────────────────────┤
│  Reset knowledge base index                             │
│  Wipes all embeddings. You must re-add all documents.   │
│  [ ◆ Wipe & Reset Knowledge Base ]                      │
├─────────────────────────────────────────────────────────┤
│  Put portal in maintenance mode                         │
│  Students see a "We'll be back" page.                   │
│  [ Enable Maintenance Mode ]                            │
└─────────────────────────────────────────────────────────┘
```

---

## Page: Telegram Interface `/admin/telegram` *(CR only)*

### Status Panel
```
┌─────────────────────────────────────────────────────────┐
│  📡 TELEGRAM BOT STATUS                                 │
│  ✅ Connected as @ipe24_cr_bot                          │
│  Authorized Telegram ID: 123456789 (You)                │
│  Last command: 8 minutes ago                            │
└─────────────────────────────────────────────────────────┘
```

### Available Telegram Commands Reference
```
┌─────────────────────────────────────────────────────────┐
│  AVAILABLE COMMANDS (send from your Telegram)          │
├─────────────────────────────────────────────────────────┤
│  /announce [text]     → Draft an announcement           │
│  /upload              → Prompt for file upload          │
│  /poll [question]     → Create a new poll               │
│  /routine             → Show today's routine            │
│  /status              → Get portal health status        │
│  /publish             → Publish last draft everywhere   │
│  /cancel              → Cancel pending action           │
└─────────────────────────────────────────────────────────┘
```

### Recent Telegram Activity
```
┌─────────────────────────────────────────────────────────┐
│  RECENT TELEGRAM COMMANDS                               │
├─────────────────────────────────────────────────────────┤
│  Jun 16, 10:30 AM  /announce "Mid-term schedule…"       │
│  → ✅ Published to all platforms                        │
│                                                         │
│  Jun 15, 3:40 PM   /upload [PDF attached]               │
│  → ✅ Uploaded: Slides_Wk11.pdf to CSE-4101             │
│                                                         │
│  Jun 15, 1:00 PM   /poll "Best study session day?"      │
│  → ✅ Poll created and published                        │
└─────────────────────────────────────────────────────────┘
```

### Test Command (web interface fallback)
```
┌─────────────────────────────────────────────────────────┐
│  SEND TELEGRAM COMMAND FROM WEB                         │
│  (Use when your phone isn't available)                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ /announce Mid-term exams start June 22. Full…     │  │
│  └───────────────────────────────────────────────────┘  │
│                   [ ◆ Execute Command ]                 │
└─────────────────────────────────────────────────────────┘
```

---

## Page: Audit Log `/admin/audit` — Additional CR-only Features

Compared to admin view:
- CR sees **all actors**, including other admins' actions
- CR can **export** the full audit log as CSV
- CR sees `ROLE_CHANGE`, `KNOWLEDGE_DELETE`, `REINDEX` entries that are only performed by CR

---

## CR-Exclusive Permission Guards

Unlike admin, super_admin has **no locked items** in the sidebar. All routes are accessible.

For destructive actions (Delete poll after voting, wipe knowledge base, etc.), the UI shows a double-confirmation pattern:

### Destructive Action Modal
```
┌─────────────────────────────────────────────────────────┐
│  ◆ CONFIRM DELETION                               [✕]   │
├─────────────────────────────────────────────────────────┤
│  You are about to delete:                               │
│  📢 "Mid-term Schedule Released"                         │
│  Posted by Ahsan (Admin), Jun 16                        │
│                                                         │
│  ⚠️ This action:                                        │
│  • Removes the announcement from the website            │
│  • Cannot be undone                                     │
│  • Will be logged in the audit log                      │
│                                                         │
│  To confirm, type the announcement title:               │
│  [ Mid-term Schedule Released              ]            │
│                                                         │
│        [Cancel]    [ ◆ Delete Permanently ]             │
└─────────────────────────────────────────────────────────┘
```

---

## Toast Notifications (Super Admin)

All admin toasts, plus:
```
✅  "Role updated. Nafisa is now an Admin."              [green, 4s]
✅  "Announcement deleted."                              [green, 4s]
✅  "Knowledge base reindexing started (2–4 min)…"      [amber, persist until done]
✅  "Reindex complete. 12 documents embedded."          [green, 4s]
✅  "Audit log exported successfully."                   [green, 4s]
⚠️  "Maintenance mode enabled. Students see the holding page."   [amber]
❌  "Telegram command failed. Check bot connection."    [red, persist]
```

---

## Summary: Permission Differences at a Glance

| Action                            | Student | Admin | Super Admin |
|-----------------------------------|---------|-------|-------------|
| View content                      | ✅      | ✅    | ✅          |
| Create announcements              | ❌      | ✅    | ✅          |
| Edit own announcements            | ❌      | ✅    | ✅          |
| Edit others' announcements        | ❌      | ❌    | ✅ ◆        |
| Delete announcements              | ❌      | Own only | ✅ ◆     |
| Upload files                      | ❌      | ✅    | ✅          |
| Delete files                      | ❌      | Own only | ✅ ◆     |
| Create/edit exam entries          | ❌      | ✅    | ✅          |
| Delete exam entries               | ❌      | ✅    | ✅          |
| Create/close polls                | ❌      | ✅    | ✅          |
| Delete polls                      | ❌      | ❌    | ✅ ◆        |
| Add to knowledge base             | ❌      | ✅    | ✅          |
| Delete from knowledge base        | ❌      | ❌    | ✅ ◆        |
| Reindex embeddings                | ❌      | ❌    | ✅ ◆        |
| View users list (names/emails)    | ❌      | ✅    | ✅          |
| View full user profiles           | ❌      | ❌    | ✅ ◆        |
| Change user roles                 | ❌      | ❌    | ✅ ◆        |
| Grant super_admin role            | ❌      | ❌    | ❌ (SQL only)|
| View audit log                    | ❌      | Read-only | Full ✅ ◆|
| Export audit log                  | ❌      | ❌    | ✅ ◆        |
| Telegram bot interface            | ❌      | ❌    | ✅ ◆        |
| System settings                   | ❌      | ❌    | ✅ ◆        |
| Maintenance mode                  | ❌      | ❌    | ✅ ◆        |

◆ = Super Admin (CR) exclusive
