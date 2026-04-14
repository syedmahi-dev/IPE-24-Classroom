'use client'

import { useEffect, useState } from 'react'
import { Users, Lock, Globe, Plus, LogOut, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function StudyGroupsPage() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchGroups = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/study-groups?page=${page}&limit=12`)
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)
      setGroups(result.data)
      setTotalPages(result.meta.totalPages)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [page])

  const handleAction = async (groupId: string, action: 'join' | 'leave') => {
    try {
      setActionLoading(groupId)
      const res = await fetch('/api/v1/study-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, action })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)
      
      toast.success(action === 'join' ? 'Joined successfully!' : 'Left group')
      fetchGroups()
    } catch (error: any) {
      toast.error(error.message || 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="relative group overflow-hidden rounded-[2.5rem]">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
        <div className="relative glass p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8 z-10 text-center md:text-left">
          <div className="space-y-3 flex-1">
             <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-xl shadow-amber-500/40 text-center mx-auto md:mx-0 mb-6 transform hover:scale-110 transition-transform">
                <Users className="w-8 h-8" />
             </div>
             <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Study Groups</h1>
             <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-xl mx-auto md:mx-0 leading-relaxed">
               Collaborate, prepare for exams, and solve assignments together.
             </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Finding Groups...</p>
        </div>
      )}

      {error && <div className="text-center p-6 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-[2rem] font-bold">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {groups.map((group: any) => {
            const isFull = group.memberCount >= group.maxMembers
            const canJoin = !group.isMember && group.isOpen && !isFull

            return (
              <div key={group.id} className="glass rounded-[2rem] p-8 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-900/5 dark:hover:shadow-amber-900/10 transition-all flex flex-col h-full bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-slate-700/30">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 border border-amber-100/50 dark:border-amber-900/50 shadow-sm">
                    {group.isOpen ? <Globe className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                     <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                       group.isOpen ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50'
                     }`}>
                       {group.isOpen ? 'Open' : 'Invite Only'}
                     </span>
                     {group.isMember && (
                       <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50">
                         {group.isLeader ? 'Leader' : 'Member'}
                       </span>
                     )}
                  </div>
                </div>
                
                <h3 className="font-black text-2xl text-slate-800 dark:text-slate-100 mb-3">{group.name}</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex-1">{group.description}</p>
                
                <div className="mt-auto space-y-4 pt-4 border-t border-white/50 dark:border-slate-700 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Capacity</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200 bg-white/60 dark:bg-slate-800/80 px-3 py-1 rounded-xl border border-white/50 dark:border-slate-700/50">
                      {group.memberCount} / {group.maxMembers}
                    </span>
                  </div>
                  
                  {group.isMember ? (
                    <button
                      onClick={() => handleAction(group.id, 'leave')}
                      disabled={actionLoading === group.id}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                      {actionLoading === group.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                      Leave Group
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(group.id, 'join')}
                      disabled={!canJoin || actionLoading === group.id}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-800 dark:bg-emerald-600 hover:bg-slate-900 dark:hover:bg-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-30 disabled:dark:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:dark:text-slate-400 shadow-lg shadow-slate-800/20 dark:shadow-emerald-900/20 active:scale-95"
                    >
                      {actionLoading === group.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                      {isFull ? 'Group Full' : 'Request to Join'}
                    </button>
                  )}
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
