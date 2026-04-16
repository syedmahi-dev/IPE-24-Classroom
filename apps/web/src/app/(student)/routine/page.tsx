'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock, Loader2, MapPin, Sparkles, AlertTriangle, Plus as PlusIcon, RefreshCw, FlaskConical, Users2 } from 'lucide-react'

type RoutineEntry = {
  id: string
  courseCode: string
  courseName: string | null
  dayOfWeek: string
  startTime: string
  endTime: string
  room: string
  teacher: string | null
  targetGroup: string
  isLab: boolean
  status: 'NORMAL' | 'CANCELLED' | 'ROOM_CHANGED' | 'TIME_CHANGED' | 'MAKEUP'
  reason?: string | null
  originalRoom?: string
  originalStartTime?: string
  originalEndTime?: string
}

const statusConfig = {
  NORMAL: { badge: '', bgClass: '' },
  CANCELLED: { badge: 'Cancelled', bgClass: 'opacity-50 line-through-container' },
  ROOM_CHANGED: { badge: 'Room Changed', bgClass: 'ring-2 ring-amber-400/50' },
  TIME_CHANGED: { badge: 'Time Changed', bgClass: 'ring-2 ring-cyan-400/50' },
  MAKEUP: { badge: 'Makeup', bgClass: 'ring-2 ring-emerald-400/50' },
}

const statusBadgeStyle: Record<string, string> = {
  CANCELLED: 'bg-red-500 text-white',
  ROOM_CHANGED: 'bg-amber-500 text-white',
  TIME_CHANGED: 'bg-cyan-500 text-white',
  MAKEUP: 'bg-emerald-500 text-white',
}

const groupLabel: Record<string, string> = {
  ODD: 'Odd Group',
  EVEN: 'Even Group',
}

export default function RoutinePage() {
  const [routines, setRoutines] = useState<RoutineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studentGroup, setStudentGroup] = useState<string | null>(null)

  const fetchRoutine = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch with week context for merged view (overrides included)
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/v1/routine?week=${today}`)
      if (!res.ok) throw new Error('Network error')
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message || 'Failed')
      setRoutines(result.data)
      setStudentGroup(result.meta?.studentGroup || null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoutine()
  }, [])

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="relative group overflow-hidden rounded-[2.5rem]">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-500 blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
        <div className="relative glass p-10 md:p-14 flex flex-col items-center justify-center text-center z-10">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/40 mb-6 group-hover:scale-110 transition-transform duration-500">
             <Calendar className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Class Routine</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mt-3 max-w-xl">
            Your personalized weekly schedule with live updates.
          </p>

          {/* Lab Group Indicator */}
          {studentGroup && (
            <div className="mt-4 flex items-center gap-2">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold border shadow-sm ${
                studentGroup === 'ODD'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50'
                  : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/50'
              }`}>
                <Users2 className="w-4 h-4" />
                {groupLabel[studentGroup] || studentGroup} Lab
              </span>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Syncing Schedule...</p>
        </div>
      )}

      {error && <div className="text-center p-6 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-[2rem] font-bold">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {days.map(dayLabel => {
            const dayClasses = routines.filter((r) => r.dayOfWeek === dayLabel)
            const isToday = currentDay === dayLabel

            return (
              <div key={dayLabel} className={`glass rounded-[2rem] overflow-hidden flex flex-col ${isToday ? 'ring-2 ring-emerald-500 shadow-xl shadow-emerald-900/10 dark:shadow-emerald-900/40 scale-105 z-10' : ''}`}>
                <div className={`p-4 text-center font-black uppercase text-sm tracking-widest ${isToday ? 'bg-emerald-500 text-white' : 'bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/50 text-slate-600 dark:text-slate-300'}`}>
                  {dayLabel} {isToday && <Sparkles className="inline w-4 h-4 ml-1 mb-1" />}
                </div>
                <div className="p-4 space-y-4 flex-1">
                  {dayClasses.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold text-sm py-10">No Classes</div>
                  ) : (
                    dayClasses.map((cls, i) => {
                      const config = statusConfig[cls.status] || statusConfig.NORMAL
                      return (
                        <div key={i} className={`bg-white/60 dark:bg-slate-800/60 rounded-2xl p-4 border border-white dark:border-slate-700/50 hover:shadow-md transition-all group relative overflow-hidden ${config.bgClass}`}>
                          {/* Status left accent bar */}
                          {cls.status === 'CANCELLED' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />}
                          {cls.status === 'MAKEUP' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                          {cls.status === 'ROOM_CHANGED' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />}
                          {cls.status === 'TIME_CHANGED' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500" />}
                          {cls.status === 'NORMAL' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />}

                          {/* Status Badge */}
                          {cls.status !== 'NORMAL' && (
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider mb-2 ${statusBadgeStyle[cls.status] || ''}`}>
                              {config.badge}
                            </span>
                          )}

                          <h4 className={`font-black text-slate-800 dark:text-slate-100 text-lg mb-1 leading-tight ${cls.status === 'CANCELLED' ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                            {cls.courseCode}
                          </h4>
                          {cls.courseName && (
                            <p className={`text-xs text-slate-500 dark:text-slate-400 mb-2 ${cls.status === 'CANCELLED' ? 'line-through' : ''}`}>
                              {cls.courseName}
                            </p>
                          )}

                          <div className="space-y-1.5 mt-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                              <Clock className="w-3.5 h-3.5 text-emerald-500" />
                              {cls.status === 'TIME_CHANGED' && cls.originalStartTime ? (
                                <span>
                                  <span className="line-through text-slate-400 mr-1">{cls.originalStartTime}–{cls.originalEndTime}</span>
                                  <span className="text-cyan-600 dark:text-cyan-400">{cls.startTime}–{cls.endTime}</span>
                                </span>
                              ) : (
                                <span>{cls.startTime} – {cls.endTime}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                              <MapPin className="w-3.5 h-3.5 text-amber-500" />
                              {cls.status === 'ROOM_CHANGED' && cls.originalRoom ? (
                                <span>
                                  <span className="line-through text-slate-400 mr-1">{cls.originalRoom}</span>
                                  <span className="text-amber-600 dark:text-amber-400">{cls.room}</span>
                                </span>
                              ) : (
                                <span>{cls.room}</span>
                              )}
                            </div>
                            {cls.isLab && (
                              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <FlaskConical className="w-3.5 h-3.5" /> Lab
                              </div>
                            )}
                          </div>

                          {/* Reason tooltip */}
                          {cls.reason && (
                            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-2.5 py-1.5 border border-slate-200/50 dark:border-slate-600/30">
                              {cls.reason}
                            </p>
                          )}
                        </div>
                      )
                    })
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
