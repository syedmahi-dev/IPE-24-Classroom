'use client'

import { Calendar, AlertTriangle, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'

type WeekTypeIndicatorProps = {
  weekType: 'A' | 'B' | null
  workingWeekNumber: number | null
  isSkipped: boolean
  studentGroup?: string | null
  className?: string
}

function getWeekLabel(weekType: 'A' | 'B', studentGroup?: string | null): { sublabel: string; bgClass: string; textClass: string; dotClass: string } {
  // G1 (EVEN): Type A = Heavy (4 labs), Type B = Light (3 labs)
  // G2 (ODD):  Type A = Light (3 labs), Type B = Heavy (4 labs)
  const isHeavy = studentGroup === 'ODD' ? weekType === 'B' : weekType === 'A'

  return isHeavy
    ? {
        sublabel: 'Heavy Lab Week',
        bgClass: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50',
        textClass: 'text-emerald-700 dark:text-emerald-400',
        dotClass: 'bg-emerald-500',
      }
    : {
        sublabel: 'Light Lab Week',
        bgClass: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50',
        textClass: 'text-blue-700 dark:text-blue-400',
        dotClass: 'bg-blue-500',
      }
}

export function WeekTypeIndicator({ weekType, workingWeekNumber, isSkipped, studentGroup, className }: WeekTypeIndicatorProps) {
  if (isSkipped) {
    return (
      <div className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold border shadow-sm',
        'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
        className,
      )}>
        <SkipForward className="w-4 h-4" />
        Week Skipped
      </div>
    )
  }

  if (!weekType) {
    return (
      <div className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold border shadow-sm',
        'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/50',
        className,
      )}>
        <AlertTriangle className="w-4 h-4" />
        Week not configured
      </div>
    )
  }

  const config = getWeekLabel(weekType, studentGroup)

  return (
    <div className={cn(
      'inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl text-sm font-bold border shadow-sm',
      config.bgClass,
      config.textClass,
      className,
    )}>
      <span className={cn('w-2.5 h-2.5 rounded-full animate-pulse', config.dotClass)} />
      <Calendar className="w-4 h-4" />
      <span>Type {weekType}</span>
      <span className="text-[10px] font-semibold opacity-70 uppercase tracking-wider">
        {config.sublabel}
      </span>
      {workingWeekNumber !== null && (
        <span className="text-[10px] font-bold opacity-50">
          W{workingWeekNumber}
        </span>
      )}
    </div>
  )
}
