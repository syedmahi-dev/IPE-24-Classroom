# Security — Threat Model, Vulnerabilities & Protection

## Threat Model

**Who might attack this system?**
- Curious students trying to access admin features
- Outsiders who find the URL and try to log in with non-IUT emails
- Automated bots scanning for common vulnerabilities
- A malicious student trying to post fake announcements or corrupt data

**What are we protecting?**
- Student personal information (emails, phone numbers)
- Admin functionality (only CR/deputy should post announcements)
- Data integrity (no one should corrupt announcements, exams, or files)
- Service availability (bot should not be taken down by a single bad request)

---

## Vulnerability Categories & Mitigations

---

### 1. SQL Injection

**Risk:** An attacker crafts input that modifies SQL queries, bypassing auth or leaking data.

**Status with Prisma:** Prisma uses parameterized queries by default. Standard Prisma calls are immune.

**Risk area:** Raw SQL queries (used for pgvector). Must use tagged template literals, never string concatenation.

```typescript
// ✅ SAFE — tagged template literal, parameters are escaped
const results = await prisma.$queryRaw`
  SELECT * FROM knowledge_chunks
  WHERE embedding <=> ${embedding}::vector
  LIMIT ${limit}
`

// ❌ DANGEROUS — never do this
const results = await prisma.$queryRawUnsafe(
  `SELECT * FROM knowledge_chunks WHERE course_code = '${courseCode}'`
)
```

**Audit checklist:**
- [ ] Search codebase for `$queryRawUnsafe` — should be zero occurrences
- [ ] All raw SQL uses tagged template literals `$queryRaw\`...\``
- [ ] User inputs never concatenated into SQL strings

---

### 2. Cross-Site Scripting (XSS)

**Risk:** Announcements contain HTML (from TipTap editor). If rendered without sanitization, a CR or compromised admin could inject `<script>` tags that steal student session cookies.

**Mitigation 1: Server-side sanitization before storage**
```typescript
// apps/web/app/api/v1/admin/announcements/route.ts
import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = ['p','b','i','strong','em','ul','ol','li','a','br','h3','h4','blockquote']
const ALLOWED_ATTR = ['href']

function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS, ALLOWED_ATTR })
}

// Apply BEFORE storing in database
const sanitizedBody = sanitizeHtml(body)
await prisma.announcement.create({ data: { body: sanitizedBody, ... } })
```

**Mitigation 2: Content Security Policy headers**
```nginx
# nginx/conf.d/ipe24.conf
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'self' 'nonce-{NONCE}' https://www.gstatic.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://lh3.googleusercontent.com;
  connect-src 'self';
  frame-src https://docs.google.com https://sheets.google.com;
" always;
```

**Mitigation 3: HttpOnly session cookies**
- NextAuth uses HttpOnly cookies by default — JavaScript cannot read them
- XSS cannot steal session tokens

**Audit checklist:**
- [ ] All user-generated HTML is sanitized before storage AND before render
- [ ] CSP header is present on all responses
- [ ] `dangerouslySetInnerHTML` only used with pre-sanitized content

---

### 3. Cross-Site Request Forgery (CSRF)

**Risk:** A malicious website tricks a logged-in student into making a state-changing request (e.g., submitting a poll vote or study group join).

**Mitigation:** NextAuth v5 includes built-in CSRF protection via the `__Host-` prefixed session cookie. Additionally:

```typescript
// For all state-changing API routes, verify Origin header
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  const allowedOrigin = process.env.NEXTAUTH_URL!

  if (origin && origin !== allowedOrigin) {
    return NextResponse.json({ error: 'CSRF check failed' }, { status: 403 })
  }
  // ...
}
```

```nginx
# Nginx: reject cross-origin non-GET requests
if ($request_method !~ ^(GET|HEAD)$ ) {
  set $check "${http_origin}";
  if ($check !~* "^https://your-domain\.me$") {
    return 403;
  }
}
```

---

### 4. Authentication Bypass

**Risk:** Attackers try to access admin pages or API routes without a valid session.

**Mitigation — Domain Restriction:**
```typescript
// lib/auth.ts — enforced at OAuth callback level
async signIn({ profile }) {
  if (!profile?.email?.endsWith('@iut-dhaka.edu')) {
    return '/auth/error?reason=domain'
  }
  return true
}
```

**Mitigation — Route Middleware:**
Every request to `/admin/*` and `/api/v1/admin/*` passes through middleware that checks session existence AND role. Even if middleware is bypassed (it won't be), the API route guards check again.

**Mitigation — Session Integrity:**
```typescript
// Session contains role fetched fresh from DB on each session() call
// An admin whose role was revoked gets correct permissions on next API call
async session({ session, user }) {
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true }
  })
  session.user.role = fresh?.role ?? 'student'
  return session
}
```

---

### 5. Path Traversal

**Risk:** A malicious file upload path like `../../etc/passwd` allows reading server files.

**Mitigation:**
```typescript
// Sanitize ALL filenames before use
function sanitizeFilename(name: string): string {
  return name
    .replace(/\.\./g, '')          // Remove ..
    .replace(/[\/\\]/g, '')        // Remove slashes
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Only safe chars
    .slice(0, 200)                 // Max length
}

// Usage before any file operation:
const safeName = sanitizeFilename(file.name)
```

Files are uploaded to Google Drive — never written to the local filesystem directly. The only local file write is the temporary voice note in `/tmp/`, which is:
1. Written with a generated timestamp name (not user-controlled)
2. Deleted immediately after transcription

---

### 6. Mass Assignment / Privilege Escalation

**Risk:** A student sends a POST /api/v1/profile request with `{ "role": "super_admin" }` hoping the backend blindly assigns all fields.

**Mitigation — Explicit Field Whitelisting:**
```typescript
// ❌ NEVER do this — assigns whatever the user sends
await prisma.user.update({ where: { id }, data: req.body })

// ✅ ALWAYS whitelist exactly what can be updated
const { phone, bio } = bodySchema.parse(req.body)  // Zod schema only allows these two fields
await prisma.user.update({
  where: { id: session.user.id },
  data: { phone, bio }  // role, email, studentId cannot be changed here
})
```

Role changes are only possible via `/api/v1/admin/users/:id/role` which requires `super_admin`.

---

### 7. Rate Limiting & Denial of Service

**Risk:** An attacker (or runaway script) hammers the API or chatbot, burning through the Gemini free tier or crashing the server.

**Mitigation — Nginx level (IP-based):**
```nginx
# nginx/conf.d/ipe24.conf
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

location /api/ {
  limit_req zone=api burst=10 nodelay;
}

location /api/auth/ {
  limit_req zone=auth burst=2 nodelay;
}
```

**Mitigation — Application level (user-based, Redis):**
```typescript
// Different limits per endpoint
const limits = {
  chat: { max: 20, window: 3600 },           // 20 AI queries/hour
  vote: { max: 10, window: 60 },             // 10 poll votes/minute (anti-spam)
  fileUpload: { max: 20, window: 3600 },     // 20 uploads/hour (admin)
}
```

**Mitigation — Gemini global rate guard:**
```typescript
// Shared Redis counter for Gemini calls across all users
const geminiCheck = await rateLimit('gemini:global', 12, 60)
if (!geminiCheck.success) {
  return Response.json({ error: 'AI temporarily busy, try again in a minute' }, { status: 503 })
}
```

---

### 8. Insecure Direct Object Reference (IDOR)

**Risk:** Student A accesses `/api/v1/chat-logs/some-uuid` and reads Student B's private chat history.

**Mitigation — Ownership checks on all personal data:**
```typescript
// ❌ Vulnerable — fetches by ID without ownership check
const log = await prisma.chatLog.findUnique({ where: { id } })

// ✅ Safe — scoped to current user
const log = await prisma.chatLog.findFirst({
  where: { id, userId: session.user.id }  // Must belong to current user
})
if (!log) return ERRORS.NOT_FOUND('Chat log')
```

**Rule:** Any query on user-owned data must include `userId: session.user.id` in the `where` clause.

---

### 9. Internal API Secret Exposure

**Risk:** The `INTERNAL_API_SECRET` used for n8n → website communication leaks, allowing anyone to post announcements.

**Mitigations:**
1. Secret is at least 32 random bytes (`openssl rand -hex 32`)
2. Never logged or included in error responses
3. Internal endpoints only accept requests from `127.0.0.1` network (Docker internal)
4. Nginx blocks `/api/v1/internal/*` from external traffic:

```nginx
location /api/v1/internal/ {
  # Only allow internal Docker network
  allow 172.16.0.0/12;
  deny all;
}
```

---

### 10. Dependency Vulnerabilities

**Mitigation:**
```bash
# Run weekly (add to crontab or GitHub Actions)
npm audit --audit-level=high

# Fix automatically where possible
npm audit fix

# Check for outdated packages
npm outdated
```

Add to GitHub Actions CI:
```yaml
- name: Security audit
  run: npm audit --audit-level=high
  working-directory: apps/web
```

---

## Security Headers Checklist (Nginx)

```nginx
# Add to every response
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

## Pre-Launch Security Checklist

### Authentication
- [ ] Google OAuth restricted to `@iut-dhaka.edu` domain
- [ ] Session cookies are HttpOnly and Secure
- [ ] Sessions expire after 30 days
- [ ] `super_admin` role set via SQL only, not UI

### Input Validation
- [ ] All API inputs validated with Zod schemas
- [ ] File uploads restricted to allowed MIME types
- [ ] Filenames sanitized before any use
- [ ] HTML content sanitized with DOMPurify before storage and render

### Access Control
- [ ] Every API route checks session
- [ ] Admin routes check role at middleware AND route level
- [ ] Internal routes check secret header
- [ ] Personal data queries scoped to current user ID

### Infrastructure
- [ ] `.env` files not committed to git (in `.gitignore`)
- [ ] `NEXTAUTH_SECRET` is 32+ random bytes
- [ ] `INTERNAL_API_SECRET` is 32+ random bytes
- [ ] Database not accessible from outside Docker network
- [ ] Redis not accessible from outside Docker network
- [ ] n8n requires HTTP Basic Auth to access UI
- [ ] Nginx rate limiting configured
- [ ] CSP headers configured
- [ ] Security headers added

### Dependencies
- [ ] `npm audit` passes with no high/critical issues
- [ ] All Docker images pinned to specific versions (not `latest`)

---

## Penetration Testing Procedure

Run this before going live and after major changes.

### 1. Manual Tests

**Authentication:**
```bash
# Test domain restriction
curl -X POST https://your-domain.me/api/auth/callback/google \
  --data '{"email":"attacker@gmail.com"}'
# Expected: redirect to /auth/error?reason=domain

# Test unauthenticated API access
curl https://your-domain.me/api/v1/announcements
# Expected: 401 Unauthorized

# Test role escalation
curl -X PATCH https://your-domain.me/api/v1/profile \
  -H "Cookie: session=student-session-cookie" \
  -d '{"role":"super_admin"}'
# Expected: role field ignored, only phone/bio updated
```

**Injection:**
```bash
# SQL injection attempt via query params
curl "https://your-domain.me/api/v1/announcements?page=1'; DROP TABLE announcements;--"
# Expected: Zod validation error (page must be a number)

# XSS via announcement body (if you have admin access in test env)
# Submit body: <script>alert('xss')</script>
# Expected: stored as empty (DOMPurify strips script tags)
```

**Rate limiting:**
```bash
# Hammer the chat endpoint
for i in {1..25}; do
  curl -X POST https://your-domain.me/api/v1/chat \
    -H "Content-Type: application/json" \
    -H "Cookie: session=student-session" \
    -d '{"question":"test"}'
done
# Expected: first 20 succeed, requests 21-25 return 429
```

### 2. Automated Scan

```bash
# Install OWASP ZAP
docker pull owasp/zap2docker-stable

# Run baseline scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://your-domain.me \
  -r zap-report.html

# Review the HTML report for medium/high alerts
```
