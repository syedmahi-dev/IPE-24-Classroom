'use client'

import { useEffect, useState } from 'react'
import { Clock, MapPin, AlertTriangle, Sparkles, FlaskConical, Loader2, Ban } from 'lucide-react'

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
}

export function RoutineWidget() {
  const [classes, setClasses] = useState<RoutineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [studentGroup, setStudentGroup] = useState<string | null>(null)
  const [weekType, setWeekType] = useState<string | null>(null)
  const [isUpcoming, setIsUpcoming] = useState(false)

  useEffect(() => {
    const fetchTodayRoutine = async () => {
      try {
        // On Sat/Sun, show next Monday's classes
        const now = new Date()
        const day = now.getDay() // 0=Sun, 6=Sat
        const upcoming = day === 0 || day === 6
        if (day === 0) now.setDate(now.getDate() + 1) // Sun → next Mon
        else if (day === 6) now.setDate(now.getDate() + 2) // Sat → next Mon
        // Use local date parts to avoid UTC timezone shift
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        const res = await fetch(`/api/v1/routine?date=${today}`)
        if (!res.ok) return
        const result = await res.json()
        if (result.success) {
          setClasses(result.data)
          setStudentGroup(result.meta?.studentGroup || null)
          setWeekType(result.meta?.weekType || null)
          setIsUpcoming(upcoming)
        }
      } catch {
        // Silent fail — widget is non-critical
      } finally {
        setLoading(false)
      }
    }
    fetchTodayRoutine()
  }, [])

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    )
  }

  const activeClasses = classes.filter(c => c.status !== 'CANCELLED')
  const cancelledCount = classes.filter(c => c.status === 'CANCELLED').length

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
          {isUpcoming ? "Monday\u2019s Classes" : "Today\u2019s Classes"}
        </h3>
        <div className="flex items-center gap-2">
          {studentGroup && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${
              studentGroup === 'ODD'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
            }`}>
              {studentGroup === 'EVEN' ? 'G1' : 'G2'}
            </span>
          )}
          {weekType && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${
              weekType === 'A'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            }`}>
              Type {weekType}
            </span>
          )}
          <span className="text-xs font-bold text-brand-700 dark:text-brand-400 bg-brand-100/50 dark:bg-brand-900/30 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {isUpcoming ? 'Upcoming' : new Date().toLocaleDateString('en-US', { weekday: 'short' })}
          </span>
        </div>
      </div>

      {cancelledCount > 0 && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200/50 dark:border-red-800/50">
          <Ban className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold text-red-600 dark:text-red-400">{cancelledCount} class{cancelledCount > 1 ? 'es' : ''} cancelled today</span>
        </div>
      )}

      {classes.length === 0 ? (
        <div className="py-8 text-center text-sm font-medium text-slate-500 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100/50 dark:border-slate-700/30">
          {isUpcoming ? 'No classes on Monday. Enjoy the weekend!' : 'No classes scheduled for today. Time to relax!'}
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((cls, i) => (
            <div key={i} className={`flex gap-4 group ${cls.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
              <div className="w-16 flex-shrink-0 text-right pt-0.5">
                <div className={`text-sm font-bold ${cls.status === 'CANCELLED' ? 'line-through text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}`}>
                  {cls.startTime}
                </div>
                <div className="text-[11px] font-semibold tracking-wide text-slate-400 dark:text-slate-500 mt-1">
                  {cls.endTime}
                </div>
              </div>
              <div className="w-px bg-slate-200/60 dark:bg-slate-700/60 relative">
                <div className={`absolute top-1.5 -left-[5px] w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 transition-transform ${
                  cls.status === 'CANCELLED' ? 'bg-red-400' :
                  cls.status === 'MAKEUP' ? 'bg-emerald-400' :
                  cls.status === 'ROOM_CHANGED' ? 'bg-amber-400' :
                  'bg-brand-400 group-hover:scale-125'
                }`} />
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-[15px] font-bold transition-colors ${
                    cls.status === 'CANCELLED' ? 'line-through text-slate-400 dark:text-slate-500' :
                    'text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400'
                  }`}>
                    {cls.courseCode}
                  </span>
                  {cls.status === 'CANCELLED' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-red-500 text-white">Off</span>
                  )}
                  {cls.status === 'MAKEUP' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500 text-white">Extra</span>
                  )}
                  {cls.isLab && <FlaskConical className="w-3 h-3 text-emerald-500" />}
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                  <span className="bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">{cls.room}</span>
                  {cls.teacher && (
                    <>
                      <span>•</span>
                      <span>{cls.teacher}</span>
                    </>
                  )}
                </div>
                {cls.reason && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 italic">{cls.reason}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
