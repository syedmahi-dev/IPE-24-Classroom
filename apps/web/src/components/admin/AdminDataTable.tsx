'use client'

import { Search, ChevronLeft, ChevronRight, Loader2, Inbox, MoreVertical } from 'lucide-react'

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
        <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/50 p-4 rounded-2xl flex flex-col lg:flex-row gap-4 items-center shadow-lg hover:shadow-xl transition-shadow duration-300">
          {onSearchChange && (
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-purple-500 dark:group-focus-within:text-purple-400 transition-colors" />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                data-testid="admin-table-search-input"
                className="w-full pl-14 pr-6 py-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-700/50 group-focus-within:border-purple-400 dark:group-focus-within:border-purple-500/40 rounded-xl shadow-md focus:bg-white dark:focus:bg-slate-950/60 focus:ring-4 focus:ring-purple-500/10 dark:focus:ring-purple-500/20 outline-none text-slate-800 dark:text-slate-100 font-bold text-sm transition-all placeholder:font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          )}
          {filterBar && (
            <div data-testid="admin-table-filter-bar" className="flex gap-2 items-center">
              {filterBar}
            </div>
          )}
        </div>
      )}

      <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/50 rounded-2xl overflow-hidden shadow-lg relative min-h-[200px]">
        {loading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-2xl">
            <Loader2 className="w-8 h-8 text-purple-500 dark:text-purple-400 animate-spin mb-3" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">Loading...</p>
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-900/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-6 py-4 text-left text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:text-slate-700 dark:hover:text-slate-200 transition-colors ${col.className ?? ''}`}
                  >
                    {col.label}
                  </th>
                ))}
                {actions && (
                  <th className="px-6 py-4 text-right text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
              {data.map((item) => (
                <tr
                  key={getId(item)}
                  onClick={() => onRowClick?.(item)}
                  className={`group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-200 ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors ${col.className ?? ''}`}>
                      {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
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
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/30">
          {data.map((item) => (
            <div
              key={getId(item)}
              onClick={() => onRowClick?.(item)}
              className={`p-5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-200 group ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              <div className="space-y-3">
                {columns.filter((c) => !c.hideOnMobile).map((col) => (
                  <div key={col.key} className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{col.label}</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-100 group-hover:text-slate-900 dark:group-hover:text-slate-50 transition-colors">
                      {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                    </span>
                  </div>
                ))}
              </div>
              {actions && (
                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/30">
                  {actions(item)}
                </div>
              )}
            </div>
          ))}
        </div>

        {!loading && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/10 dark:from-purple-500/20 to-purple-600/5 dark:to-purple-600/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center mb-5 shadow-lg group hover:shadow-xl transition-shadow">
              <Inbox className="w-8 h-8 text-purple-400 dark:text-purple-300 group-hover:text-purple-500 dark:group-hover:text-purple-200 transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{emptyTitle}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-sm">{emptyMessage}</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/50 p-3 rounded-2xl shadow-lg">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl border border-slate-200 dark:border-slate-600/50 hover:border-slate-300 dark:hover:border-slate-500/50 shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Page</span>
            <span className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-700 text-white font-black text-xs rounded-lg shadow-lg">{page}</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">of {totalPages}</span>
            {total !== undefined && <span className="text-xs font-medium text-slate-400 dark:text-slate-500 ml-2">({total} total)</span>}
          </div>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl border border-slate-200 dark:border-slate-600/50 hover:border-slate-300 dark:hover:border-slate-500/50 shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
