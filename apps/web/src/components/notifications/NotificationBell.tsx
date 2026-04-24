"use client"

import { Bell } from "lucide-react"
import Link from "next/link"

export function NotificationBell({ count = 0 }: { count?: number }) {
  return (
    <Link 
      href="/notifications" 
      title="Notifications" 
      aria-label="Notifications" 
      className="relative p-3.5 md:p-5 rounded-2xl md:rounded-[2rem] bg-white/60 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white dark:hover:bg-slate-900 border border-white/60 dark:border-white/10 shadow-sm transition-all hover:scale-110 active:scale-95 group cursor-pointer"
    >
      <Bell className="h-6 w-6 md:h-8 md:w-8 group-hover:animate-[wiggle_1s_ease-in-out_infinite] transition-all" />
      {count > 0 && (
        <span className="absolute top-3 right-3 md:top-5 md:right-5 flex h-2.5 w-2.5 md:h-3.5 md:w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3.5 md:w-3.5 bg-red-500 border-2 border-white dark:border-slate-900 shadow-sm"></span>
        </span>
      )}
    </Link>
  )
}
