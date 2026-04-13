# Roles and Permissions — IPE-24 Class Portal

## Role Definitions

The system has exactly three roles. Roles are stored in the `users.role` column and enforced at multiple layers.

---

### `super_admin` — Class Representative (CR)

**Who:** The elected CR of IPE-24. Only one person holds this role at any time. This role is assigned manually by directly updating the database after first login — it cannot be granted through the UI by anyone.

**Capabilities: Everything.** Includes all admin and student permissions plus:

| Action | Detail |
|---|---|
| Grant / revoke `admin` role | Can promote a deputy CR to admin |
| Access Telegram automation | Only `super_admin`'s Telegram ID is in the authorized list |
| Delete any content | Announcements, files, polls, exam entries |
| View full audit log | See every action taken by every user |
| Manage knowledge base | Add, remove, reindex AI chatbot documents |
| Close or delete polls | Even after students have voted |
| View all user profiles | Including contact details |
| Reindex AI embeddings | Trigger full knowledge base rebuild |

**Assignment:** After your first login, run this SQL directly:
```sql
UPDATE users SET role = 'super_admin' WHERE email = 'your-email@iut-dhaka.edu';
```

---

### `admin` — Deputy CR

**Who:** A trusted classmate designated by the CR. There can be multiple admins (recommend max 2).

**Capabilities: Most administrative actions, no destructive or role-management actions.**

| Action | Allowed? |
|---|---|
| Create announcements | ✅ |
| Edit own announcements | ✅ |
| Edit others' announcements | ❌ (super_admin only) |
| Delete announcements | ❌ (super_admin only) |
| Upload files | ✅ |
| Delete files | ✅ (own uploads only) |
| Create exam entries | ✅ |
| Edit exam entries | ✅ |
| Delete exam entries | ✅ |
| Create polls | ✅ |
| Close polls | ✅ |
| View users list | ✅ (names and emails only) |
| Change user roles | ❌ (super_admin only) |
| View audit log | ✅ (read-only) |
| Use Telegram bot | ❌ |
| Manage knowledge base | ✅ (add only, no delete) |

**Assignment:** The super_admin promotes a user via the admin panel:
```
Admin Panel → Users → Select user → Change Role → Admin
```
This is logged in the audit log.

---

### `student` — Default Role

**Who:** Every authenticated `@iut-dhaka.edu` user who is not an admin. Assigned automatically on first login.

**Capabilities: Read and interact, never write public content.**

| Action | Allowed? |
|---|---|
| View announcements | ✅ |
| View class routine | ✅ |
| View and download files | ✅ |
| View exam schedule | ✅ |
| Vote in polls | ✅ (once per poll) |
| Use AI Virtual CR chatbot | ✅ (rate limited: 20 queries/hour) |
| Edit own profile | ✅ (phone, bio only) |
| Post to study group board | ✅ |
| Post lost & found notices | ✅ |
| Subscribe to push notifications | ✅ |
| Create announcements | ❌ |
| Upload files | ❌ |
| Access admin panel | ❌ (redirect to /dashboard) |

---

## Enforcement Layers

Roles are enforced at **four separate layers**. Defeating one layer alone is not enough to gain elevated access.

### Layer 1 — Next.js Middleware (Route-Level)

File: `apps/web/middleware.ts`

```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Block unauthenticated users from everything except /login and /auth/*
  if (!session && !pathname.startsWith('/auth') && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Block non-admin users from /admin/* pages
  if (pathname.startsWith('/admin')) {
    if (!session?.user?.role || !['admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Block non-super_admin from /admin/users and /admin/settings
  if (pathname.startsWith('/admin/users') || pathname.startsWith('/admin/settings')) {
    if (session?.user?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api/v1/health|_next|favicon).*)'],
}
```

### Layer 2 — API Route Guards (Function-Level)

File: `apps/web/lib/api-guards.ts`

```typescript
import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

type Role = 'student' | 'admin' | 'super_admin'

const ROLE_HIERARCHY: Record<Role, number> = {
  student: 0,
  admin: 1,
  super_admin: 2,
}

export async function requireRole(req: NextRequest, minimumRole: Role) {
  const session = await auth()
  
  if (!session?.user) {
    return { error: NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 }) }
  }
  
  const userLevel = ROLE_HIERARCHY[session.user.role as Role] ?? -1
  const requiredLevel = ROLE_HIERARCHY[minimumRole]
  
  if (userLevel < requiredLevel) {
    return { error: NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 }) }
  }
  
  return { user: session.user }
}

// Usage in any route handler:
// const { user, error } = await requireRole(req, 'admin')
// if (error) return error
```

### Layer 3 — Prisma Query Scoping (Data-Level)

Admin-only data is never fetched for student sessions. Example:

```typescript
// In GET /api/v1/admin/users
const { user, error } = await requireRole(req, 'super_admin')
if (error) return error

// Only reached if super_admin — Prisma query is never executed for others
const users = await prisma.user.findMany({
  select: { id: true, email: true, name: true, role: true, lastLogin: true }
})
```

### Layer 4 — Internal Route Secret (Bot-Level)

Routes called by n8n, Discord bot, or WhatsApp bot use a shared secret header:

```typescript
// apps/web/app/api/v1/internal/announcements/route.ts
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }
  
  // Safe to proceed
}
```

---

## Audit Log

Every admin action writes a row to the `audit_logs` table. This is done in a centralized helper, not per-route.

```typescript
// apps/web/lib/audit.ts
export async function logAudit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: { actorId, action, targetType, targetId, metadata, createdAt: new Date() }
  })
}

// Example usage after creating an announcement:
await logAudit(user.id, 'CREATE', 'announcement', announcement.id, { title: announcement.title })
```

**Tracked actions:**
- `CREATE`, `UPDATE`, `DELETE` on announcements, files, exams, polls
- `ROLE_CHANGE` on users
- `KNOWLEDGE_ADD`, `KNOWLEDGE_DELETE`, `KNOWLEDGE_REINDEX`
- `ANNOUNCEMENT_PUBLISH` (when published to WhatsApp/Discord via n8n)

---

## First-Time Setup Checklist for Roles

After deploying and before announcing the site to students:

1. Log in with your IUT email to create your user record
2. Run the `super_admin` SQL command
3. Log out and log back in — your session now reflects `super_admin`
4. Go to Admin Panel → Settings → Verify your role shows correctly
5. If you have a deputy CR, have them log in first, then promote them via Admin Panel → Users
6. Never grant `super_admin` through the UI — this role is intentionally SQL-only
