'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminDataTable, Column } from '@/components/admin/AdminDataTable'
import { AdminModal } from '@/components/admin/AdminModal'
import { AdminFormField } from '@/components/admin/AdminFormField'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

type CourseRecord = {
  id: string
  code: string
  name: string
  creditHours: number
  teacherName: string | null
  semester: number
  isActive: boolean
  createdAt: string
}

export function AdminCoursesClient() {
  const [data, setData] = useState<CourseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<CourseRecord | null>(null)
  const [deleteItem, setDeleteItem] = useState<CourseRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [creditHours, setCreditHours] = useState('3.0')
  const [teacherName, setTeacherName] = useState('')
  const [semester, setSemester] = useState('1')
  const [isActive, setIsActive] = useState('true')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '15' })
      const res = await fetch(`/api/v1/admin/courses?${params}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
        setTotalPages(result.meta.totalPages)
        setTotal(result.meta.total)
      }
    } catch { toast.error('Failed to load courses') }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditItem(null)
    setCode(''); setName(''); setCreditHours('3.0')
    setTeacherName(''); setSemester('1'); setIsActive('true')
    setModalOpen(true)
  }

  const openEdit = (item: CourseRecord) => {
    setEditItem(item)
    setCode(item.code)
    setName(item.name)
    setCreditHours(item.creditHours.toString())
    setTeacherName(item.teacherName || '')
    setSemester(item.semester.toString())
    setIsActive(item.isActive.toString())
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim()) { toast.error('Code and Name are required'); return }

    setSubmitting(true)
    try {
      const url = editItem ? `/api/v1/admin/courses/${editItem.id}` : '/api/v1/admin/courses'
      const method = editItem ? 'PATCH' : 'POST'

      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        creditHours: parseFloat(creditHours),
        teacherName: teacherName.trim() || null,
        semester: parseInt(semester, 10),
        isActive: isActive === 'true',
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)

      toast.success(editItem ? 'Course updated' : 'Course created')
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
      const res = await fetch(`/api/v1/admin/courses/${deleteItem.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)

      toast.success('Course deleted')
      setDeleteItem(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Delete failed. Ensure no exams/files are linked.')
    } finally { setSubmitting(false) }
  }

  const columns: Column<CourseRecord>[] = [
    {
      key: 'code',
      label: 'Course',
      render: (item) => (
        <div className="max-w-xs">
          <p className="font-bold text-slate-800">{item.code}</p>
          <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">{item.name}</p>
        </div>
      ),
    },
    {
      key: 'creditHours',
      label: 'Credits',
      hideOnMobile: true,
      render: (item) => <span className="text-sm font-semibold text-slate-600">{item.creditHours} CR</span>,
    },
    {
      key: 'teacherName',
      label: 'Instructor',
      hideOnMobile: true,
      render: (item) => item.teacherName 
        ? <span className="text-sm font-semibold text-slate-600 truncate max-w-[150px] inline-block">{item.teacherName}</span>
        : <span className="text-xs text-slate-400">TBA</span>,
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (item) => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
          item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {item.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      <AdminPageHeader
        icon={BookOpen}
        title="Courses"
        subtitle="Manage the global course catalog"
        actionLabel="Add Course"
        actionIcon={Plus}
        onAction={openCreate}
        badge={`${total} courses`}
      />

      <AdminDataTable
        columns={columns}
        data={data}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        emptyTitle="No courses added"
        emptyMessage="Add the first course to your syllabus."
        getId={(item) => item.id}
        actions={(item) => (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); openEdit(item) }}
              className="p-2 rounded-lg hover:bg-admin-purple/10 text-slate-400 hover:text-admin-purple transition-all"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }}
              className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      />

      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Course' : 'Add Course'}
        description={editItem ? 'Update syllabus details' : 'Register a new syllabus course'}
        onSubmit={handleSubmit}
        submitLabel={editItem ? 'Update' : 'Create'}
        submitLoading={submitting}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <AdminFormField type="text" label="Course Code" value={code} onChange={setCode} placeholder="IPE 101" required />
            <AdminFormField type="number" label="Credit Hours" value={creditHours} onChange={setCreditHours} placeholder="3.0" required />
          </div>
          <AdminFormField type="text" label="Course Name" value={name} onChange={setName} placeholder="Intro to Everything" required />
          <AdminFormField type="text" label="Instructor" value={teacherName} onChange={setTeacherName} placeholder="Dr. John Doe" />
          <div className="grid grid-cols-2 gap-4">
            <AdminFormField 
              type="select" 
              label="Numeric Semester" 
              value={semester} 
              onChange={setSemester} 
              options={[...Array(8)].map((_, i) => ({ value: String(i+1), label: `Semester ${i+1}` }))}
              required 
            />
            <AdminFormField 
              type="select" 
              label="Status" 
              value={isActive} 
              onChange={setIsActive} 
              options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]}
              required 
            />
          </div>
        </div>
      </AdminModal>

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        message={`Delete course "${deleteItem?.code}"? This will NOT work if it's currently used in exams or announcements without cascading deletes.`}
        loading={submitting}
      />
    </div>
  )
}
