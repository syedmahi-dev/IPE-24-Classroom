'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, User, Tag, Clock, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import DOMPurify from 'isomorphic-dompurify'

const TYPE_STYLES: Record<string, string> = {
  general: 'bg-blue-50/80 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/50 shadow-sm shadow-blue-500/10',
  exam: 'bg-rose-50/80 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/50 shadow-sm shadow-rose-500/10',
  file_update: 'bg-teal-50/80 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200/50 dark:border-teal-900/50 shadow-sm shadow-teal-500/10',
  routine_update: 'bg-amber-50/80 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/50 shadow-sm shadow-amber-500/10',
  urgent: 'bg-red-500 dark:bg-red-600 text-white border-red-600 dark:border-red-500 shadow-md shadow-red-500/20 font-bold tracking-wide',
  event: 'bg-violet-50/80 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border-violet-200/50 dark:border-violet-900/50 shadow-sm shadow-violet-500/10',
  course_update: 'bg-indigo-50/80 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/50 shadow-sm shadow-indigo-500/10',
}

const TYPE_LABELS: Record<string, string> = {
  general: 'General',
  exam: 'Exam',
  file_update: 'File Update',
  routine_update: 'Routine Update',
  urgent: 'URGENT',
  event: 'Event',
  course_update: 'Course Update',
}

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'b', 'i', 'ul', 'ol', 'li', 'a', 'br', 'strong', 'em',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'hr',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'small', 'span', 'div',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
}

type AnnouncementDetail = {
  id: string
  title: string
  body: string
  type: string
  publishedAt: string | null
  createdAt: string
  author: { name: string; role: string }
  courses: { courseId: string; course: { id: string; code: string; name: string } }[]
}

export default function AnnouncementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [announcement, setAnnouncement] = useState<AnnouncementDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    async function fetchAnnouncement() {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/announcements/${id}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError('Announcement not found')
          } else {
            throw new Error('Failed to load announcement')
          }
          return
        }
        const result = await res.json()
        if (result.success) {
          setAnnouncement(result.data)
        } else {
          throw new Error(result.error?.message || 'Failed to load')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncement()
  }, [id])

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center py-32">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Loading...</p>
      </div>
    )
  }

  if (error || !announcement) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 py-16">
        <Link
          href="/announcements"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 rounded-xl hover:bg-brand-50 dark:hover:bg-brand-900/20 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors font-bold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Announcements
        </Link>
        <div className="glass rounded-[2rem] p-16 text-center">
          <h3 className="text-xl font-black text-slate-600 dark:text-slate-300">
            {error || 'Announcement not found'}
          </h3>
          <p className="text-slate-400 dark:text-slate-500 mt-2 font-medium">
            This announcement may have been removed or is no longer available.
          </p>
        </div>
      </div>
    )
  }

  const cleanBody = DOMPurify.sanitize(announcement.body, SANITIZE_CONFIG)

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-20 mt-4 md:mt-8">
      {/* Header / Back Navigation */}
      <Link
        href="/announcements"
        className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 rounded-xl hover:bg-brand-50 dark:hover:bg-brand-900/20 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors font-bold text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Announcements
      </Link>

      {/* Main Content Card */}
      <div className="glass rounded-[2.5rem] overflow-hidden border border-white/80 dark:border-white/10 shadow-2xl relative">
        {/* Urgent Indicator */}
        {announcement.type === 'urgent' && (
          <div className="absolute top-0 left-0 right-0 h-2 bg-red-500 animate-pulse" />
        )}

        <div className="p-8 md:p-14 space-y-8">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <span className={`text-xs md:text-sm uppercase tracking-widest px-4 py-1.5 rounded-full border font-bold ${TYPE_STYLES[announcement.type] || TYPE_STYLES.general}`}>
              {TYPE_LABELS[announcement.type] || 'General'}
            </span>
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm font-medium">
              <Clock className="w-4 h-4" />
              {announcement.publishedAt
                ? formatDistanceToNow(new Date(announcement.publishedAt), { addSuffix: true })
                : 'N/A'}
            </div>
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm font-medium">
              <User className="w-4 h-4" />
              {announcement.author?.name || 'Unknown Author'}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
            {announcement.title}
          </h1>

          {/* Courses Tags */}
          {announcement.courses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {announcement.courses.map((ac) => (
                <span
                  key={ac.courseId}
                  className="bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 px-3 py-1 rounded-lg text-xs font-bold border border-brand-100 dark:border-brand-900/50 flex items-center gap-1.5"
                >
                  <Tag className="w-3 h-3" />
                  {ac.course.code}
                </span>
              ))}
            </div>
          )}

          {/* Body — full content */}
          <div
            className="prose prose-slate dark:prose-invert max-w-none prose-p:text-lg prose-p:leading-relaxed prose-headings:font-black prose-a:text-brand-600 dark:prose-a:text-brand-400"
            dangerouslySetInnerHTML={{ __html: cleanBody }}
          />
        </div>

        {/* Footer info */}
        <div className="bg-slate-50/50 dark:bg-slate-800/30 px-8 md:px-14 py-6 border-t border-slate-100 dark:border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
              {announcement.author?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100 leading-none mb-1">{announcement.author?.name || 'Unknown Author'}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {announcement.author?.role === 'super_admin' ? 'Super Admin' : 'Class Representative'}
              </p>
            </div>
          </div>
          <div className="text-slate-400 dark:text-slate-600 text-xs font-medium flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            Published on {announcement.publishedAt
              ? new Date(announcement.publishedAt).toLocaleDateString('en-US', { dateStyle: 'long' })
              : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  )
}
