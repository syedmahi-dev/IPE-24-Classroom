"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Megaphone, Calendar, MessageCircle, User } from "lucide-react"

const MOBILE_NAV = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/announcements', label: 'Updates', icon: Megaphone },
  { href: '/routine', label: 'Routine', icon: Calendar },
  { href: '/chat', label: 'AI Chat', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: User },
]

const ADMIN_MOBILE_NAV = [
  { href: '/admin', label: 'Admin', icon: LayoutDashboard },
  { href: '/admin/announcements', label: 'Manage', icon: Megaphone },
  { href: '/routine', label: 'Routine', icon: Calendar },
  { href: '/resources', label: 'Files', icon: Calendar },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: User },
]

export function MobileBottomNav({ role }: { role: string }) {
  const pathname = usePathname()
  const links = role === "admin" || role === "super_admin" ? ADMIN_MOBILE_NAV : MOBILE_NAV

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-800/60 pb-safe">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {links.map((link) => {
          const isActive = pathname === link.href || 
            (link.href !== '/dashboard' && link.href !== '/admin' && pathname.startsWith(link.href))
          const Icon = link.icon

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[3rem] py-1.5 px-3 rounded-2xl transition-all duration-200 press-scale ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-400 dark:text-slate-500 active:text-slate-600 dark:active:text-slate-300'
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all duration-300 ease-spring ${
                isActive ? 'bg-brand-50 dark:bg-brand-900/20 scale-110 shadow-sm shadow-brand-500/10' : ''
              }`}>
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? '' : ''}`} />
                {isActive && (
                  <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500 animate-scale-in" />
                )}
              </div>
              <span className={`text-[10px] font-bold leading-none transition-colors duration-200 ${
                isActive ? 'text-brand-600 dark:text-brand-400' : ''
              }`}>
                {link.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
