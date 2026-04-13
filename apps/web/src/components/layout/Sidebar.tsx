import Link from "next/link"
import { STUDENT_NAV, ADMIN_NAV } from "@/config/navigation"
import { LayoutDashboard, Calendar, FolderOpen, FileText, BarChart2, Users, MessageCircle, User, Megaphone, Upload, BookOpen, Vote, Brain, ScrollText } from "lucide-react"

const ICONS = {
  LayoutDashboard, Calendar, FolderOpen, FileText, BarChart2, Users, MessageCircle, User, Megaphone, Upload, BookOpen, Vote, Brain, ScrollText
} as any

export function Sidebar({ role }: { role: string }) {
  const links = role === "admin" || role === "super_admin" ? ADMIN_NAV : STUDENT_NAV

  return (
    <aside className="w-68 glass border-r border-white/40 hidden md:flex flex-col relative z-20 m-4 rounded-3xl overflow-hidden self-stretch">
      <div className="h-20 flex items-center px-8 border-b border-gray-200/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/30">
            I
          </div>
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 tracking-tight">
            IPE-24
          </h2>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 scrollbar-hide">
        {links.map((link) => {
          const l = link as any
          const Icon = ICONS[link.icon]
          const isLocked = l.superAdminOnly && role !== "super_admin"
          
          return (
            <Link
              data-testid={`nav-${link.label.replace(/\s+/g, '-')}`}
              key={link.href}
              href={isLocked ? '#' : link.href}
              aria-disabled={isLocked ? "true" : undefined}
              title={isLocked ? "Only the CR (super_admin) can access this." : undefined}
              className={`flex items-center px-4 py-3 text-[15px] font-medium rounded-2xl transition-all duration-300 ${
                isLocked 
                  ? 'text-slate-400 cursor-not-allowed opacity-50 bg-slate-50/50' 
                  : l.superAdminOnly 
                    ? 'text-slate-600 hover:text-amber-700 hover:bg-amber-50 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] group' 
                    : 'text-slate-600 hover:text-brand-700 hover:bg-brand-50 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] group'
              }`}
            >
              {Icon && (
                <Icon className={`mr-3.5 flex-shrink-0 h-[22px] w-[22px] transition-transform duration-300 group-hover:scale-110 ${
                  isLocked ? 'text-slate-300' : 
                  l.superAdminOnly ? 'text-amber-400 group-hover:text-amber-600' : 'text-slate-400 group-hover:text-brand-500'
                }`} />
              )}
              {link.label}
            </Link>
          )
        })}
      </nav>
      {/* Subtle bottom decoration */}
      <div className="h-16 border-t border-gray-200/50 bg-gradient-to-b from-transparent to-slate-50/30 flex items-center px-8">
         <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">v2.0.0 Pro</span>
      </div>
    </aside>
  )
}
