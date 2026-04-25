'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { BarChart3, Plus, Trash2, Lock, X as XIcon } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminDataTable, Column } from '@/components/admin/AdminDataTable'
import { AdminModal } from '@/components/admin/AdminModal'
import { AdminFormField } from '@/components/admin/AdminFormField'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

type PollRecord = {
  id: string
  question: string
  options: string
  optionsList: string[]
  isAnonymous: boolean
  isClosed: boolean
  closesAt: string | null
  createdById: string
  totalVotes: number
  voteDistribution: number[]
  createdAt: string
}

export function AdminPollsClient({ userRole }: { userRole: string }) {
  const [data, setData] = useState<PollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterStatus, setFilterStatus] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [resultsItem, setResultsItem] = useState<PollRecord | null>(null)
  const [deleteItem, setDeleteItem] = useState<PollRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Create form
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [closesAt, setClosesAt] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        ...(filterStatus && { status: filterStatus }),
      })
      const res = await fetch(`/api/v1/admin/polls?${params}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
        setTotalPages(result.meta.totalPages)
        setTotal(result.meta.total)
      }
    } catch { toast.error('Failed to load polls') }
    finally { setLoading(false) }
  }, [page, filterStatus])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setQuestion('')
    setOptions(['', ''])
    setIsAnonymous(true)
    setClosesAt('')
    setModalOpen(true)
  }

  const addOption = () => {
    if (options.length >= 10) { toast.error('Max 10 options'); return }
    setOptions([...options, ''])
  }

  const removeOption = (idx: number) => {
    if (options.length <= 2) { toast.error('Min 2 options'); return }
    setOptions(options.filter((_, i) => i !== idx))
  }

  const updateOption = (idx: number, val: string) => {
    const updated = [...options]
    updated[idx] = val
    setOptions(updated)
  }

  const handleCreate = async () => {
    if (!question.trim()) { toast.error('Question is required'); return }
    const validOptions = options.filter((o) => o.trim())
    if (validOptions.length < 2) { toast.error('At least 2 options required'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/admin/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          options: validOptions.map((o) => o.trim()),
          isAnonymous,
          ...(closesAt && { closesAt: new Date(closesAt).toISOString() }),
        }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)

      toast.success('Poll created')
      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Create failed')
    } finally { setSubmitting(false) }
  }

  const closePoll = async (item: PollRecord) => {
    try {
      const res = await fetch(`/api/v1/admin/polls/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isClosed: true }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)
      toast.success('Poll closed')
      fetchData()
    } catch { toast.error('Failed to close poll') }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/admin/polls/${deleteItem.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)
      toast.success('Poll deleted')
      setDeleteItem(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
    } finally { setSubmitting(false) }
  }

  const columns: Column<PollRecord>[] = [
    {
      key: 'question',
      label: 'Question',
      render: (item) => (
        <div className="max-w-sm">
          <p className="font-bold text-slate-800 dark:text-slate-100 line-clamp-2">{item.question}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{item.optionsList.length} options</p>
        </div>
      ),
    },
    {
      key: 'totalVotes',
      label: 'Votes',
      render: (item) => (
        <button
          onClick={(e) => { e.stopPropagation(); setResultsItem(item) }}
          className="px-3 py-1.5 bg-admin-purple/10 text-admin-purple rounded-lg text-xs font-bold hover:bg-admin-purple/20 transition-all"
        >
          {item.totalVotes} votes
        </button>
      ),
    },
    {
      key: 'isClosed',
      label: 'Status',
      render: (item) => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
          item.isClosed ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
        }`}>
          {item.isClosed ? 'Closed' : 'Active'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      hideOnMobile: true,
      render: (item) => (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      <AdminPageHeader
        icon={BarChart3}
        title="Polls"
        subtitle="Create polls, view results, and manage voting"
        actionLabel="Create Poll"
        actionIcon={Plus}
        onAction={openCreate}
        badge={`${total} total`}
      />

      <AdminDataTable
        columns={columns}
        data={data}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        emptyTitle="No polls yet"
        emptyMessage="Create your first poll to gather class opinions."
        getId={(item) => item.id}
        actions={(item) => (
          <>
            {!item.isClosed && (
              <button
                onClick={(e) => { e.stopPropagation(); closePoll(item) }}
                className="p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 text-slate-400 hover:text-amber-600 transition-all"
                title="Close Poll"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
            {userRole === 'super_admin' && (
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </>
        )}
        filterBar={
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
            title="Filter by status"
            className="px-4 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer outline-none focus:ring-4 focus:ring-admin-purple/10 transition-all"
          >
            <option value="">All Polls</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
        }
      />

      {/* Create Poll Modal */}
      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Poll"
        description="Ask a question and let the class vote"
        onSubmit={handleCreate}
        submitLabel="Create Poll"
        submitLoading={submitting}
      >
        <div className="space-y-5">
          <AdminFormField type="text" label="Question" value={question} onChange={setQuestion} placeholder="What do you want to ask?" required />
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
              Options <span className="text-red-400">*</span>
            </label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-semibold text-sm focus:outline-none focus:ring-4 focus:ring-admin-purple/10 dark:focus:ring-admin-purple/20 focus:border-admin-purple/40 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-medium"
                />
                {options.length > 2 && (
                  <button onClick={() => removeOption(idx)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Remove option">
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addOption}
              className="text-sm font-bold text-admin-purple hover:text-indigo-600 transition-colors mt-1"
            >
              + Add Option
            </button>
          </div>
          <AdminFormField type="checkbox" label="Anonymous voting" checked={isAnonymous} onChange={setIsAnonymous} />
          <AdminFormField type="datetime" label="Close at (optional)" value={closesAt} onChange={setClosesAt} hint="Leave empty for manual close" />
        </div>
      </AdminModal>

      {/* Vote Results Modal */}
      <AdminModal
        open={!!resultsItem}
        onClose={() => setResultsItem(null)}
        title="Poll Results"
        description={resultsItem?.question}
        maxWidth="max-w-lg"
      >
        {resultsItem && (
          <div className="space-y-4">
            {resultsItem.optionsList.map((opt, idx) => {
              const votes = resultsItem.voteDistribution[idx] || 0
              const pct = resultsItem.totalVotes ? Math.round((votes / resultsItem.totalVotes) * 100) : 0
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{opt}</span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{votes} votes ({pct}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-admin-purple to-indigo-500 rounded-full transition-all duration-700"
                      ref={(el) => { if (el) el.style.width = `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 text-center">
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{resultsItem.totalVotes} total votes</span>
            </div>
          </div>
        )}
      </AdminModal>

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        message={`Delete this poll and all its votes? This cannot be undone.`}
        loading={submitting}
      />
    </div>
  )
}
