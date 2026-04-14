"use client"

import { useState, useRef, useEffect } from 'react'
import { LogOut, User, Settings, Moon, Sun } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import Link from 'next/link'

export function ProfileDropdown({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        title="User Profile" 
        className="flex items-center gap-3 p-1.5 pr-4 rounded-[1.25rem] bg-white/60 hover:bg-white shadow-sm border border-white/60 hover:border-brand-200 transition-all hover:scale-105 active:scale-95 group"
      >
        <div className="relative">
          <img
            className="h-10 w-10 rounded-[1rem] bg-slate-100 object-cover shadow-sm group-hover:shadow-md transition-shadow"
            src={user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || "Student"}&backgroundColor=f0fdfa&textColor=0d9488`}
            alt="User Avatar"
          />
          <div className="absolute -bottom-1 -right-1 p-[2px] bg-white rounded-full">
             <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-black text-slate-800 leading-tight">{user?.name?.split(' ')[0] || 'User'}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Class Rep' : 'Student'}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-[100] animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{user?.name}</p>
            <p className="text-xs font-medium text-slate-500 truncate">{user?.email}</p>
          </div>
          
          <Link 
            href="/profile" 
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <User className="w-4 h-4" />
            My Profile
          </Link>
          
          <Link 
            href={(user?.role === 'admin' || user?.role === 'super_admin') ? "/admin/settings" : "/settings"} 
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          
          <div className="px-4 py-2 flex items-center justify-between text-sm font-semibold text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-3">
              {mounted && theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              Dark Mode
            </div>
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${theme === 'dark' ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`}
              role="switch"
              aria-checked={theme === 'dark'}
            >
               <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${theme === 'dark' ? 'translate-x-2' : '-translate-x-2'}`} />
            </button>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
          
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
