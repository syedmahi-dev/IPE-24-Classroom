'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  SkipForward,
  Undo2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type RoutineWeek = {
  id: string
  calendarWeekStart: string
  workingWeekNumber: number | null
  weekType: 'A' | 'B' | null
  isSkipped: boolean
  skippedReason: string | null
  markedAt: string | null
}

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateFull(d: string | Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function WeekManager() {
  const [weeks, setWeeks] = useState<RoutineWeek[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [skipReason, setSkipReason] = useState('')
  const [skipTarget, setSkipTarget] = useState<string | null>(null)

  // Show 8 weeks starting from 2 weeks ago
  const [rangeStart, setRangeStart] = useState(() => {
    const d = getMonday(new Date())
    d.setDate(d.getDate() - 14)
    return d
  })

  const fetchWeeks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const from = rangeStart.toISOString().split('T')[0]
      const to = new Date(rangeStart)
      to.setDate(to.getDate() + 8 * 7) // 8 weeks ahead
      const res = await fetch(`/api/v1/routine-weeks?from=${from}&to=${to.toISOString().split('T')[0]}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const result = await res.json()
      if (result.success) setWeeks(result.data)
    } catch {
      setError('Failed to load week data')
    } finally {
      setLoading(false)
    }
  }, [rangeStart])

  useEffect(() => {
    fetchWeeks()
  }, [fetchWeeks])

  const handleSkip = async (weekStart: string) => {
    setActionLoading(weekStart)
    try {
      const res = await fetch('/api/v1/routine-weeks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'skip',
          calendarWeekStart: weekStart,
          skippedReason: skipReason || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      setSkipTarget(null)
      setSkipReason('')
      await fetchWeeks()
    } catch {
      setError('Failed to skip week')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnskip = async (weekStart: string) => {
    setActionLoading(weekStart)
    try {
      const res = await fetch('/api/v1/routine-weeks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unskip',
          calendarWeekStart: weekStart,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      await fetchWeeks()
    } catch {
      setError('Failed to unskip week')
    } finally {
      setActionLoading(null)
    }
  }

  const shiftRange = (direction: -1 | 1) => {
    setRangeStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + direction * 7 * 4)
      return d
    })
  }

  // Build full week list (fill gaps with placeholder)
  const currentMonday = getMonday(new Date())
  const allWeeks: (RoutineWeek | { placeholder: true; calendarWeekStart: string })[] = []
  for (let i = 0; i < 10; i++) {
    const weekStart = new Date(rangeStart)
    weekStart.setDate(weekStart.getDate() + i * 7)
    const iso = weekStart.toISOString()
    const existing = weeks.find(
      (w) => new Date(w.calendarWeekStart).toDateString() === weekStart.toDateString()
    )
    if (existing) {
      allWeeks.push(existing)
    } else {
      allWeeks.push({ placeholder: true, calendarWeekStart: iso })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Week Manager</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Skip vacation weeks to keep the A↔B lab rotation correct.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftRange(-1)}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <button
            onClick={() => shiftRange(1)}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs font-bold">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-slate-600 dark:text-slate-400">Type A (Heavy Labs)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-slate-600 dark:text-slate-400">Type B (Light Labs)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-slate-600 dark:text-slate-400">Skipped</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span className="text-slate-600 dark:text-slate-400">Not Yet Configured</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/50">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm font-bold text-red-600 dark:text-red-400">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {allWeeks.map((week) => {
            const weekStart = new Date(week.calendarWeekStart)
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekEnd.getDate() + 4)
            const isCurrentWeek = weekStart.toDateString() === currentMonday.toDateString()
            const isPast = weekStart < currentMonday && !isCurrentWeek
            const isPlaceholder = 'placeholder' in week

            const isSkipped = !isPlaceholder && (week as RoutineWeek).isSkipped
            const weekType = !isPlaceholder ? (week as RoutineWeek).weekType : null
            const workingNum = !isPlaceholder ? (week as RoutineWeek).workingWeekNumber : null
            const reason = !isPlaceholder ? (week as RoutineWeek).skippedReason : null
            const weekStartIso = weekStart.toISOString().split('T')[0]

            return (
              <div
                key={week.calendarWeekStart}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-2xl border transition-all',
                  isCurrentWeek && 'ring-2 ring-emerald-500 shadow-lg shadow-emerald-900/10',
                  isSkipped
                    ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40'
                    : weekType === 'A'
                    ? 'bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30'
                    : weekType === 'B'
                    ? 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-800/30'
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50',
                  isPast && 'opacity-60',
                )}
              >
                {/* Week type dot */}
                <div className={cn(
                  'w-3 h-3 rounded-full flex-shrink-0',
                  isSkipped ? 'bg-amber-500' :
                  weekType === 'A' ? 'bg-emerald-500' :
                  weekType === 'B' ? 'bg-blue-500' :
                  'bg-slate-300 dark:bg-slate-600',
                )} />

                {/* Date range */}
                <div className="min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                      {formatDate(weekStart)} – {formatDate(weekEnd)}
                    </span>
                    {isCurrentWeek && (
                      <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-lg uppercase tracking-wider">
                        Now
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {formatDateFull(weekStart)}
                  </span>
                </div>

                {/* Status */}
                <div className="flex-1 flex items-center gap-2">
                  {isSkipped ? (
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">Skipped</span>
                      {reason && (
                        <span className="text-xs text-amber-500/70 dark:text-amber-400/50">— {reason}</span>
                      )}
                    </div>
                  ) : weekType ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={cn('w-4 h-4', weekType === 'A' ? 'text-emerald-500' : 'text-blue-500')} />
                      <span className={cn('text-sm font-bold', weekType === 'A' ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400')}>
                        Type {weekType}
                      </span>
                      <span className="text-xs text-slate-400">
                        — Working Week #{workingNum} ({weekType === 'A' ? 'Heavy Labs' : 'Light Labs'})
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500">
                      Not configured — will auto-assign when reached
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isSkipped ? (
                    <button
                      onClick={() => handleUnskip(weekStartIso)}
                      disabled={actionLoading === weekStartIso}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === weekStartIso ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Undo2 className="w-3.5 h-3.5" />
                      )}
                      Undo Skip
                    </button>
                  ) : skipTarget === weekStartIso ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={skipReason}
                        onChange={(e) => setSkipReason(e.target.value)}
                        placeholder="Reason (optional)"
                        className="w-40 px-3 py-1.5 rounded-xl text-xs border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <button
                        onClick={() => handleSkip(weekStartIso)}
                        disabled={actionLoading === weekStartIso}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === weekStartIso ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Confirm'
                        )}
                      </button>
                      <button
                        onClick={() => { setSkipTarget(null); setSkipReason('') }}
                        className="px-2 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSkipTarget(weekStartIso)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      Skip
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
