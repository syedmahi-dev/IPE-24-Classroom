'use client'

import { Search, ChevronLeft, ChevronRight, Loader2, Inbox } from 'lucide-react'

export interface Column<T> {
  key: string
  label: string
  render?: (item: T) => React.ReactNode
  className?: string
  hideOnMobile?: boolean
}

interface AdminDataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  page: number
  totalPages: number
  total?: number
  onPageChange: (page: number) => void
  search?: string
  onSearchChange?: (search: string) => void
  searchPlaceholder?: string
  emptyTitle?: string
  emptyMessage?: string
  actions?: (item: T) => React.ReactNode
  onRowClick?: (item: T) => void
  filterBar?: React.ReactNode
  getId: (item: T) => string
}

export function AdminDataTable<T>({
  columns,
  data,
  loading = false,
  page,
  totalPages,
  total,
  onPageChange,
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  emptyTitle = 'No items found',
  emptyMessage = 'Try adjusting your filters or create a new entry.',
  actions,
  onRowClick,
  filterBar,
  getId,
}: AdminDataTableProps<T>) {
  return (
    <div className="space-y-5">
      {(onSearchChange || filterBar) && (
        <div className="glass p-4 rounded-[2rem] flex flex-col lg:flex-row gap-4 items-center shadow-sm">
          {onSearchChange && (
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-admin-purple transition-colors" />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                data-testid="admin-table-search-input"
                className="w-full pl-14 pr-6 py-3.5 bg-white/50 border border-white rounded-[1.5rem] shadow-sm focus:bg-white focus:ring-4 focus:ring-admin-purple/10 focus:border-admin-purple/30 outline-none text-slate-700 font-bold text-sm transition-all placeholder:font-medium placeholder:text-slate-400"
              />
            </div>
          )}
          {filterBar && (
            <div data-testid="admin-table-filter-bar">
              {filterBar}
            </div>
          )}
        </div>
      )}

      <div className="glass rounded-[2rem] overflow-hidden shadow-sm relative min-h-[200px]">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-[2rem]">
            <Loader2 className="w-8 h-8 text-admin-purple animate-spin mb-3" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading...</p>
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest ${col.className ?? ''}`}
                  >
                    {col.label}
                  </th>
                ))}
                {actions && (
                  <th className="px-6 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((item) => (
                <tr
                  key={getId(item)}
                  onClick={() => onRowClick?.(item)}
                  className={`group hover:bg-white/60 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-6 py-4 text-sm font-semibold text-slate-700 ${col.className ?? ''}`}>
                      {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {actions(item)}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-50">
          {data.map((item) => (
            <div
              key={getId(item)}
              onClick={() => onRowClick?.(item)}
              className={`p-5 hover:bg-white/60 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              <div className="space-y-3">
                {columns.filter((c) => !c.hideOnMobile).map((col) => (
                  <div key={col.key} className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{col.label}</span>
                    <span className="text-sm font-semibold text-slate-700">
                      {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                    </span>
                  </div>
                ))}
              </div>
              {actions && (
                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                  {actions(item)}
                </div>
              )}
            </div>
          ))}
        </div>

        {!loading && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-5 shadow-sm">
              <Inbox className="w-7 h-7 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">{emptyTitle}</h3>
            <p className="text-sm text-slate-500 font-medium max-w-sm">{emptyMessage}</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between glass p-3 rounded-2xl shadow-sm">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl border border-slate-100 shadow-sm disabled:opacity-40 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Page</span>
            <span className="w-8 h-8 flex items-center justify-center bg-slate-800 text-white font-black text-xs rounded-lg shadow">{page}</span>
            <span className="text-xs font-medium text-slate-500">of {totalPages}</span>
            {total !== undefined && <span className="text-xs font-medium text-slate-400 ml-2">({total} total)</span>}
          </div>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl border border-slate-100 shadow-sm disabled:opacity-40 active:scale-95 transition-all"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
