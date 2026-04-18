'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { GraduationCap, ArrowRightCircle, Loader2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

export function SemesterSettings() {
  const [currentSemester, setCurrentSemester] = useState('')
  const [newSemester, setNewSemester] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    fetch('/api/v1/admin/settings')
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data.currentSemester) {
          setCurrentSemester(res.data.currentSemester)
          setNewSemester(res.data.currentSemester)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSemesterSwitch = async () => {
    if (!newSemester.trim() || newSemester === currentSemester) {
      toast.error('Invalid semester input or semester did not change')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentSemester: newSemester.trim() }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)

      toast.success(result.data.message || 'Semester safely switched and archived')
      setCurrentSemester(newSemester.trim())
      setConfirmOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Operation failed')
    } finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <section className="glass rounded-[2rem] p-8 md:p-10 shadow-sm border border-white/60 dark:border-slate-700/50">
        <div className="flex justify-center p-6"><Loader2 className="animate-spin text-slate-400" /></div>
      </section>
    )
  }

  return (
    <>
      <section className="glass rounded-[2rem] p-8 md:p-10 shadow-sm border border-orange-200/60 dark:border-orange-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
        <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/50">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Semester Transition</h2>
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest">Super Admin Only</span>
          </div>
        </div>

        <p className="text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed relative z-10">
          Updating the current semester will archive the previous semester&apos;s routines, exams, and study groups.
          They will be hidden from the active view and auto-deleted in 2 months. <strong className="text-slate-700 dark:text-slate-300">Courses, Polls, and Announcements are NOT deleted.</strong>
        </p>

        <div className="space-y-5 relative z-10">
          {/* Current semester display */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Current Active Semester</label>
              <div className="text-2xl font-black text-orange-600 dark:text-orange-400">
                {currentSemester || 'Not Set'}
              </div>
            </div>
          </div>

          {/* Naming guidelines */}
          <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-500/20 p-4 rounded-2xl">
            <h4 className="text-xs font-black text-orange-800 dark:text-orange-400 uppercase tracking-widest mb-2">Naming Format</h4>
            <ul className="text-sm text-orange-700 dark:text-orange-300 font-medium space-y-1 list-disc list-inside">
              <li><span className="font-bold">Odd Semester:</span> Winter</li>
              <li><span className="font-bold">Even Semester:</span> Summer</li>
              <li>Format: <strong>1-2</strong> (1st year, 2nd semester)</li>
            </ul>
          </div>

          {/* New semester input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">New Semester Code</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={newSemester}
                onChange={(e) => setNewSemester(e.target.value)}
                placeholder="e.g. 2-1"
                className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-semibold outline-none text-slate-800 dark:text-slate-100"
              />
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={!newSemester.trim() || newSemester === currentSemester}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <ArrowRightCircle className="w-5 h-5" />
                Switch Semester
              </button>
            </div>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSemesterSwitch}
        message={`Are you absolutely sure you want to transition the entire platform to "${newSemester}"? This will archive ALL current routines, exams, and study groups.`}
        loading={submitting}
      />
    </>
  )
}
