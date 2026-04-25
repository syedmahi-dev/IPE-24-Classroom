'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { BookOpen, Plus, Trash2, FileText, Link as LinkIcon } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminDataTable, Column } from '@/components/admin/AdminDataTable'
import { AdminModal } from '@/components/admin/AdminModal'
import { AdminFormField } from '@/components/admin/AdminFormField'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

type KnowledgeDoc = {
  id: string
  title: string
  sourceType: string
  courseCode: string | null
  content: string
  createdAt: string
  updatedAt: string
  _count: { chunks: number }
}

const SOURCE_OPTIONS = [
  { value: 'pdf', label: 'PDF Document' },
  { value: 'notes', label: 'Class Notes' },
  { value: 'syllabus', label: 'Syllabus' },
  { value: 'other', label: 'Other' },
]

const SOURCE_COLORS: Record<string, string> = {
  pdf: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
  notes: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
  syllabus: 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300',
  other: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
}

export function AdminKnowledgeClient({ userRole }: { userRole: string }) {
  const [data, setData] = useState<KnowledgeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<KnowledgeDoc | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form
  const [title, setTitle] = useState('')
  const [sourceType, setSourceType] = useState('other')
  const [courseCode, setCourseCode] = useState('')
  const [content, setContent] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        ...(search && { search }),
      })
      const res = await fetch(`/api/v1/admin/knowledge?${params}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
        setTotalPages(result.meta.totalPages)
        setTotal(result.meta.total)
      }
    } catch { toast.error('Failed to load documents') }
    finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setTitle(''); setSourceType('other'); setCourseCode(''); setContent('')
    setModalOpen(true)
  }

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) { toast.error('Title and content are required'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/admin/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          sourceType,
          courseCode: courseCode.trim() || undefined,
          content: content.trim(),
        }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)

      toast.success('Document added')
      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/admin/knowledge/${deleteItem.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)
      toast.success('Document deleted')
      setDeleteItem(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
    } finally { setSubmitting(false) }
  }

  const columns: Column<KnowledgeDoc>[] = useMemo(() => [
    {
      key: 'title',
      label: 'Document',
      render: (item) => (
        <div className="max-w-sm">
          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.title}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{item.content.slice(0, 100)}...</p>
        </div>
      ),
    },
    {
      key: 'sourceType',
      label: 'Type',
      render: (item) => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${SOURCE_COLORS[item.sourceType] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
          {item.sourceType}
        </span>
      ),
    },
    {
      key: 'courseCode',
      label: 'Course',
      hideOnMobile: true,
      render: (item) => item.courseCode
        ? <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{item.courseCode}</span>
        : <span className="text-xs text-slate-400 dark:text-slate-500">—</span>,
    },
    {
      key: 'chunks',
      label: 'Chunks',
      hideOnMobile: true,
      render: (item) => (
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{item._count.chunks}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Added',
      hideOnMobile: true,
      render: (item) => (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      ),
    },
  ], [])

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      <AdminPageHeader
        icon={BookOpen}
        title="Knowledge Base"
        subtitle="Manage AI chatbot knowledge documents and embeddings"
        actionLabel="Add Document"
        actionIcon={Plus}
        onAction={openCreate}
        badge={`${total} docs`}
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
        searchPlaceholder="Search documents..."
        emptyTitle="No knowledge documents"
        emptyMessage="Add documents to train the AI chatbot."
        getId={(item) => item.id}
        actions={(item) => (
          userRole === 'super_admin' ? (
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all"
              title="Delete document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : null
        )}
      />

      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Knowledge Document"
        description="Add a document to the AI chatbot's knowledge base"
        onSubmit={handleCreate}
        submitLabel="Add Document"
        submitLoading={submitting}
      >
        <div className="space-y-5">
          <AdminFormField type="text" label="Title" value={title} onChange={setTitle} placeholder="Document title..." required />
          <AdminFormField type="select" label="Source Type" value={sourceType} onChange={setSourceType} options={SOURCE_OPTIONS} />
          <AdminFormField type="text" label="Course Code" value={courseCode} onChange={setCourseCode} placeholder="IPE-4501 (optional)" hint="Associate with a specific course" />
          <AdminFormField type="textarea" label="Content" value={content} onChange={setContent} placeholder="Paste the document content here..." rows={8} required />
        </div>
      </AdminModal>

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        message={`Delete "${deleteItem?.title}" and all its chunks? This cannot be undone.`}
        loading={submitting}
      />
    </div>
  )
}
