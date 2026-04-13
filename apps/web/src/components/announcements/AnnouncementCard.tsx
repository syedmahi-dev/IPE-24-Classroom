'use client'
import { formatDistanceToNow } from 'date-fns'

const TYPE_STYLES = {
  general: 'bg-blue-50/80 text-blue-700 border-blue-200/50 shadow-sm shadow-blue-500/10',
  exam: 'bg-rose-50/80 text-rose-700 border-rose-200/50 shadow-sm shadow-rose-500/10',
  file_update: 'bg-teal-50/80 text-teal-700 border-teal-200/50 shadow-sm shadow-teal-500/10',
  routine_update: 'bg-amber-50/80 text-amber-700 border-amber-200/50 shadow-sm shadow-amber-500/10',
  urgent: 'bg-red-500 text-white border-red-600 shadow-md shadow-red-500/20 font-bold tracking-wide',
  event: 'bg-violet-50/80 text-violet-700 border-violet-200/50 shadow-sm shadow-violet-500/10',
} as const

const TYPE_LABELS = {
  general: 'General',
  exam: 'Exam',
  file_update: 'File Update',
  routine_update: 'Routine Update',
  urgent: '🚨 URGENT',
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
    <div className="glass rounded-2xl p-5 hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer relative overflow-hidden">
      {/* Decorative side accent based on urgent status */}
      {announcement.type === 'urgent' && (
        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-red-500"></div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <span className={`text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-xl border font-semibold ${TYPE_STYLES[announcement.type]}`}>
              {TYPE_LABELS[announcement.type]}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {announcement.publishedAt
                ? formatDistanceToNow(new Date(announcement.publishedAt), { addSuffix: true })
                : 'Draft'}
            </span>
          </div>
          <h3 className="font-bold text-lg text-slate-800 group-hover:text-brand-600 transition-colors truncate">{announcement.title}</h3>
          <div 
             className="text-sm text-slate-600 mt-2 line-clamp-2 leading-relaxed"
             dangerouslySetInnerHTML={{ __html: sanitizeHtml(announcement.body) }}
          />
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100/50">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600">
              {announcement.author.name.charAt(0)}
            </div>
            <p className="text-xs font-medium text-slate-500">{announcement.author.name}</p>
          </div>
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
