# Frontend Implementation — IPE-24 Class Portal

## Mobile UI Optimization Update (2026-05-03)

### Purpose
- Improve usability on phone screens by tightening spacing, preserving safe-area insets, and keeping core actions reachable with thumb-friendly targets.
- Reduce mobile friction in shared shells so updates affect both student and admin routes consistently.

### Frontend Changes
- Updated dashboard content container spacing in `DashboardShell` for better phone viewport fit and reliable bottom navigation clearance.
- Enhanced `TopBar` mobile behavior with an inline mobile search panel and stronger focus/touch states.
- Refined `Sidebar` mobile drawer with better compact spacing, safe-area top inset support, Escape-to-close, and body scroll lock while open.
- Optimized `MobileBottomNav` layout using adaptive grid columns (`5` student, `6` admin) and corrected the resources icon mapping.

### Schema Modifications
- None.

### New API Endpoints
- None.

### Local Testing Instructions
1. Run `cd apps/web`.
2. Run `npm run dev`.
3. Verify on mobile viewport widths (e.g., `320px`, `375px`, `390px`, `430px`) for `/dashboard`, `/announcements`, and admin pages.
4. Confirm: mobile drawer opens/closes smoothly, bottom nav does not overlap content, top bar search works on phones, and no horizontal overflow appears.

## Design System

### Colors (Tailwind config extension)
```javascript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a5f',
        },
        // IUT green accent
        iut: {
          green: '#006633',
          'green-light': '#e6f4ed',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
}
export default config
```

### Typography Scale
- Page headings: `text-2xl font-semibold text-gray-900`
- Section headings: `text-lg font-medium text-gray-800`
- Body: `text-sm text-gray-700 leading-relaxed`
- Muted: `text-xs text-gray-500`
- Labels: `text-xs font-medium uppercase tracking-wide text-gray-400`

### Spacing Convention
- Page padding: `px-4 md:px-8 py-6`
- Card padding: `p-4 md:p-6`
- Section gap: `space-y-6`
- Element gap: `gap-3` or `gap-4`

---

## Layout Architecture

### Root Layout (`app/layout.tsx`)
```tsx
import { Inter } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased bg-gray-50`}>
        <SessionProvider>
          {children}
          <Toaster richColors position="top-right" />
        </SessionProvider>
      </body>
    </html>
  )
}
```

### Student Shell Layout (`app/(student)/layout.tsx`)
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar role={session.user.role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar user={session.user} />
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

---

## Pages

### Dashboard Page (`app/(student)/dashboard/page.tsx`)
```tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchRoutine } from '@/lib/google-sheets'
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard'
import { RoutineWidget } from '@/components/routine/RoutineWidget'
import { ExamCountdown } from '@/components/exams/ExamCountdown'
import { NotificationBell } from '@/components/notifications/NotificationBell'

export default async function DashboardPage() {
  const session = await auth()

  // Parallel data fetching on server
  const [announcements, exams, routine] = await Promise.all([
    prisma.announcement.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      include: { author: { select: { name: true } } },
    }),
    prisma.exam.findMany({
      where: { examDate: { gte: new Date() }, isActive: true },
      orderBy: { examDate: 'asc' },
      take: 3,
      include: { course: true },
    }),
    fetchRoutine(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Good {getTimeOfDay()}, {session?.user.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">IPE-24 · IUT</p>
        </div>
        <NotificationBell />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-medium text-gray-800">Latest Announcements</h2>
          {announcements.map(a => <AnnouncementCard key={a.id} announcement={a} />)}
        </div>

        <div className="space-y-4">
          <RoutineWidget data={routine} />
          <div className="space-y-3">
            <h2 className="text-lg font-medium text-gray-800">Upcoming Exams</h2>
            {exams.map(e => <ExamCountdown key={e.id} exam={e} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
```

---

## Component Library

### AnnouncementCard
```tsx
// components/announcements/AnnouncementCard.tsx
'use client'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'

const TYPE_STYLES = {
  general: 'bg-blue-50 text-blue-700 border-blue-100',
  exam: 'bg-red-50 text-red-700 border-red-100',
  file_update: 'bg-green-50 text-green-700 border-green-100',
  routine_update: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  urgent: 'bg-red-100 text-red-800 border-red-200',
  event: 'bg-purple-50 text-purple-700 border-purple-100',
} as const

const TYPE_LABELS = {
  general: 'General',
  exam: 'Exam',
  file_update: 'File Update',
  routine_update: 'Routine Update',
  urgent: '🚨 Urgent',
  event: 'Event',
}

interface Props {
  announcement: {
    id: string
    title: string
    body: string
    type: keyof typeof TYPE_STYLES
    publishedAt: Date | null
    author: { name: string }
  }
}

export function AnnouncementCard({ announcement }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_STYLES[announcement.type]}`}>
              {TYPE_LABELS[announcement.type]}
            </span>
            <span className="text-xs text-gray-400">
              {announcement.publishedAt
                ? formatDistanceToNow(new Date(announcement.publishedAt), { addSuffix: true })
                : 'Draft'}
            </span>
          </div>
          <h3 className="font-medium text-gray-900 truncate">{announcement.title}</h3>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2"
             dangerouslySetInnerHTML={{ __html: sanitizeHtml(announcement.body) }}
          />
          <p className="text-xs text-gray-400 mt-2">— {announcement.author.name}</p>
        </div>
      </div>
    </div>
  )
}

// SECURITY: sanitize HTML from TipTap before rendering
function sanitizeHtml(html: string): string {
  // Use DOMPurify on client, or strip tags on server
  // Install: npm install isomorphic-dompurify
  if (typeof window === 'undefined') {
    return html.replace(/<script[^>]*>.*?<\/script>/gi, '')
               .replace(/on\w+="[^"]*"/gi, '')
  }
  const DOMPurify = require('isomorphic-dompurify')
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p','b','i','ul','ol','li','a','br','strong','em','h3','h4'],
    ALLOWED_ATTR: ['href'],
  })
}
```

### ChatBot Component (AI Virtual CR)
```tsx
// components/chat/ChatInterface.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your Virtual CR for IPE-24. Ask me about courses, exams, schedules, or anything class-related!",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || isLoading) return
    const question = input.trim()
    setInput('')

    setMessages(prev => [...prev, { role: 'user', content: question, timestamp: new Date() }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })

      if (!response.ok) {
        throw new Error(response.status === 429 ? 'Too many questions — try again in an hour.' : 'Something went wrong.')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let answer = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: new Date() }])

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        answer += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: answer, timestamp: new Date() }
          return updated
        })
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: err.message || 'Sorry, I had trouble answering that.',
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-white rounded-xl border border-gray-100">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center">
          <Bot size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Virtual CR</p>
          <p className="text-xs text-gray-400">IPE-24 AI Assistant</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-gray-400">Online</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.role === 'user'
                ? 'bg-brand-600 text-white rounded-tr-sm'
                : 'bg-gray-100 text-gray-800 rounded-tl-sm'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content || '...'}</p>
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <User size={14} className="text-gray-600" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask anything about IPE-24..."
            maxLength={500}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-brand-600 text-white rounded-lg px-3 py-2 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">20 questions per hour · Answers from class knowledge base</p>
      </div>
    </div>
  )
}
```

---

## Navigation Structure

### Sidebar Links (Student)
```typescript
export const STUDENT_NAV = [
  { href: '/dashboard',     label: 'Dashboard',      icon: 'LayoutDashboard' },
  { href: '/routine',       label: 'Class Routine',  icon: 'Calendar' },
  { href: '/resources',     label: 'Resources',      icon: 'FolderOpen' },
  { href: '/exams',         label: 'Exams',          icon: 'FileText' },
  { href: '/polls',         label: 'Polls',          icon: 'BarChart2' },
  { href: '/study-groups',  label: 'Study Groups',   icon: 'Users' },
  { href: '/chat',          label: 'Virtual CR',     icon: 'MessageCircle' },
  { href: '/profile',       label: 'Profile',        icon: 'User' },
]
```

### Sidebar Links (Admin)
```typescript
export const ADMIN_NAV = [
  { href: '/admin',                 label: 'Overview',        icon: 'BarChart2' },
  { href: '/admin/announcements',   label: 'Announcements',   icon: 'Megaphone' },
  { href: '/admin/files',           label: 'Files',           icon: 'Upload' },
  { href: '/admin/exams',           label: 'Exams',           icon: 'BookOpen' },
  { href: '/admin/polls',           label: 'Polls',           icon: 'Vote' },
  { href: '/admin/knowledge',       label: 'AI Knowledge',    icon: 'Brain' },
  { href: '/admin/users',           label: 'Users',           icon: 'Users', superAdminOnly: true },
  { href: '/admin/audit-log',       label: 'Audit Log',       icon: 'ScrollText' },
]
```

---

## PWA Configuration

Add to `app/manifest.ts` for installable mobile experience:
```typescript
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'IPE-24 Class Portal',
    short_name: 'IPE-24',
    description: 'Class portal for IPE-24 batch, IUT',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#2563eb',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
```

---

## Push Notification Service Worker

```javascript
// public/sw.js
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()

  event.waitUntil(
    self.registration.showNotification(data.notification.title, {
      body: data.notification.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      data: { link: data.webpush?.fcmOptions?.link },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = event.notification.data?.link ?? '/'
  event.waitUntil(clients.openWindow(link))
})
```

---

## Accessibility Checklist

- All interactive elements have `aria-label` or visible text
- Color is never the sole indicator of meaning (use icons + text alongside color badges)
- All images have `alt` attributes
- Focus ring visible on all focusable elements (`focus:ring-2`)
- Keyboard navigation tested (Tab through all interactive elements)
- `<html lang="en">` set in root layout
- Headings follow logical hierarchy (h1 → h2 → h3, no skips)
- Form inputs have associated `<label>` elements
- Error messages are announced via `aria-live="polite"`

---

## Performance Targets

| Metric | Target |
|---|---|
| Largest Contentful Paint | < 2.5s |
| First Input Delay | < 100ms |
| Cumulative Layout Shift | < 0.1 |
| Time to First Byte | < 800ms |
| Lighthouse Score | > 90 |

Achieved via: Server Components (no client JS for static content), `next/image` optimization, font preloading, route prefetching, Redis caching of Google API calls.
