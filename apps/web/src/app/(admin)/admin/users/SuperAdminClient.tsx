'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { addWhitelistedStudent, changeUserRole } from './actions'
import { Users, Shield, ShieldAlert, KeyRound, UserPlus } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminDataTable, Column } from '@/components/admin/AdminDataTable'
import { AdminModal } from '@/components/admin/AdminModal'
import { AdminFormField } from '@/components/admin/AdminFormField'

type DbUser = {
  id: string
  name?: string | null
  email?: string | null
  role: string
  createdAt: Date | string
}

const ROLE_STYLES: Record<string, string> = {
  super_admin: 'bg-slate-900 text-amber-400 border border-slate-700',
  admin: 'bg-indigo-100 text-indigo-700',
  student: 'bg-slate-100 text-slate-600',
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin (CR)',
  student: 'Student',
}

export function SuperAdminClient({ initialUsers }: { initialUsers: DbUser[] }) {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')

  const normalizedSearch = search.toLowerCase()
  const filteredUsers = initialUsers.filter((user) => {
    const email = (user.email ?? '').toLowerCase()
    const name = (user.name ?? '').toLowerCase()
    return email.includes(normalizedSearch) || name.includes(normalizedSearch)
  })

  const openAddModal = () => {
    setNewEmail('')
    setNewName('')
    setModalOpen(true)
  }

  const handleAddStudent = async () => {
    if (!newEmail.includes('@')) { toast.error('Valid email is required.'); return }
    if (!newName.trim()) { toast.error('Name is required.'); return }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('email', newEmail.trim())
      formData.append('name', newName.trim())
      const res = await addWhitelistedStudent(formData)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Student whitelisted successfully!')
        setModalOpen(false)
      }
    } catch {
      toast.error('Failed to add student')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    toast.loading('Updating role...', { id: `role-${userId}` })
    const res = await changeUserRole(userId, newRole)
    if (res.error) {
      toast.error(res.error, { id: `role-${userId}` })
    } else {
      toast.success('Role updated!', { id: `role-${userId}` })
    }
  }

  const columns: Column<DbUser>[] = [
    {
      key: 'name',
      label: 'User',
      render: (user) => {
        const displayName = user.name?.trim() || 'Unnamed User'
        const displayEmail = user.email?.trim() || 'unknown@iut-dhaka.edu'
        const avatarInitial = displayName.charAt(0).toUpperCase()

        return (
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
              user.role === 'super_admin' ? 'bg-amber-100 text-amber-700' :
              user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {avatarInitial}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{displayName}</p>
              <p className="text-[11px] text-slate-400 font-medium">{displayEmail}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'role',
      label: 'Role',
      render: (user) => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${ROLE_STYLES[user.role] || ROLE_STYLES.student}`}>
          {user.role === 'super_admin' && <ShieldAlert className="w-3 h-3" />}
          {user.role === 'admin' && <Shield className="w-3 h-3" />}
          {ROLE_LABELS[user.role] || user.role}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Joined',
      hideOnMobile: true,
      render: (user) => (
        <span className="text-xs font-medium text-slate-500">
          {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      {/* Super Admin Banner */}
      <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl relative overflow-hidden border border-slate-700/50">
        <div className="absolute -right-12 -top-12 opacity-10">
          <ShieldAlert className="w-64 h-64 text-amber-500" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-black uppercase tracking-widest mb-4">
            <KeyRound className="w-3.5 h-3.5" /> High Privilege Area
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500">
            User Management
          </h1>
          <p className="text-slate-400 mt-2 font-medium max-w-xl text-sm md:text-base leading-relaxed">
            Manage authenticated access and elevate students to class representatives.
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: 'Total Users', value: initialUsers.length, color: 'from-blue-500 to-cyan-500', icon: Users },
          { label: 'Admins (CRs)', value: initialUsers.filter(u => u.role === 'admin').length, color: 'from-indigo-500 to-purple-500', icon: Shield },
          { label: 'Students', value: initialUsers.filter(u => u.role === 'student').length, color: 'from-emerald-500 to-teal-500', icon: Users },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="glass p-6 rounded-[2rem] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 bg-white/50 border border-white/60">
              <div className={`absolute -right-6 -top-6 w-28 h-28 bg-gradient-to-br ${stat.color} opacity-10 rounded-full group-hover:scale-150 transition-transform duration-700`} />
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <p data-testid="stat-value" className="text-3xl font-black text-slate-800 mt-1 tracking-tight">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* User Data Table */}
      <AdminDataTable
        columns={columns}
        data={filteredUsers}
        loading={false}
        page={1}
        totalPages={1}
        total={filteredUsers.length}
        onPageChange={() => {}}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search users by name or email..."
        emptyTitle="No users found"
        emptyMessage="No students match your search criteria."
        getId={(user) => user.id}
        actions={(user) => (
          user.role === 'super_admin' ? (
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest cursor-not-allowed opacity-60">
              Protected
            </span>
          ) : (
            <select
              value={user.role}
              onChange={(e) => handleRoleChange(user.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer outline-none border transition-all ${
                user.role === 'admin'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <option value="student">Student</option>
              <option value="admin">Admin (CR)</option>
            </select>
          )
        )}
        filterBar={
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 active:scale-95 transition-all whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            Add Student
          </button>
        }
      />

      {/* Add Student Modal */}
      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Whitelist Student"
        description="Add a student to allow Google Sign-In access. Only whitelisted users can log in."
        onSubmit={handleAddStudent}
        submitLabel="Whitelist User"
        submitLoading={submitting}
        submitDisabled={!newEmail || !newName}
        maxWidth="max-w-lg"
      >
        <div className="space-y-5">
          <AdminFormField
            type="email"
            label="Student Email"
            value={newEmail}
            onChange={setNewEmail}
            placeholder="student@iut-dhaka.edu"
            required
          />
          <AdminFormField
            type="text"
            label="Full Name"
            value={newName}
            onChange={setNewName}
            placeholder="e.g. Md. Ahmed Khan"
            required
          />
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/60 flex items-start gap-3">
            <Shield className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
              Only users added to this whitelist can sign in with their Google accounts. Students are added with the <strong>Student</strong> role by default.
            </p>
          </div>
        </div>
      </AdminModal>
    </div>
  )
}
