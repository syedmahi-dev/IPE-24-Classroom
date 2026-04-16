'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Lock, Globe, Plus, LogOut, Loader2, FlaskConical, Users2, MessageCircle, X } from 'lucide-react'
import { toast } from 'sonner'

const GROUP_FILTERS = [
  { value: '', label: 'All Groups' },
  { value: 'ODD', label: 'Odd Group' },
  { value: 'EVEN', label: 'Even Group' },
]

const groupBadge: Record<string, string> = {
  ALL: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  ODD: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  EVEN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export default function StudyGroupsPage() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [groupFilter, setGroupFilter] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newGroupText, setNewGroupText] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [newGroupLab, setNewGroupLab] = useState('ALL')
  const [createLoading, setCreateLoading] = useState(false)

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '12' })
      if (groupFilter) params.set('targetGroup', groupFilter)
      const res = await fetch(`/api/v1/study-groups?${params}`)
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)
      setGroups(result.data)
      setTotalPages(result.meta.totalPages)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, groupFilter])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

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

  const handleCreate = async () => {
    if (!newGroupText.trim()) return toast.error('Group name required')
    try {
      setCreateLoading(true)
      const res = await fetch('/api/v1/study-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: newGroupText,
          description: newGroupDesc,
          targetGroup: newGroupLab,
          maxMembers: 10
        })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)
      toast.success('Group Created!')
      setCreateModalOpen(false)
      setNewGroupText('')
      setNewGroupDesc('')
      fetchGroups()
    } catch (error: any) {
      toast.error(error.message || 'Creation failed')
    } finally {
      setCreateLoading(false)
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
               Collaborate, prepare for exams, and solve assignments together. Groups are organized by lab divisions — you can join any group.
             </p>
          </div>
          <button 
            onClick={() => setCreateModalOpen(true)}
            className="px-6 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Create Group
          </button>
        </div>
      </div>

      {/* Lab Group Filter Tabs */}
      <div className="flex gap-2 p-1.5 bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-white/40 dark:border-slate-700/30 shadow-sm w-fit mx-auto">
        {GROUP_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => { setGroupFilter(f.value); setPage(1) }}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              groupFilter === f.value
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/40'
            }`}
          >
            <span className="flex items-center gap-2">
              {f.value === 'ODD' && <Users2 className="w-4 h-4" />}
              {f.value === 'EVEN' && <Users2 className="w-4 h-4" />}
              {f.value === '' && <Users className="w-4 h-4" />}
              {f.label}
            </span>
          </button>
        ))}
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
                     {/* Lab Group Badge */}
                     {group.targetGroup && group.targetGroup !== 'ALL' && (
                       <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-1 ${groupBadge[group.targetGroup]}`}>
                         <FlaskConical className="w-3 h-3" />
                         {group.targetGroup}
                       </span>
                     )}
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
                
                <h3 className="font-black text-2xl text-slate-800 dark:text-slate-100 mb-3">{group.name || group.title}</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 flex-1">{group.description}</p>
                
                <div className="mt-auto space-y-4 pt-4 border-t border-white/50 dark:border-slate-700 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Capacity</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200 bg-white/60 dark:bg-slate-800/80 px-3 py-1 rounded-xl border border-white/50 dark:border-slate-700/50">
                      {group.memberCount} / {group.maxMembers}
                    </span>
                  </div>
                  
                  {group.isMember ? (
                    <div className="flex gap-2 w-full">
                      <a
                        href={`/study-groups/${group.id}/chat`}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-admin-purple hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer"
                      >
                        <MessageCircle className="w-5 h-5" />
                        Chat
                      </a>
                      <button
                        onClick={() => handleAction(group.id, 'leave')}
                        disabled={actionLoading === group.id}
                        className="flex items-center justify-center px-4 py-3.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 hover:text-red-700 font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {actionLoading === group.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAction(group.id, 'join')}
                      disabled={!canJoin || actionLoading === group.id}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-800 dark:bg-emerald-600 hover:bg-slate-900 dark:hover:bg-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-30 disabled:dark:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:dark:text-slate-400 shadow-lg shadow-slate-800/20 dark:shadow-emerald-900/20 active:scale-95 cursor-pointer"
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

      {!loading && !error && groups.length === 0 && (
        <div className="text-center py-16 glass rounded-[2rem]">
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-amber-400" />
          </div>
          <p className="font-bold text-lg text-slate-700 dark:text-slate-300">No study groups found</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {groupFilter ? `No ${groupFilter.toLowerCase()} group study groups yet.` : 'No study groups have been created yet.'}
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center glass p-4 rounded-[2rem] mt-8 shadow-sm">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-6 py-3 bg-white dark:bg-slate-800 font-bold rounded-xl shadow-sm text-slate-600 dark:text-slate-300 disabled:opacity-50 cursor-pointer">Prev</button>
          <span className="font-bold text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-6 py-3 bg-white dark:bg-slate-800 font-bold rounded-xl shadow-sm text-slate-600 dark:text-slate-300 disabled:opacity-50 cursor-pointer">Next</button>
        </div>
      )}

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="glass bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/50">
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">Create Study Group</h3>
              <button 
                onClick={() => setCreateModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Group Name</label>
                <input
                  type="text"
                  value={newGroupText}
                  onChange={e => setNewGroupText(e.target.value)}
                  placeholder="e.g. Finals Prep Crew"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Description</label>
                <textarea
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  placeholder="What's the goal of this group?"
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Lab Group Filter</label>
                <select
                  value={newGroupLab}
                  onChange={e => setNewGroupLab(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium outline-none"
                >
                  <option value="ALL">All Groups (Open to everyone)</option>
                  <option value="ODD">Odd Lab Group Only</option>
                  <option value="EVEN">Even Lab Group Only</option>
                </select>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 dark:border-slate-800/50 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/20">
              <button 
                onClick={() => setCreateModalOpen(false)}
                className="px-6 py-3 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                disabled={createLoading || !newGroupText.trim()}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {createLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
