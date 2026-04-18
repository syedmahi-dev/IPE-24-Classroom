'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { ScrollText, ChevronDown, ChevronRight, Download } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminDataTable, Column } from '@/components/admin/AdminDataTable'

type AuditEntry = {
  id: string
  actorId: string
  actor: { id: string; name?: string | null; email?: string | null; avatarUrl?: string | null } | null
  action: string
  targetType: string
  targetId?: string | null
  metadata: string | null
  createdAt: string | Date
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  UPDATE: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
  DELETE: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
  CLOSE: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
}

const ACTION_OPTIONS = ['CREATE', 'UPDATE', 'DELETE', 'CLOSE']

export function AdminAuditLogClient({ userRole }: { userRole: string }) {
  const [data, setData] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30',
        ...(search && { search }),
        ...(filterAction && { action: filterAction }),
      })
      const res = await fetch(`/api/v1/admin/audit-log?${params}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
        setTotalPages(result.meta.totalPages)
        setTotal(result.meta.total)
      }
    } catch { toast.error('Failed to load audit log') }
    finally { setLoading(false) }
  }, [page, search, filterAction])

  useEffect(() => { fetchData() }, [fetchData])

  const exportCSV = async () => {
    try {
      // Fetch all entries (up to 1000 for export)
      const res = await fetch('/api/v1/admin/audit-log?limit=100&page=1')
      const result = await res.json()
      if (!result.success) throw new Error('Failed to fetch')

      const entries = result.data as AuditEntry[]
      const csv = [
        'Timestamp,Actor,Email,Action,Target Type,Target ID,Metadata',
        ...entries.map((e) => {
          const actorName = e.actor?.name?.trim() || 'Unknown'
          const actorEmail = e.actor?.email?.trim() || 'unknown@iut-dhaka.edu'
          const targetId = e.targetId ?? ''
          const timestamp = new Date(e.createdAt)
          const iso = Number.isNaN(timestamp.valueOf()) ? '' : timestamp.toISOString()
          return `"${iso}","${actorName}","${actorEmail}","${e.action}","${e.targetType}","${targetId}","${(e.metadata || '').replace(/"/g, '""')}"`
        }),
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Audit log exported')
    } catch { toast.error('Export failed') }
  }

  const columns: Column<AuditEntry>[] = [
    {
      key: 'actor',
      label: 'Actor',
      render: (item) => {
        const displayName = item.actor?.name?.trim() || 'Unknown'
        const displayEmail = item.actor?.email?.trim() || 'unknown@iut-dhaka.edu'
        const avatarInitial = displayName.charAt(0).toUpperCase()

        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
              {avatarInitial}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{displayName}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">{displayEmail}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'action',
      label: 'Action',
      render: (item) => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${ACTION_COLORS[item.action] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
          {item.action}
        </span>
      ),
    },
    {
      key: 'targetType',
      label: 'Target',
      render: (item) => {
        const targetId = item.targetId ?? ''
        return (
          <div>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{item.targetType}</span>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              {targetId ? `${targetId.slice(0, 12)}...` : '—'}
            </p>
          </div>
        )
      },
    },
    {
      key: 'metadata',
      label: 'Details',
      hideOnMobile: true,
      render: (item) => {
        if (!item.metadata) return <span className="text-xs text-slate-400">—</span>
        const isExpanded = expandedId === item.id
        return (
          <button
            onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : item.id) }}
            className="flex items-center gap-1 text-xs font-bold text-admin-purple hover:text-indigo-600 transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {isExpanded ? 'Hide' : 'View'}
          </button>
        )
      },
    },
    {
      key: 'createdAt',
      label: 'Time',
      render: (item) => {
        const d = new Date(item.createdAt)
        if (Number.isNaN(d.valueOf())) {
          return <span className="text-xs text-slate-400">—</span>
        }
        return (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <p className="font-semibold">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
            <p className="font-medium">{d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      <AdminPageHeader
        icon={ScrollText}
        title="Audit Log"
        subtitle="Track all administrative actions across the platform"
        {...(userRole === 'super_admin' ? {
          actionLabel: 'Export CSV',
          actionIcon: Download,
          onAction: exportCSV,
        } : {})}
        badge={`${total} entries`}
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
        searchPlaceholder="Search by actor name..."
        emptyTitle="No audit entries"
        emptyMessage="Admin actions will appear here automatically."
        getId={(item) => item.id}
        onRowClick={(item) => {
          if (item.metadata) setExpandedId(expandedId === item.id ? null : item.id)
        }}
        filterBar={
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}
            className="px-4 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer outline-none focus:ring-4 focus:ring-admin-purple/10 transition-all"
          >
            <option value="">All Actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        }
      />

      {/* Expanded metadata display */}
      {expandedId && (() => {
        const entry = data.find((e) => e.id === expandedId)
        if (!entry?.metadata) return null
        let parsed: any
        try { parsed = JSON.parse(entry.metadata) } catch { parsed = entry.metadata }
        return (
          <div className="glass p-6 rounded-2xl animate-slide-up">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Metadata</h4>
            <pre className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl overflow-x-auto">
              {typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)}
            </pre>
          </div>
        )
      })()}
    </div>
  )
}
