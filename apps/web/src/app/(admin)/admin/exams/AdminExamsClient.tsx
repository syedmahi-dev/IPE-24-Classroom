'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { CalendarDays, Plus, Pencil, Trash2, Clock } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminDataTable, Column } from '@/components/admin/AdminDataTable'
import { AdminModal } from '@/components/admin/AdminModal'
import { AdminFormField } from '@/components/admin/AdminFormField'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

type ExamRecord = {
  id: string
  title: string
  description: string | null
  courseId: string
  course: { id: string; code: string; name: string }
  examDate: string
  duration: number | null
  room: string | null
  syllabus: string | null
  type: string
  submissionLink: string | null
  submissionMethod: string | null
  instructions: string | null
  isActive: boolean
  createdAt: string
}

type Course = { id: string; code: string; name: string }

export function AdminExamsClient({ courses }: { courses: Course[] }) {
  const [data, setData] = useState<ExamRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<ExamRecord | null>(null)
  const [deleteItem, setDeleteItem] = useState<ExamRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [courseId, setCourseId] = useState('')
  const [examDate, setExamDate] = useState('')
  const [duration, setDuration] = useState('')
  const [room, setRoom] = useState('')
  const [syllabus, setSyllabus] = useState('')
  const [type, setType] = useState('EXAM')
  const [submissionLink, setSubmissionLink] = useState('')
  const [submissionMethod, setSubmissionMethod] = useState('')
  const [instructions, setInstructions] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '15' })
      const res = await fetch(`/api/v1/admin/exams?${params}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
        setTotalPages(result.meta.totalPages)
        setTotal(result.meta.total)
      }
    } catch { toast.error('Failed to load exams') }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditItem(null)
    setTitle(''); setDescription(''); setCourseId(courses[0]?.id || '')
    setExamDate(''); setDuration(''); setRoom(''); setSyllabus('')
    setType('EXAM'); setSubmissionLink(''); setSubmissionMethod(''); setInstructions('')
    setModalOpen(true)
  }

  const openEdit = (item: ExamRecord) => {
    setEditItem(item)
    setTitle(item.title)
    setDescription(item.description || '')
    setCourseId(item.courseId)
    setExamDate(new Date(item.examDate).toISOString().slice(0, 16))
    setDuration(item.duration?.toString() || '')
    setRoom(item.room || '')
    setSyllabus(item.syllabus || '')
    setType(item.type || 'EXAM')
    setSubmissionLink(item.submissionLink || '')
    setSubmissionMethod(item.submissionMethod || '')
    setInstructions(item.instructions || '')
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Title is required'); return }
    if (!courseId) { toast.error('Course is required'); return }
    if (!examDate) { toast.error('Date is required'); return }

    setSubmitting(true)
    try {
      const url = editItem ? `/api/v1/admin/exams/${editItem.id}` : '/api/v1/admin/exams'
      const method = editItem ? 'PATCH' : 'POST'

      const payload: any = {
        title: title.trim(),
        courseId,
        examDate: new Date(examDate).toISOString(),
        type,
      }
      if (description.trim()) payload.description = description.trim()
      if (type === 'EXAM') {
        if (duration) payload.duration = parseInt(duration)
        if (room.trim()) payload.room = room.trim()
        if (syllabus.trim()) payload.syllabus = syllabus.trim()
      } else {
        if (submissionLink.trim()) payload.submissionLink = submissionLink.trim()
        if (submissionMethod.trim()) payload.submissionMethod = submissionMethod.trim()
        if (instructions.trim()) payload.instructions = instructions.trim()
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)

      toast.success(editItem ? 'Exam updated' : 'Exam created')
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
      const res = await fetch(`/api/v1/admin/exams/${deleteItem.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)

      toast.success('Exam deleted')
      setDeleteItem(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
    } finally { setSubmitting(false) }
  }

  const columns: Column<ExamRecord>[] = [
    {
      key: 'title',
      label: 'Exam / Assignment',
      render: (item) => (
        <div className="max-w-xs">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${item.type === 'ASSIGNMENT' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>{item.type}</span>
            <p className="font-bold text-slate-800 dark:text-slate-100">{item.title}</p>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">{item.course.code} — {item.course.name}</p>
        </div>
      ),
    },
    {
      key: 'examDate',
      label: 'Date / Deadline',
      render: (item) => {
        const d = new Date(item.examDate)
        const isPast = d < new Date()
        return (
          <div className={`text-sm font-semibold ${isPast ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
            <p>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            <p className="text-xs font-medium">{d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        )
      },
    },
    {
      key: 'duration',
      label: 'Duration / Method',
      hideOnMobile: true,
      render: (item) => {
        if (item.type === 'ASSIGNMENT') return item.submissionMethod ? <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{item.submissionMethod}</span> : <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
        return item.duration
        ? <span className="flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300"><Clock className="w-3.5 h-3.5" />{item.duration}m</span>
        : <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
      },
    },
    {
      key: 'room',
      label: 'Room',
      hideOnMobile: true,
      render: (item) => item.room
        ? <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{item.room}</span>
        : <span className="text-xs text-slate-400 dark:text-slate-500">TBA</span>,
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (item) => {
        const isPast = new Date(item.examDate) < new Date()
        return (
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
            isPast ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
          }`}>
            {isPast ? 'Completed' : 'Upcoming'}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      <AdminPageHeader
        icon={CalendarDays}
        title="Exams"
        subtitle="Schedule and manage exam dates, rooms, and syllabi"
        actionLabel="Add Exam"
        actionIcon={Plus}
        onAction={openCreate}
        badge={`${total} exams`}
      />

      <AdminDataTable
        columns={columns}
        data={data}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        emptyTitle="No exams scheduled"
        emptyMessage="Add an exam entry to get started."
        getId={(item) => item.id}
        actions={(item) => (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); openEdit(item) }}
              className="p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-admin-purple/10 text-slate-400 hover:text-admin-purple transition-all"
              title="Edit exam"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all"
              title="Delete exam"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      />

      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Exam' : 'Add Exam'}
        description={editItem ? 'Update exam details' : 'Schedule a new exam'}
        onSubmit={handleSubmit}
        submitLabel={editItem ? 'Update' : 'Create'}
        submitLoading={submitting}
      >
        <div className="space-y-5">
          <AdminFormField
            type="select"
            label="Type"
            value={type}
            onChange={setType}
            options={[{ value: 'EXAM', label: 'Exam' }, { value: 'ASSIGNMENT', label: 'Assignment' }]}
            required
          />
          <AdminFormField type="text" label="Title" value={title} onChange={setTitle} placeholder="e.g. Mid-Term Exam" required />
          <AdminFormField
            type="select"
            label="Course"
            value={courseId}
            onChange={setCourseId}
            options={courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
            required
          />
          <AdminFormField type="datetime" label="Date & Time / Deadline" value={examDate} onChange={setExamDate} required />
          
          {type === 'EXAM' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <AdminFormField type="number" label="Duration (min)" value={duration} onChange={setDuration} placeholder="90" />
                <AdminFormField type="text" label="Room" value={room} onChange={setRoom} placeholder="Room 301" />
              </div>
              <AdminFormField type="textarea" label="Syllabus" value={syllabus} onChange={setSyllabus} placeholder="Topics covered..." rows={3} />
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <AdminFormField type="text" label="Submission Method" value={submissionMethod} onChange={setSubmissionMethod} placeholder="e.g. Online, Google Form" />
                <AdminFormField type="text" label="Submission Link" value={submissionLink} onChange={setSubmissionLink} placeholder="https://..." />
              </div>
              <AdminFormField type="textarea" label="Instructions" value={instructions} onChange={setInstructions} placeholder="Assignment instructions..." rows={3} />
            </>
          )}

          <AdminFormField type="textarea" label="Description" value={description} onChange={setDescription} placeholder="Additional notes..." rows={2} />
        </div>
      </AdminModal>

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        message={`Delete exam "${deleteItem?.title}"? This cannot be undone.`}
        loading={submitting}
      />
    </div>
  )
}
