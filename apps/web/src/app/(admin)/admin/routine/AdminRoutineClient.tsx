'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { CalendarClock, Plus, Pencil, Trash2, Ban, Clock, MapPin, Users2, FlaskConical } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminDataTable, Column } from '@/components/admin/AdminDataTable'
import { AdminModal } from '@/components/admin/AdminModal'
import { AdminFormField } from '@/components/admin/AdminFormField'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

// ─── Types ───────────────────────────────────────────────────────────
type BaseRoutine = {
  id: string
  courseCode: string
  courseName: string | null
  dayOfWeek: string
  startTime: string
  endTime: string
  room: string
  teacher: string | null
  targetGroup: string
  isLab: boolean
  semester: string | null
  createdAt: string
}

type RoutineOverride = {
  id: string
  date: string
  type: string
  baseRoutineId: string | null
  baseRoutine: { id: string; courseCode: string; courseName: string | null; dayOfWeek: string; startTime: string; endTime: string; room: string } | null
  courseCode: string | null
  courseName: string | null
  startTime: string | null
  endTime: string | null
  room: string | null
  teacher: string | null
  targetGroup: string
  reason: string | null
  createdAt: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const
const GROUPS = [
  { value: 'ALL', label: 'All Students' },
  { value: 'ODD', label: 'Odd Group' },
  { value: 'EVEN', label: 'Even Group' },
]
const OVERRIDE_TYPES = [
  { value: 'CANCELLED', label: 'Cancel Class' },
  { value: 'MAKEUP', label: 'Makeup / Extra Class' },
  { value: 'ROOM_CHANGE', label: 'Room Change' },
  { value: 'TIME_CHANGE', label: 'Time Change' },
]

const groupBadge: Record<string, string> = {
  ALL: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  ODD: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  EVEN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const overrideTypeBadge: Record<string, string> = {
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MAKEUP: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  ROOM_CHANGE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  TIME_CHANGE: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
}

type Course = { id: string; code: string; name: string }

// ─── Component ───────────────────────────────────────────────────────
export function AdminRoutineClient({ courses }: { courses: Course[] }) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'overrides'>('schedule')

  // ─── Base Schedule State ─────────────────────────────────────────
  const [routines, setRoutines] = useState<BaseRoutine[]>([])
  const [routineLoading, setRoutineLoading] = useState(true)
  const [routinePage, setRoutinePage] = useState(1)
  const [routineTotalPages, setRoutineTotalPages] = useState(1)
  const [routineTotal, setRoutineTotal] = useState(0)
  const [routineModalOpen, setRoutineModalOpen] = useState(false)
  const [editRoutine, setEditRoutine] = useState<BaseRoutine | null>(null)
  const [deleteRoutine, setDeleteRoutine] = useState<BaseRoutine | null>(null)
  const [routineSubmitting, setRoutineSubmitting] = useState(false)

  // Base routine form state
  const [courseCode, setCourseCode] = useState('')
  const [courseName, setCourseName] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState<string>('Monday')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [room, setRoom] = useState('')
  const [teacher, setTeacher] = useState('')
  const [targetGroup, setTargetGroup] = useState('ALL')
  const [isLab, setIsLab] = useState(false)
  const [semester, setSemester] = useState('')

  // ─── Override State ──────────────────────────────────────────────
  const [overrides, setOverrides] = useState<RoutineOverride[]>([])
  const [overrideLoading, setOverrideLoading] = useState(true)
  const [overridePage, setOverridePage] = useState(1)
  const [overrideTotalPages, setOverrideTotalPages] = useState(1)
  const [overrideTotal, setOverrideTotal] = useState(0)
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [deleteOverride, setDeleteOverride] = useState<RoutineOverride | null>(null)
  const [overrideSubmitting, setOverrideSubmitting] = useState(false)

  // Override form state
  const [ovDate, setOvDate] = useState('')
  const [ovType, setOvType] = useState('CANCELLED')
  const [ovBaseRoutineId, setOvBaseRoutineId] = useState('')
  const [ovCourseCode, setOvCourseCode] = useState('')
  const [ovCourseName, setOvCourseName] = useState('')
  const [ovStartTime, setOvStartTime] = useState('')
  const [ovEndTime, setOvEndTime] = useState('')
  const [ovRoom, setOvRoom] = useState('')
  const [ovTeacher, setOvTeacher] = useState('')
  const [ovTargetGroup, setOvTargetGroup] = useState('ALL')
  const [ovReason, setOvReason] = useState('')

  // ─── Fetch Base Routines ─────────────────────────────────────────
  const fetchRoutines = useCallback(async () => {
    setRoutineLoading(true)
    try {
      const res = await fetch(`/api/v1/admin/routine?page=${routinePage}&limit=20`)
      const result = await res.json()
      if (result.success) {
        setRoutines(result.data)
        setRoutineTotalPages(result.meta.totalPages)
        setRoutineTotal(result.meta.total)
      }
    } catch { toast.error('Failed to load routines') }
    finally { setRoutineLoading(false) }
  }, [routinePage])

  useEffect(() => { fetchRoutines() }, [fetchRoutines])

  // ─── Fetch Overrides ─────────────────────────────────────────────
  const fetchOverrides = useCallback(async () => {
    setOverrideLoading(true)
    try {
      const res = await fetch(`/api/v1/admin/routine/overrides?page=${overridePage}&limit=20`)
      const result = await res.json()
      if (result.success) {
        setOverrides(result.data)
        setOverrideTotalPages(result.meta.totalPages)
        setOverrideTotal(result.meta.total)
      }
    } catch { toast.error('Failed to load overrides') }
    finally { setOverrideLoading(false) }
  }, [overridePage])

  useEffect(() => { if (activeTab === 'overrides') fetchOverrides() }, [activeTab, fetchOverrides])

  // ─── Base Routine CRUD ───────────────────────────────────────────
  const openCreateRoutine = () => {
    setEditRoutine(null)
    setCourseCode(courses[0]?.code || '')
    setCourseName(courses[0]?.name || '')
    setDayOfWeek('Monday')
    setStartTime(''); setEndTime(''); setRoom(''); setTeacher('')
    setTargetGroup('ALL'); setIsLab(false); setSemester('')
    setRoutineModalOpen(true)
  }

  const openEditRoutine = (item: BaseRoutine) => {
    setEditRoutine(item)
    setCourseCode(item.courseCode); setCourseName(item.courseName || '')
    setDayOfWeek(item.dayOfWeek); setStartTime(item.startTime)
    setEndTime(item.endTime); setRoom(item.room)
    setTeacher(item.teacher || ''); setTargetGroup(item.targetGroup)
    setIsLab(item.isLab); setSemester(item.semester || '')
    setRoutineModalOpen(true)
  }

  const handleRoutineSubmit = async () => {
    setRoutineSubmitting(true)
    try {
      const payload = { courseCode, courseName: courseName || undefined, dayOfWeek, startTime, endTime, room, teacher: teacher || undefined, targetGroup, isLab, semester: semester || undefined }
      const url = editRoutine ? `/api/v1/admin/routine/${editRoutine.id}` : '/api/v1/admin/routine'
      const method = editRoutine ? 'PUT' : 'POST'

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message || 'Failed')

      toast.success(editRoutine ? 'Routine updated' : 'Routine created')
      setRoutineModalOpen(false)
      fetchRoutines()
    } catch (e: any) {
      toast.error(e.message || 'Error')
    } finally { setRoutineSubmitting(false) }
  }

  const handleDeleteRoutine = async () => {
    if (!deleteRoutine) return
    try {
      const res = await fetch(`/api/v1/admin/routine/${deleteRoutine.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)
      toast.success('Routine entry deleted')
      setDeleteRoutine(null)
      fetchRoutines()
    } catch (e: any) { toast.error(e.message || 'Delete failed') }
  }

  // ─── Override CRUD ───────────────────────────────────────────────
  const openCreateOverride = () => {
    setOvDate(''); setOvType('CANCELLED'); setOvBaseRoutineId('')
    setOvCourseCode(''); setOvCourseName(''); setOvStartTime('')
    setOvEndTime(''); setOvRoom(''); setOvTeacher('')
    setOvTargetGroup('ALL'); setOvReason('')
    setOverrideModalOpen(true)
  }

  const handleBaseRoutineSelect = (baseId: string) => {
    setOvBaseRoutineId(baseId)
    const base = routines.find(r => r.id === baseId)
    if (base) {
      setOvCourseCode(base.courseCode)
      setOvCourseName(base.courseName || '')
      setOvStartTime(base.startTime)
      setOvEndTime(base.endTime)
      setOvRoom(base.room)
      setOvTeacher(base.teacher || '')
      setOvTargetGroup(base.targetGroup)
    }
  }

  const handleOverrideSubmit = async () => {
    setOverrideSubmitting(true)
    try {
      const payload: Record<string, any> = {
        date: ovDate,
        type: ovType,
        targetGroup: ovTargetGroup,
        reason: ovReason || undefined,
      }
      if (ovBaseRoutineId) payload.baseRoutineId = ovBaseRoutineId
      if (ovCourseCode) payload.courseCode = ovCourseCode
      if (ovCourseName) payload.courseName = ovCourseName
      if (ovStartTime) payload.startTime = ovStartTime
      if (ovEndTime) payload.endTime = ovEndTime
      if (ovRoom) payload.room = ovRoom
      if (ovTeacher) payload.teacher = ovTeacher

      const res = await fetch('/api/v1/admin/routine/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message || 'Failed')

      toast.success('Override created')
      setOverrideModalOpen(false)
      fetchOverrides()
    } catch (e: any) {
      toast.error(e.message || 'Error')
    } finally { setOverrideSubmitting(false) }
  }

  const handleDeleteOverride = async () => {
    if (!deleteOverride) return
    try {
      const res = await fetch(`/api/v1/admin/routine/overrides/${deleteOverride.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message)
      toast.success('Override removed')
      setDeleteOverride(null)
      fetchOverrides()
    } catch (e: any) { toast.error(e.message || 'Delete failed') }
  }

  // ─── Table Columns ───────────────────────────────────────────────
  const routineColumns: Column<BaseRoutine>[] = [
    { key: 'courseCode', label: 'Course', render: (r) => (
      <div>
        <span className="font-bold text-slate-800 dark:text-slate-100">{r.courseCode}</span>
        {r.courseName && <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.courseName}</span>}
      </div>
    )},
    { key: 'dayOfWeek', label: 'Day' },
    { key: 'startTime', label: 'Time', render: (r) => (
      <span className="flex items-center gap-1.5 text-sm">
        <Clock className="w-3.5 h-3.5 text-emerald-500" />
        {r.startTime} – {r.endTime}
      </span>
    )},
    { key: 'room', label: 'Room', render: (r) => (
      <span className="flex items-center gap-1.5 text-sm">
        <MapPin className="w-3.5 h-3.5 text-amber-500" />
        {r.room}
      </span>
    )},
    { key: 'targetGroup', label: 'Group', render: (r) => (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${groupBadge[r.targetGroup] || groupBadge.ALL}`}>
        {r.isLab && <FlaskConical className="w-3 h-3" />}
        {r.targetGroup}
      </span>
    )},
    { key: 'teacher', label: 'Teacher', render: (r) => <span className="text-sm text-slate-600 dark:text-slate-400">{r.teacher || '—'}</span> },
  ]

  const overrideColumns: Column<RoutineOverride>[] = [
    { key: 'date', label: 'Date', render: (o) => (
      <span className="font-bold text-sm">{new Date(o.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
    )},
    { key: 'type', label: 'Type', render: (o) => (
      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${overrideTypeBadge[o.type] || ''}`}>
        {o.type.replace('_', ' ')}
      </span>
    )},
    { key: 'courseCode', label: 'Course', render: (o) => (
      <span className="text-sm font-medium">{o.baseRoutine?.courseCode || o.courseCode || '—'}</span>
    )},
    { key: 'reason', label: 'Reason', render: (o) => (
      <span className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px] block">{o.reason || '—'}</span>
    )},
    { key: 'targetGroup', label: 'Group', render: (o) => (
      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${groupBadge[o.targetGroup] || groupBadge.ALL}`}>{o.targetGroup}</span>
    )},
  ]

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Routine Management"
        subtitle="Manage semester schedule and temporary changes"
        icon={CalendarClock}
        actionLabel={activeTab === 'schedule' ? 'Add Class' : 'Add Override'}
        onAction={activeTab === 'schedule' ? openCreateRoutine : openCreateOverride}
        actionIcon={Plus}
      />

      {/* Tab Selector */}
      <div className="flex gap-2 p-1.5 bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-white/40 dark:border-slate-700/30 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'schedule'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/40'
          }`}
        >
          <span className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            Base Schedule ({routineTotal})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('overrides')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'overrides'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/40'
          }`}
        >
          <span className="flex items-center gap-2">
            <Ban className="w-4 h-4" />
            Overrides ({overrideTotal})
          </span>
        </button>
      </div>

      {/* Base Schedule Tab */}
      {activeTab === 'schedule' && (
        <AdminDataTable<BaseRoutine>
          columns={routineColumns}
          data={routines}
          loading={routineLoading}
          emptyMessage="No routine entries yet. Add the semester schedule."
          page={routinePage}
          totalPages={routineTotalPages}
          onPageChange={setRoutinePage}
          getId={(item) => item.id}
          actions={(item) => (
            <div className="flex gap-1">
              <button onClick={() => openEditRoutine(item)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer" title="Edit">
                <Pencil className="w-4 h-4 text-blue-500" />
              </button>
              <button onClick={() => setDeleteRoutine(item)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer" title="Delete">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          )}
        />
      )}

      {/* Overrides Tab */}
      {activeTab === 'overrides' && (
        <AdminDataTable<RoutineOverride>
          columns={overrideColumns}
          data={overrides}
          loading={overrideLoading}
          emptyMessage="No active overrides. The base schedule is running as-is."
          page={overridePage}
          totalPages={overrideTotalPages}
          onPageChange={setOverridePage}
          getId={(item) => item.id}
          actions={(item) => (
            <button onClick={() => setDeleteOverride(item)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer" title="Remove Override">
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          )}
        />
      )}

      {/* ─── Base Routine Modal ────────────────────────────────────── */}
      <AdminModal
        open={routineModalOpen}
        onClose={() => setRoutineModalOpen(false)}
        title={editRoutine ? 'Edit Routine Entry' : 'Add New Class'}
        onSubmit={handleRoutineSubmit}
        submitLoading={routineSubmitting}
      >
        <div className="grid grid-cols-2 gap-4">
          <AdminFormField 
            label="Course Code" 
            required 
            type="select" 
            value={courseCode} 
            onChange={(val) => {
              setCourseCode(val)
              const c = courses.find((c) => c.code === val)
              if (c) setCourseName(c.name)
            }} 
            options={courses.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` }))} 
          />
          <AdminFormField label="Course Name (Auto-filled)" type="text" value={courseName} onChange={setCourseName} placeholder="Engineering Drawing" />
        </div>

        <AdminFormField label="Day of Week" required type="select" value={dayOfWeek} onChange={setDayOfWeek} options={DAYS.map(d => ({ value: d, label: d }))} />

        <div className="grid grid-cols-2 gap-4">
          <AdminFormField label="Start Time" required type="text" value={startTime} onChange={setStartTime} placeholder="08:00" />
          <AdminFormField label="End Time" required type="text" value={endTime} onChange={setEndTime} placeholder="09:30" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <AdminFormField label="Room" required type="text" value={room} onChange={setRoom} placeholder="Room 301" />
          <AdminFormField label="Teacher" type="text" value={teacher} onChange={setTeacher} placeholder="Dr. Rahman" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <AdminFormField label="Lab Group" required type="select" value={targetGroup} onChange={setTargetGroup} options={GROUPS} />
          <AdminFormField label="Semester" type="text" value={semester} onChange={setSemester} placeholder="Spring 2026" />
        </div>

        <AdminFormField label="Lab Course (Odd/Even split)" type="checkbox" checked={isLab} onChange={setIsLab} />
      </AdminModal>

      <AdminModal
        open={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title="Create Schedule Override"
        onSubmit={handleOverrideSubmit}
        submitLoading={overrideSubmitting}
      >
        <div className="grid grid-cols-2 gap-4">
          <AdminFormField label="Date" required type="text" value={ovDate} onChange={setOvDate} placeholder="2026-04-20" />
          <AdminFormField label="Override Type" required type="select" value={ovType} onChange={setOvType} options={OVERRIDE_TYPES} />
        </div>

        {/* Link to base class (for cancel/room/time change) */}
        {ovType !== 'MAKEUP' && routines.length > 0 && (
          <AdminFormField
            label="Affected Class"
            type="select"
            value={ovBaseRoutineId}
            onChange={setOvBaseRoutineId}
            placeholder="Select class..."
            options={routines.map(r => ({
              value: r.id,
              label: `${r.courseCode} — ${r.dayOfWeek} ${r.startTime}–${r.endTime} (${r.targetGroup})`
            }))}
          />
        )}

        {/* For MAKEUP: new class details */}
        {ovType === 'MAKEUP' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <AdminFormField 
                label="Course Code" 
                required 
                type="select" 
                value={ovCourseCode} 
                onChange={(val) => {
                  setOvCourseCode(val)
                  const c = courses.find((c) => c.code === val)
                  if (c) setOvCourseName(c.name)
                }} 
                options={courses.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` }))} 
              />
              <AdminFormField label="Course Name" type="text" value={ovCourseName} onChange={setOvCourseName} placeholder="Engineering Drawing" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <AdminFormField label="Start Time" required type="text" value={ovStartTime} onChange={setOvStartTime} placeholder="08:00" />
              <AdminFormField label="End Time" required type="text" value={ovEndTime} onChange={setOvEndTime} placeholder="09:30" />
            </div>
            <AdminFormField label="Room" type="text" value={ovRoom} onChange={setOvRoom} placeholder="Room 301" />
          </>
        )}

        {/* For ROOM_CHANGE */}
        {ovType === 'ROOM_CHANGE' && (
          <AdminFormField label="New Room" required type="text" value={ovRoom} onChange={setOvRoom} placeholder="New room number" />
        )}

        {/* For TIME_CHANGE */}
        {ovType === 'TIME_CHANGE' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <AdminFormField label="New Start Time" required type="text" value={ovStartTime} onChange={setOvStartTime} placeholder="08:00" />
              <AdminFormField label="New End Time" required type="text" value={ovEndTime} onChange={setOvEndTime} placeholder="09:30" />
            </div>
            <AdminFormField label="New Room (optional)" type="text" value={ovRoom} onChange={setOvRoom} placeholder="Leave empty to keep same" />
          </>
        )}

        <AdminFormField label="Lab Group" type="select" value={ovTargetGroup} onChange={setOvTargetGroup} options={GROUPS} />

        <AdminFormField label="Reason" type="text" value={ovReason} onChange={setOvReason} placeholder="e.g., Sir is on leave / Extra class for CT prep" />
      </AdminModal>

      {/* ─── Confirm Dialogs ───────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteRoutine}
        title="Delete Routine Entry"
        message={`Remove "${deleteRoutine?.courseCode} — ${deleteRoutine?.dayOfWeek} ${deleteRoutine?.startTime}" from the schedule?`}
        onConfirm={handleDeleteRoutine}
        onClose={() => setDeleteRoutine(null)}
      />
      <ConfirmDialog
        open={!!deleteOverride}
        title="Remove Override"
        message={`Remove this ${deleteOverride?.type.replace('_', ' ').toLowerCase()} override?`}
        onConfirm={handleDeleteOverride}
        onClose={() => setDeleteOverride(null)}
      />
    </div>
  )
}
