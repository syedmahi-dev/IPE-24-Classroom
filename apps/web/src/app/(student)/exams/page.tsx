export const dynamic = 'force-dynamic';
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Calendar, Clock, AlertTriangle, CheckCircle, Search, Loader2, AlertCircle } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

export default function ExamsPage() {
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchExams = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/exams?page=${page}&limit=10`)
      if (!res.ok) throw new Error('Network response was not ok')
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message || 'Failed')
      setExams(result.data)
      setTotalPages(result.meta.totalPages)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchExams()
  }, [fetchExams])

  const upcomingIds = exams.filter((e: any) => new Date(e.examDate) > new Date()).map((e: any) => e.id)
  const nearestExam = exams.find((e: any) => upcomingIds.includes(e.id))

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Hero Section */}
      <div className="relative group overflow-hidden rounded-[2.5rem]">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-orange-600 blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
        <div className="relative glass p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8 z-10">
          <div className="text-center md:text-left space-y-3 flex-1">
             <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white shadow-xl shadow-rose-500/40 transform rotate-3 flex-shrink-0 mx-auto md:mx-0 mb-6">
                <AlertTriangle className="w-8 h-8" />
             </div>
             <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Exam Tracker</h1>
             <p className="text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed">
               {nearestExam ? `Next exam is ${nearestExam.title} for ${nearestExam.course?.code}` : 'No upcoming exams scheduled right now. Relax!'}
             </p>
          </div>

          {nearestExam && (
            <div className="glass p-8 rounded-[2rem] bg-white/60 dark:bg-slate-800/60 border border-white dark:border-slate-700/50 flex flex-col items-center flex-shrink-0 shadow-lg shadow-rose-900/5 dark:shadow-rose-900/20">
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Countdown</div>
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-rose-600 to-orange-600">
                {Math.max(0, differenceInDays(new Date(nearestExam.examDate), new Date()))}
              </div>
              <div className="text-sm font-bold text-slate-600 dark:text-slate-400 mt-1">Days Left</div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="w-10 h-10 text-rose-500 animate-spin mb-4" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Loading Schedule...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-[2rem] text-red-700 dark:text-red-400 font-medium text-center">
          Failed to load exams: {error}
        </div>
      )}

      {/* List */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {exams.map((exam: any) => {
            const isUpcoming = new Date(exam.examDate) > new Date()
            const daysLeft = differenceInDays(new Date(exam.examDate), new Date())
            const isNear = isUpcoming && daysLeft <= 3

            return (
              <div key={exam.id} className="glass rounded-[2rem] p-6 hover:-translate-y-1 transition-all duration-300 group hover:shadow-xl hover:shadow-rose-900/5 dark:hover:shadow-rose-900/20 cursor-default relative overflow-hidden">
                 {isNear && <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500 transform rotate-45 translate-x-8 -translate-y-8" />}
                 {isNear && <AlertTriangle className="absolute top-2 right-2 w-4 h-4 text-white z-10" />}
                 
                 <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {exam.course?.code}
                    </span>
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                      isUpcoming 
                        ? isNear ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                        : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                    }`}>
                      {exam.type}
                    </span>
                 </div>
                 
                 <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-2 leading-tight">{exam.title}</h3>
                 
                 <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                      <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      {format(new Date(exam.examDate), 'MMMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                      <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      {exam.duration} mins • {exam.syllabus}
                    </div>
                 </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center glass p-4 rounded-[2rem] mt-8 shadow-sm">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-6 py-3 bg-white dark:bg-slate-800 font-bold rounded-xl shadow-sm text-slate-600 dark:text-slate-300 disabled:opacity-50">Prev</button>
          <span className="font-bold text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-6 py-3 bg-white dark:bg-slate-800 font-bold rounded-xl shadow-sm text-slate-600 dark:text-slate-300 disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  )
}
