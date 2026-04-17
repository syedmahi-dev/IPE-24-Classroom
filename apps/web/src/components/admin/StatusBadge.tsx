'use client'

import { Check, AlertCircle, Clock, X, Eye } from 'lucide-react'

type StatusType = 'active' | 'draft' | 'pending' | 'archived' | 'completed' | 'failed' | 'published'
type TypeVariant = 'exam' | 'file' | 'general' | 'routine' | 'poll' | 'announcement'

interface StatusBadgeProps {
  status: StatusType
  className?: string
}

interface TypeBadgeProps {
  type: TypeVariant
  className?: string
}

const statusConfig = {
  active: {
    color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-100',
    icon: Check,
    label: 'Active',
    dotColor: 'bg-emerald-500',
  },
  draft: {
    color: 'from-slate-500/20 to-slate-600/10 border-slate-500/20 text-slate-300',
    icon: Clock,
    label: 'Draft',
    dotColor: 'bg-slate-500',
  },
  pending: {
    color: 'from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-100',
    icon: Clock,
    label: 'Pending',
    dotColor: 'bg-amber-500',
  },
  archived: {
    color: 'from-slate-500/20 to-slate-600/10 border-slate-500/20 text-slate-300',
    icon: X,
    label: 'Archived',
    dotColor: 'bg-slate-500',
  },
  completed: {
    color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-100',
    icon: Check,
    label: 'Completed',
    dotColor: 'bg-emerald-500',
  },
  failed: {
    color: 'from-red-500/20 to-red-600/10 border-red-500/20 text-red-100',
    icon: AlertCircle,
    label: 'Failed',
    dotColor: 'bg-red-500',
  },
  published: {
    color: 'from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-100',
    icon: Eye,
    label: 'Published',
    dotColor: 'bg-blue-500',
  },
}

const typeConfig = {
  exam: {
    color: 'from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-100',
    icon: '📝',
    label: 'Exam',
    dotColor: 'bg-blue-500',
  },
  file: {
    color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-100',
    icon: '📄',
    label: 'File',
    dotColor: 'bg-emerald-500',
  },
  general: {
    color: 'from-slate-500/20 to-slate-600/10 border-slate-500/20 text-slate-300',
    icon: '📢',
    label: 'General',
    dotColor: 'bg-slate-500',
  },
  routine: {
    color: 'from-purple-500/20 to-purple-600/10 border-purple-500/20 text-purple-100',
    icon: '⏰',
    label: 'Routine',
    dotColor: 'bg-purple-500',
  },
  poll: {
    color: 'from-pink-500/20 to-pink-600/10 border-pink-500/20 text-pink-100',
    icon: '🗳️',
    label: 'Poll',
    dotColor: 'bg-pink-500',
  },
  announcement: {
    color: 'from-orange-500/20 to-orange-600/10 border-orange-500/20 text-orange-100',
    icon: '📣',
    label: 'Announcement',
    dotColor: 'bg-orange-500',
  },
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-gradient-to-br text-xs font-bold uppercase tracking-wider ${config.color} ${className}`}>
      <div className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`} />
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span>{config.label}</span>
    </div>
  )
}

export function TypeBadge({ type, className = '' }: TypeBadgeProps) {
  const config = typeConfig[type]

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-gradient-to-br text-xs font-bold uppercase tracking-wider ${config.color} ${className}`}>
      <span className="text-sm">{config.icon}</span>
      <span>{config.label}</span>
    </div>
  )
}

// Utility component for role badges
export function RoleBadge({ role, className = '' }: { role: string; className?: string }) {
  const roleConfig = {
    admin: {
      color: 'from-purple-500/20 to-purple-600/10 border-purple-500/20 text-purple-100',
      label: 'Admin',
    },
    cr: {
      color: 'from-pink-500/20 to-pink-600/10 border-pink-500/20 text-pink-100',
      label: 'Class Rep',
    },
    student: {
      color: 'from-slate-500/20 to-slate-600/10 border-slate-500/20 text-slate-300',
      label: 'Student',
    },
    super_admin: {
      color: 'from-red-500/20 to-red-600/10 border-red-500/20 text-red-100',
      label: 'Super Admin',
    },
  }

  const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.student

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-gradient-to-br text-xs font-bold uppercase tracking-wider ${config.color} ${className}`}>
      <span className="w-2 h-2 rounded-full bg-current opacity-60" />
      <span>{config.label}</span>
    </div>
  )
}
