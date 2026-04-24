"use client"

import { useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { markAsRead, markAllAsRead, clearAllNotifications } from '@/actions/notifications'
import { BellRing, Check, CheckCircle2, Clock, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type Notification = {
  id: string
  title: string
  body: string
  link: string | null
  isRead: boolean
  createdAt: Date
}

export default function NotificationList({ initialNotifications }: { initialNotifications: Notification[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Automatically mark all as read when the page is viewed
  useEffect(() => {
    const hasUnread = initialNotifications.some(n => !n.isRead)
    if (hasUnread) {
      startTransition(async () => {
        await markAllAsRead()
        router.refresh()
      })
    }
  }, [initialNotifications, router])

  const handleMarkAsRead = (id: string) => {
    startTransition(async () => {
      await markAsRead(id)
      router.refresh()
    })
  }

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      await markAllAsRead()
      router.refresh()
    })
  }

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all notifications?')) {
      startTransition(async () => {
        await clearAllNotifications()
        router.refresh()
      })
    }
  }

  if (initialNotifications.length === 0) {
    return (
      <div className="glass rounded-[2rem] p-12 text-center flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6 shadow-inner">
          <BellRing className="w-10 h-10 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">You're all caught up!</h3>
        <p className="text-slate-500 dark:text-slate-400">No new notifications right now. Check back later.</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between mb-8 pb-6 border-b border-slate-200 dark:border-slate-800/50 gap-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          Your Feed
        </h2>
        
        <div className="flex gap-3">
          <button 
            onClick={handleMarkAllAsRead}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/20 dark:hover:text-brand-400 border border-slate-200 dark:border-slate-700/50 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">Mark all read</span>
          </button>
          
          <button 
            onClick={handleClearAll}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/50 dark:bg-slate-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-slate-200 dark:border-slate-700/50 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {initialNotifications.map(notification => (
          <div 
            key={notification.id} 
            className={`p-5 rounded-2xl border transition-all duration-300 ${
              notification.isRead 
                ? 'bg-transparent border-slate-200 dark:border-slate-800/50 opacity-70' 
                : 'bg-white dark:bg-slate-900/80 border-brand-100 dark:border-brand-900/30 shadow-lg shadow-brand-500/5 transform hover:-translate-y-1'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl flex-shrink-0 ${
                notification.isRead
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  : 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
              }`}>
                <BellRing className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className={`font-bold truncate text-lg ${notification.isRead ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    {notification.title}
                  </h4>
                  {!notification.isRead && (
                    <button 
                      onClick={() => handleMarkAsRead(notification.id)}
                      disabled={isPending}
                      className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors flex-shrink-0"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <p className={`text-sm mb-3 line-clamp-2 ${notification.isRead ? 'text-slate-500 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>
                  {notification.body}
                </p>
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </div>
                  
                  {notification.link && (
                    <a 
                      href={notification.link} 
                      className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:underline"
                    >
                      View Details →
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
