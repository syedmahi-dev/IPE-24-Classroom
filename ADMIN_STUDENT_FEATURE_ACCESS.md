# Admin/SuperAdmin Access to Student Features

## Overview

Admin and SuperAdmin users now have full access to **all student features** in addition to their administrative functions. This allows admins to view the same class information (routine, resources, announcements) that students see, just from their dashboard.

**Update Date:** April 17, 2026

## What Changed

### 1. Navigation Structure (Updated)

#### File: `src/config/navigation.ts`

The `ADMIN_NAV` configuration now includes three organized sections:

**Admin Section** (Management & Control)
- `Admin Dashboard` — Overview of system metrics
- `Announcements` — Create/edit announcements
- `Manage Files` — Upload & organize resources
- `Manage Exams` — Create exam schedules
- `Manage Routine` — Update class timetable
- `Manage Polls` — Create & monitor polls
- `Courses` — Manage course catalog
- `AI Knowledge` — Index documents for RAG chatbot
- `Users & Roles` — (SuperAdmin only) Manage user roles
- `Audit Log` — (SuperAdmin only) View system activity
- `Telegram Bot` — (SuperAdmin only) Configure Telegram bot
- `Drives` — (SuperAdmin only) Manage cloud drives

**Student Access Section** (View as Student)
- `View Announcements` → `/announcements` (Public feed)
- `Class Routine` → `/routine` (Timetable with personal schedule)
- `Resources` → `/resources` (File downloads by course)
- `My Exams` → `/exams` (Exam countdown & schedule)
- `Polls` → `/polls` (Vote & view results)
- `Study Groups` → `/study-groups` (Community boards)
- `Virtual CR` → `/chat` (AI chatbot)

**Personal Section** (User Settings)
- `Profile` → `/profile` (Personal information)
- `Settings` → `/settings` (Preferences & security)

### 2. Sidebar Component (Enhanced)

#### File: `src/components/layout/Sidebar.tsx`

**Changes:**
- Added automatic section grouping for navigation items
- Section headers display between groups (Admin / Student Access / Personal)
- Only shows section headers when multiple sections exist
- All functionality preserved (active states, locked items, animations)

**Visual Layout:**
```
┌─ ADMIN SIDEBAR ──────────────┐
│ [Logo & Title]               │
│                              │
│ ═ Admin                      │
│ • Admin Dashboard            │
│ • Announcements              │
│ • Manage Files               │
│ • Manage Exams               │
│ • Manage Routine             │
│ ...                          │
│                              │
│ ═ Student Access             │
│ • View Announcements         │
│ • Class Routine              │
│ • Resources                  │
│ • My Exams                   │
│ ...                          │
│                              │
│ ═ Personal                   │
│ • Profile                    │
│ • Settings                   │
└──────────────────────────────┘
```

### 3. Mobile Navigation (Updated)

#### File: `src/components/layout/MobileBottomNav.tsx`

**Changes:**
- Expanded admin mobile nav to include both admin and student quick access
- 6 quick-access links instead of 5
- Includes direct links to Routine and Resources (student features)

**Mobile Bottom Nav (Admin):**
```
[Admin] [Manage] [Routine] [Files] [Chat] [Profile]
```

**Mobile Bottom Nav (Student):**
```
[Home] [Updates] [Routine] [Chat] [Profile]
```

## Route Access

### Student Pages Accessible to Admin

All student routes are now accessible to admin users. No page modifications required.

| Route | Purpose | Component | Access |
|-------|---------|-----------|--------|
| `/announcements` | Public announcement feed | Student layout | Admin ✅ + Student ✅ |
| `/routine` | Personal class timetable | Student layout | Admin ✅ + Student ✅ |
| `/resources` | Course materials & files | Student layout | Admin ✅ + Student ✅ |
| `/exams` | Exam schedule & countdown | Student layout | Admin ✅ + Student ✅ |
| `/polls` | Voting & results | Student layout | Admin ✅ + Student ✅ |
| `/study-groups` | Community discussion boards | Student layout | Admin ✅ + Student ✅ |
| `/chat` | AI chatbot with RAG | Student layout | Admin ✅ + Student ✅ |
| `/profile` | User profile & settings | Student layout | Admin ✅ + Student ✅ |
| `/dashboard` | Student dashboard | Student layout | Admin ✅ + Student ✅ |

### Admin Pages (Students Cannot Access)

Student users continue to have NO access to admin routes. Middleware + role checks prevent this.

| Route | Purpose | Admin ✅ | Student ❌ |
|-------|---------|---------|----------|
| `/admin` | Dashboard | ✅ | ❌ |
| `/admin/announcements` | Manage announcements | ✅ | ❌ |
| `/admin/files` | Manage uploads | ✅ | ❌ |
| `/admin/exams` | Manage exam schedules | ✅ | ❌ |
| `/admin/routine` | Manage timetable | ✅ | ❌ |
| `/admin/polls` | Manage polls | ✅ | ❌ |
| `/admin/courses` | Manage courses | ✅ | ❌ |
| `/admin/knowledge` | Manage RAG index | ✅ | ❌ |
| `/admin/users` | User role management | ✅ SuperAdmin only | ❌ |
| `/admin/audit` | Audit logs | ✅ SuperAdmin only | ❌ |
| `/admin/telegram` | Telegram bot config | ✅ SuperAdmin only | ❌ |
| `/admin/drives` | Cloud storage | ✅ SuperAdmin only | ❌ |

## Use Cases

### Admin Checking Class Routine
Admin logs in → Admin dashboard loads → Sidebar shows all features:
1. Click "Class Routine" in "Student Access" section
2. Views the same timetable as students
3. Can verify if routine loaded correctly
4. Can cross-reference with `/admin/routine` management page

### Admin Downloading Resources
Admin wants to verify uploaded files are accessible:
1. Navigate to "Resources" via sidebar
2. Browse courses and files like a student would
3. Test download functionality
4. Then go to `/admin/files` to bulk upload more

### Admin Taking Exam
Admin is also enrolled in a course and needs to know exam schedule:
1. View "My Exams" to see personal exam countdown
2. Cross-reference with `/admin/exams` for full schedule management

### SuperAdmin Monitoring System
SuperAdmin has everything admin + student features + restricted admin pages:
1. View audit logs (`/admin/audit`)
2. Switch to student perspective (`/routine`, `/resources`)
3. Verify system from end-user perspective
4. Return to admin tools for configuration

## Technical Implementation

### Role-Based Navigation

The sidebar intelligently handles navigation based on user role:

```typescript
// In Sidebar.tsx
const links = role === "admin" || role === "super_admin" 
  ? ADMIN_NAV              // Combined admin + student features
  : STUDENT_NAV            // Student-only features

// Navigation items are now grouped by section property
const groupedLinks = {}
links.forEach(link => {
  const section = link.section || 'Main'
  if (!groupedLinks[section]) groupedLinks[section] = []
  groupedLinks[section].push(link)
})
```

### No Route Restrictions

Student routes (`(student)` group) don't check role in layout — any authenticated user can access them:

```typescript
// src/app/(student)/layout.tsx
export default async function StudentLayout({ children }) {
  const session = await auth()
  if (!session) redirect('/login')
  // No role check — admins can access student pages
  return <DashboardShell role={session.user.role} {...}>{children}</DashboardShell>
}
```

Admin routes (`(admin)` group) enforce role restrictions:

```typescript
// src/app/(admin)/layout.tsx
export default async function AdminLayout({ children }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['admin', 'super_admin'].includes(session.user.role)) {
    redirect('/dashboard')  // Block non-admin users
  }
  return <DashboardShell role={session.user.role} {...}>{children}</DashboardShell>
}
```

## Testing Checklist

- [ ] Log in as Admin user
- [ ] Verify sidebar shows both "Admin" and "Student Access" sections
- [ ] Click "Class Routine" and verify timetable loads
- [ ] Click "Resources" and verify course files display
- [ ] Click "View Announcements" and verify feed loads
- [ ] Verify all student feature links work from admin account
- [ ] Log in as SuperAdmin
- [ ] Verify SuperAdmin section shows locked admin features ("Users & Roles", "Audit Log", etc.)
- [ ] Click "Users & Roles" and verify it's accessible (locked badge visible)
- [ ] Log in as Student user
- [ ] Verify sidebar shows ONLY student features (no "Student Access" section header, no admin links)
- [ ] Verify student cannot access `/admin` routes (redirects to `/dashboard`)
- [ ] Check mobile bottom nav displays correct shortcuts for each role

## FAQ

**Q: Can students see admin links?**
A: No. Student navigation only shows STUDENT_NAV. Admin links are in ADMIN_NAV which is only shown to admin/super_admin users.

**Q: What if admin creates a routine entry — will they see it in `/routine`?**
A: The routine page shows the user's personal schedule (filtered by their enrollment). If the admin is not enrolled in a course, they will see an empty schedule. They should view `/admin/routine` for the full timetable.

**Q: Can I customize which student features admins see?**
A: Yes! Edit the `ADMIN_NAV` array in `src/config/navigation.ts`:
- Remove any line from the "Student Access" section to hide that feature
- Change href paths if you want to redirect to admin versions instead
- Add new features by following the pattern: `{ href: '/path', label: 'Label', icon: 'IconName', section: 'Student Access' }`

**Q: Is there performance impact from combined navigation?**
A: No. Navigation is loaded once at layout render time. The grouping logic runs client-side in the Sidebar component with no additional API calls.

**Q: What about mobile users?**
A: Mobile bottom nav shows 6 quick-access items for admin (Admin, Manage, Routine, Files, Chat, Profile). Students see 5 items (Home, Updates, Routine, Chat, Profile). Full nav is accessible from hamburger menu on both.

## Files Modified

1. `src/config/navigation.ts` — Added section property to ADMIN_NAV, expanded with student features
2. `src/components/layout/Sidebar.tsx` — Enhanced to group navigation by section
3. `src/components/layout/MobileBottomNav.tsx` — Updated ADMIN_MOBILE_NAV with student features

## Rollback Instructions

If needed, revert to previous behavior:

1. **Restore navigation.ts** — Removes student features from ADMIN_NAV
2. **Restore Sidebar.tsx** — Removes grouping logic, renders flat list
3. **Restore MobileBottomNav.tsx** — Removes student quick-access items

All changes are backward compatible. No database migrations or API changes required.

## Next Steps

Once verified working:
1. Test on staging environment with real user data
2. Gather feedback from admin users on feature visibility
3. Consider admin-specific dashboard that consolidates management + student view
4. Document in user training materials that admins can "test as student" from sidebar
