'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Settings, ShieldAlert, ArrowRightCircle } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

export function AdminSettingsClient() {
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

  if (loading) return <div className="p-10 text-center animate-pulse"><div className="w-10 h-10 border-4 border-admin-purple border-t-transparent rounded-full animate-spin mx-auto"></div></div>

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      <AdminPageHeader
        icon={Settings}
        title="System Settings"
        subtitle="Manage global application configurations"
      />

      <div className="glass p-8 md:p-12 rounded-[2rem] border border-white/60 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 shadow-xl">
        <div className="flex flex-col md:flex-row gap-12">
          
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-orange-500" />
                Semester Transition
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed">
                Updating the current semester will archive the previous semester's routines, exams, and study groups. 
                They will be hidden from the active view and auto-deleted in 2 months. <strong>Courses, Polls, and Announcements are NOT deleted.</strong>
              </p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-500/20 p-5 rounded-2xl">
              <h4 className="text-sm font-black text-orange-800 dark:text-orange-400 uppercase tracking-widest mb-3">Naming Guidelines</h4>
              <ul className="text-sm text-orange-700 dark:text-orange-300 font-medium space-y-2 list-disc list-inside">
                <li><span className="font-bold">Odd Semester:</span> Winter</li>
                <li><span className="font-bold">Even Semester:</span> Summer</li>
                <li>Format example: <strong>1-2 (1st year, 2nd semester)</strong></li>
              </ul>
            </div>
          </div>

          <div className="flex-1">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Current Active Semester</label>
                <div className="text-3xl font-black text-admin-purple dark:text-indigo-400">
                  {currentSemester || 'Not Set'}
                </div>
              </div>

              <hr className="border-slate-100 dark:border-slate-800" />

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">New Semester Code</label>
                <input
                  type="text"
                  value={newSemester}
                  onChange={(e) => setNewSemester(e.target.value)}
                  placeholder="e.g. 2-1"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-admin-purple focus:border-admin-purple transition-all font-semibold outline-none"
                />
              </div>

              <button
                onClick={() => setConfirmOpen(true)}
                disabled={!newSemester.trim() || newSemester === currentSemester}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowRightCircle className="w-5 h-5" />
                Initialize Next Semester
              </button>
            </div>
          </div>
          
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSemesterSwitch}
        message={`Are you absolutely sure you want to transition the entire platform to "${newSemester}"? This will archive ALL current routines, exams, and study groups.`}
        loading={submitting}
      />
    </div>
  )
}
