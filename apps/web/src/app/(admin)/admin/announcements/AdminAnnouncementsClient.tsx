'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Megaphone, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminDataTable, Column } from '@/components/admin/AdminDataTable'
import { AdminModal } from '@/components/admin/AdminModal'
import { AdminFormField } from '@/components/admin/AdminFormField'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

type Announcement = {
  id: string
  title: string
  body: string
  type: string
  isPublished: boolean
  publishedAt: string | null
  author: { id: string; name: string; role: string }
  courses: { course: { id: string; code: string; name: string } }[]
  createdAt: string
}

type Course = { id: string; code: string; name: string }

const TYPE_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'exam', label: 'Exam' },
  { value: 'file_update', label: 'File Update' },
  { value: 'routine_update', label: 'Routine Update' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'event', label: 'Event' },
]

const TYPE_COLORS: Record<string, string> = {
  general: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  exam: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
  file_update: 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300',
  routine_update: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
  urgent: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
  event: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
}

export function AdminAnnouncementsClient({ courses }: { courses: Course[] }) {
  const [data, setData] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<Announcement | null>(null)
  const [deleteItem, setDeleteItem] = useState<Announcement | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState('general')
  const [isPublished, setIsPublished] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        ...(search && { search }),
        ...(filterType && { type: filterType }),
      })
      const res = await fetch(`/api/v1/admin/announcements?${params}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
        setTotalPages(result.meta.totalPages)
        setTotal(result.meta.total)
      }
    } catch { toast.error('Failed to load announcements') }
    finally { setLoading(false) }
  }, [page, search, filterType])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditItem(null)
    setTitle('')
    setBody('')
    setType('general')
    setIsPublished(true)
    setModalOpen(true)
  }

  const openEdit = (item: Announcement) => {
    setEditItem(item)
    setTitle(item.title)
    setBody(item.body)
    setType(item.type)
    setIsPublished(item.isPublished)
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required')
      return
    }
    setSubmitting(true)
    try {
      const url = editItem
        ? `/api/v1/admin/announcements/${editItem.id}`
        : '/api/v1/admin/announcements'
      const method = editItem ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), type, isPublished }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)

      toast.success(editItem ? 'Announcement updated' : 'Announcement created')
      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Operation failed')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/admin/announcements/${deleteItem.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)

      toast.success('Announcement deleted')
      setDeleteItem(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
    } finally { setSubmitting(false) }
  }

  const togglePublish = async (item: Announcement) => {
    try {
      const res = await fetch(`/api/v1/admin/announcements/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !item.isPublished }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)
      toast.success(item.isPublished ? 'Unpublished' : 'Published')
      fetchData()
    } catch { toast.error('Failed to toggle publish status') }
  }

  const columns: Column<Announcement>[] = [
    {
      key: 'title',
      label: 'Title',
      render: (item) => (
        <div className="max-w-xs">
          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.title}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{item.body.slice(0, 80)}...</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (item) => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${TYPE_COLORS[item.type] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
          {item.type.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'author',
      label: 'Author',
      hideOnMobile: true,
      render: (item) => (
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{item.author.name}</span>
      ),
    },
    {
      key: 'isPublished',
      label: 'Status',
      render: (item) => (
        <button
          onClick={(e) => { e.stopPropagation(); togglePublish(item) }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            item.isPublished
              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/30'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          {item.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {item.isPublished ? 'Published' : 'Draft'}
        </button>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      hideOnMobile: true,
      render: (item) => (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      <AdminPageHeader
        icon={Megaphone}
        title="Announcements"
        subtitle="Create, edit, and manage all class announcements"
        actionLabel="New Announcement"
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
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Search announcements..."
        emptyTitle="No announcements yet"
        emptyMessage="Create your first announcement to get started."
        getId={(item) => item.id}
        actions={(item) => (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); openEdit(item) }}
              className="p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-admin-purple/10 text-slate-400 hover:text-admin-purple transition-all"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
        filterBar={
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
            className="px-4 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer outline-none focus:ring-4 focus:ring-admin-purple/10 transition-all"
          >
            <option value="">All Types</option>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        }
      />

      {/* Create/Edit Modal */}
      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Announcement' : 'New Announcement'}
        description={editItem ? 'Update the announcement details' : 'Create a new announcement for students'}
        onSubmit={handleSubmit}
        submitLabel={editItem ? 'Update' : 'Create'}
        submitLoading={submitting}
      >
        <div className="space-y-5">
          <AdminFormField type="text" label="Title" value={title} onChange={setTitle} placeholder="Announcement title..." required />
          <AdminFormField type="textarea" label="Body" value={body} onChange={setBody} placeholder="Write your announcement..." rows={5} required />
          <AdminFormField type="select" label="Type" value={type} onChange={setType} options={TYPE_OPTIONS} />
          <AdminFormField type="checkbox" label="Publish immediately" checked={isPublished} onChange={setIsPublished} />
        </div>
      </AdminModal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        message={`Are you sure you want to delete "${deleteItem?.title}"? This action cannot be undone.`}
        loading={submitting}
      />
    </div>
  )
}
