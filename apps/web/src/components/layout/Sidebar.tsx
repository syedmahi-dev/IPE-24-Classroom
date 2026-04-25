"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { STUDENT_NAV, ADMIN_NAV } from "@/config/navigation"
import { LayoutDashboard, Calendar, CalendarClock, FolderOpen, FileText, BarChart2, Users, MessageCircle, User, Megaphone, Upload, BookOpen, Vote, Brain, ScrollText, Settings, HardDrive, X } from "lucide-react"
import gsap from 'gsap'

const ICONS = {
  LayoutDashboard, Calendar, CalendarClock, FolderOpen, FileText, BarChart2, Users, MessageCircle, User, Megaphone, Upload, BookOpen, Vote, Brain, ScrollText, Settings, HardDrive
} as any

import Image from 'next/image'

export function Sidebar({ role, mobileOpen, onMobileClose }: { role: string; mobileOpen?: boolean; onMobileClose?: () => void }) {
  const pathname = usePathname()
  const links = role === "admin" || role === "super_admin" ? ADMIN_NAV : STUDENT_NAV
  const mobileDrawerRef = useRef<HTMLElement>(null)
  const mobileBackdropRef = useRef<HTMLDivElement>(null)

  // Close mobile sidebar on route change
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // GSAP mobile drawer animation
  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (mobileOpen) {
      if (mobileBackdropRef.current) {
        gsap.fromTo(mobileBackdropRef.current,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: reduced ? 0 : 0.25, ease: 'power2.out' }
        )
      }
      if (mobileDrawerRef.current) {
        gsap.fromTo(mobileDrawerRef.current,
          { x: '-100%' },
          { x: '0%', duration: reduced ? 0 : 0.3, ease: 'power3.out' }
        )
      }
    }
  }, [mobileOpen])

  const sidebarContent = (
    <>
      <div className="h-24 flex items-center px-8 border-b border-white/40 relative z-10">
        <Link href="/dashboard" className="flex items-center gap-4 group cursor-pointer">
          <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden shadow-xl shadow-brand-500/20 dark:shadow-brand-500/10 transform group-hover:scale-105 transition-all duration-300 bg-white dark:bg-slate-800 p-1">
            <Image 
              src="/iut-logo.svg"
              unoptimized 
              alt="IUT Logo" 
              fill
              className="object-contain"
              priority={true}
            />
          </div>
          <div>
            <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-300 tracking-tight leading-tight group-hover:text-brand-500 transition-colors">
              IPE-24
            </h2>
            <div className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">Classroom</div>
          </div>
        </Link>
        {/* Close button for mobile */}
        {onMobileClose && (
          <button 
            onClick={onMobileClose}
            className="ml-auto md:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-8 px-5 space-y-1 relative z-10 scrollbar-hide">
        {(() => {
          // Group navigation items by section (for admin with student features)
          const groupedLinks: { [key: string]: typeof links } = {}
          links.forEach(link => {
            const section = (link as any).section || 'Main'
            if (!groupedLinks[section]) groupedLinks[section] = []
            groupedLinks[section].push(link)
          })

          return Object.entries(groupedLinks).map(([section, sectionLinks]) => (
            <div key={section} className="space-y-2">
              {/* Section header (only if multiple sections) */}
              {Object.keys(groupedLinks).length > 1 && (
                <div className="px-4 py-2 mt-4 first:mt-0 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {section}
                </div>
              )}
              {/* Navigation links in section */}
              {sectionLinks.map((link) => {
                const l = link as any
                const Icon = ICONS[link.icon]
                const isLocked = l.superAdminOnly && role !== "super_admin"
                const isActive = pathname === link.href
                
                return (
                  <Link
                    key={link.href}
                    href={isLocked ? '#' : link.href}
                    data-testid={`nav-${link.label.replace(/\s+/g, '-')}`}
                    aria-disabled={isLocked}
                    aria-current={isActive ? 'page' : undefined}
                    tabIndex={isLocked ? -1 : 0}
                    className={`flex items-center px-4 py-3.5 text-[15px] font-bold rounded-2xl transition-all duration-300 relative group overflow-hidden focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:outline-none cursor-pointer ${
                      isLocked 
                        ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50 bg-slate-50/50 dark:bg-slate-900/30 grayscale' 
                        : isActive
                          ? 'text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 shadow-sm border border-brand-100 dark:border-brand-900 hover:shadow-md'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:shadow-sm border border-transparent hover:border-white/40 dark:hover:border-white/10 cursor-pointer'
                    }`}
                  >
                    {isActive && !isLocked && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-r-full bg-brand-500" />
                    )}
                    {Icon && (
                      <Icon className={`mr-4 flex-shrink-0 h-5 w-5 transition-transform duration-300 ${
                        isActive ? 'scale-110 text-brand-600 dark:text-brand-400' : 'group-hover:scale-110 group-hover:text-brand-500 dark:group-hover:text-brand-400 text-slate-400 dark:text-slate-500'
                      }`} />
                    )}
                    <span className="relative z-10">{link.label}</span>
                    {l.superAdminOnly && !isLocked && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" title="SuperAdmin Only" />
                    )}
                  </Link>
                )
              })}
            </div>
          ))
        })()}
      </nav>

      {/* Footer Area */}
      <div className="h-20 border-t border-white/40 bg-gradient-to-b from-transparent to-white/30 flex items-center justify-between px-8 relative z-10">
         <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Developed By Hunterlog2</span>
         <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" title="System Online" />
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-72 glass border-r border-white/40 dark:border-white/10 hidden md:flex flex-col relative z-30 m-6 rounded-[2.5rem] overflow-hidden self-stretch shadow-2xl shadow-brand-900/5 bg-slate-50 dark:bg-slate-900/50">
        {/* Mesh Gradient Background */}
        <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div 
            ref={mobileBackdropRef}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden invisible"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <aside ref={mobileDrawerRef} role="dialog" aria-modal="true" className="fixed inset-y-0 left-0 w-80 max-w-[85vw] flex flex-col z-50 md:hidden bg-slate-50 dark:bg-slate-900 shadow-2xl -translate-x-full">
            <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
