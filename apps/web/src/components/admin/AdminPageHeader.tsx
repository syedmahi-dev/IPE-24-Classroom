'use client'

import { LucideIcon } from 'lucide-react'

interface AdminPageHeaderProps {
  icon: LucideIcon
  title: string
  subtitle: string
  actionLabel?: string
  onAction?: () => void
  actionIcon?: LucideIcon
  badge?: string
}

export function AdminPageHeader({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  badge,
}: AdminPageHeaderProps) {
  return (
    <div className="relative group overflow-hidden rounded-[2.5rem]">
      <div className="absolute inset-0 bg-gradient-to-r from-admin-purple to-indigo-600 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
      <div className="relative glass p-8 md:p-10 flex flex-col md:flex-row items-center md:items-start gap-6 z-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-admin-purple to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-admin-purple/30 transform -rotate-3 hover:rotate-0 transition-transform duration-500 flex-shrink-0">
          <Icon className="w-8 h-8" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">{title}</h1>
            {badge && (
              <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 border border-amber-200 shadow-sm">
                {badge}
              </span>
            )}
          </div>
          <p className="text-slate-500 font-medium text-base mt-2 max-w-xl leading-relaxed">{subtitle}</p>
        </div>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="flex items-center gap-2.5 px-7 py-4 bg-gradient-to-r from-admin-purple to-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-admin-purple/25 hover:shadow-2xl hover:shadow-admin-purple/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 whitespace-nowrap"
          >
            {ActionIcon && <ActionIcon className="w-5 h-5" />}
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
