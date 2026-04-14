'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { FolderOpen, Upload, Trash2, ExternalLink, FileText, FileSpreadsheet, FileImage, File } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminDataTable, Column } from '@/components/admin/AdminDataTable'
import { AdminModal } from '@/components/admin/AdminModal'
import { AdminFormField } from '@/components/admin/AdminFormField'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

type FileRecord = {
  id: string
  name: string
  driveId: string
  driveUrl: string
  downloadUrl: string | null
  mimeType: string
  sizeBytes: number
  category: string
  courseId: string | null
  course: { id: string; code: string; name: string } | null
  uploadedBy: { id: string; name: string }
  createdAt: string
}

type Course = { id: string; code: string; name: string }

const CATEGORY_OPTIONS = [
  { value: 'lecture_notes', label: 'Lecture Notes' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'past_paper', label: 'Past Paper' },
  { value: 'syllabus', label: 'Syllabus' },
  { value: 'other', label: 'Other' },
]

const CATEGORY_COLORS: Record<string, string> = {
  lecture_notes: 'bg-blue-100 text-blue-700',
  assignment: 'bg-amber-100 text-amber-700',
  past_paper: 'bg-purple-100 text-purple-700',
  syllabus: 'bg-teal-100 text-teal-700',
  other: 'bg-slate-100 text-slate-600',
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />
  if (mimeType.includes('spreadsheet') || mimeType.includes('csv')) return <FileSpreadsheet className="w-4 h-4 text-green-500" />
  if (mimeType.includes('image')) return <FileImage className="w-4 h-4 text-blue-500" />
  return <File className="w-4 h-4 text-slate-400" />
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AdminFilesClient({ courses }: { courses: Course[] }) {
  const [data, setData] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [filterCourse, setFilterCourse] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<FileRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Upload form state
  const [fileName, setFileName] = useState('')
  const [courseId, setCourseId] = useState('')
  const [category, setCategory] = useState('other')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        ...(search && { search }),
        ...(filterCourse && { courseId: filterCourse }),
      })
      const res = await fetch(`/api/v1/admin/files?${params}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
        setTotalPages(result.meta.totalPages)
        setTotal(result.meta.total)
      }
    } catch { toast.error('Failed to load files') }
    finally { setLoading(false) }
  }, [page, search, filterCourse])

  useEffect(() => { fetchData() }, [fetchData])

  const openUpload = () => {
    setFileName('')
    setCourseId('')
    setCategory('other')
    setSelectedFile(null)
    setModalOpen(true)
  }

  const handleUpload = async () => {
    if (!selectedFile) { toast.error('Please select a file'); return }
    if (!fileName.trim()) { toast.error('File name is required'); return }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('name', fileName.trim())
      formData.append('category', category)
      if (courseId) formData.append('courseId', courseId)

      const res = await fetch('/api/v1/admin/files', { method: 'POST', body: formData })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)

      toast.success('File uploaded successfully')
      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/admin/files/${deleteItem.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)

      toast.success('File deleted')
      setDeleteItem(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
    } finally { setSubmitting(false) }
  }

  const columns: Column<FileRecord>[] = [
    {
      key: 'name',
      label: 'File',
      render: (item) => (
        <div className="flex items-center gap-3 max-w-xs">
          {getFileIcon(item.mimeType)}
          <div className="min-w-0">
            <p className="font-bold text-slate-800 truncate">{item.name}</p>
            <p className="text-[11px] text-slate-400 font-medium">{formatSize(item.sizeBytes)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'course',
      label: 'Course',
      hideOnMobile: true,
      render: (item) => item.course
        ? <span className="text-xs font-bold text-slate-600">{item.course.code}</span>
        : <span className="text-xs text-slate-400">—</span>,
    },
    {
      key: 'category',
      label: 'Category',
      render: (item) => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${CATEGORY_COLORS[item.category] || 'bg-slate-100 text-slate-600'}`}>
          {item.category.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'uploadedBy',
      label: 'Uploader',
      hideOnMobile: true,
      render: (item) => <span className="text-sm font-semibold text-slate-600">{item.uploadedBy.name}</span>,
    },
    {
      key: 'createdAt',
      label: 'Date',
      hideOnMobile: true,
      render: (item) => (
        <span className="text-xs font-medium text-slate-500">
          {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      <AdminPageHeader
        icon={FolderOpen}
        title="Files"
        subtitle="Upload and manage class files via Google Drive"
        actionLabel="Upload File"
        actionIcon={Upload}
        onAction={openUpload}
        badge={`${total} files`}
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
        searchPlaceholder="Search files..."
        emptyTitle="No files uploaded"
        emptyMessage="Upload your first file to get started."
        getId={(item) => item.id}
        actions={(item) => (
          <>
            <a
              href={item.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-all"
              title="Open in Drive"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }}
              className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
        filterBar={
          <select
            value={filterCourse}
            onChange={(e) => { setFilterCourse(e.target.value); setPage(1) }}
            className="px-4 py-3 bg-white/50 border border-white rounded-xl text-sm font-bold text-slate-600 cursor-pointer outline-none focus:ring-4 focus:ring-admin-purple/10 transition-all"
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
            ))}
          </select>
        }
      />

      {/* Upload Modal */}
      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Upload File"
        description="Upload a file to Google Drive and share with students"
        onSubmit={handleUpload}
        submitLabel="Upload"
        submitLoading={submitting}
        submitDisabled={!selectedFile}
      >
        <div className="space-y-5">
          <AdminFormField
            type="file"
            label="File"
            onChange={(files) => {
              if (files && files[0]) {
                setSelectedFile(files[0])
                if (!fileName) setFileName(files[0].name.replace(/\.[^/.]+$/, ''))
              }
            }}
            required
          />
          <AdminFormField type="text" label="Display Name" value={fileName} onChange={setFileName} placeholder="Name for this file..." required />
          <AdminFormField
            type="select"
            label="Course"
            value={courseId}
            onChange={setCourseId}
            options={[{ value: '', label: 'No specific course' }, ...courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))]}
          />
          <AdminFormField type="select" label="Category" value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
        </div>
      </AdminModal>

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        message={`Delete "${deleteItem?.name}"? This will also remove the file from Google Drive.`}
        loading={submitting}
      />
    </div>
  )
}
