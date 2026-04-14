'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock, Loader2, MapPin, Sparkles } from 'lucide-react'

export default function RoutinePage() {
  const [routines, setRoutines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchRoutine = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/routine?page=${page}&limit=50`)
      if (!res.ok) throw new Error('Network error')
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message || 'Failed')
      setRoutines(result.data)
      setTotalPages(result.meta.totalPages)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoutine()
  }, [page])

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="relative group overflow-hidden rounded-[2.5rem]">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-500 blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
        <div className="relative glass p-10 md:p-14 flex flex-col items-center justify-center text-center z-10">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/40 mb-6 group-hover:scale-110 transition-transform duration-500">
             <Calendar className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Class Routine</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mt-3 max-w-xl">
            Live synchronization with the Google Sheet. Accurate to the minute.
          </p>
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
            const dayClasses = routines.filter((r: any) => r.dayOfWeek === dayLabel)
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
                    dayClasses.map((cls: any, i) => (
                      <div key={i} className="bg-white/60 dark:bg-slate-800/60 rounded-2xl p-4 border border-white dark:border-slate-700/50 hover:border-emerald-200 dark:hover:border-emerald-500/50 hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <h4 className="font-black text-slate-800 dark:text-slate-100 text-lg mb-1 leading-tight">{cls.courseCode}</h4>
                        <div className="space-y-1.5 mt-3">
                           <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                             <Clock className="w-3.5 h-3.5 text-emerald-500" />
                             {cls.startTime} - {cls.endTime}
                           </div>
                           <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                             <MapPin className="w-3.5 h-3.5 text-amber-500" />
                             {cls.room}
                           </div>
                        </div>
                      </div>
                    ))
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
