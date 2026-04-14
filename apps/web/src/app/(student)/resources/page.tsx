'use client'

import { useEffect, useState } from 'react'
import { FolderOpen, Search, Download, FileText, Loader2, Link as LinkIcon, Database } from 'lucide-react'

export default function ResourcesPage() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchFiles = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/files?page=${page}&limit=12`)
      if (!res.ok) throw new Error('Network error')
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message || 'Failed')
      setFiles(result.data)
      setTotalPages(result.meta.totalPages)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [page])

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="relative group overflow-hidden rounded-[2.5rem]">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
        <div className="relative glass p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8 z-10">
          <div className="text-center md:text-left space-y-3 flex-1 flex items-center md:items-start flex-col">
             <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/40 transform -rotate-3 mb-6">
                <Database className="w-8 h-8" />
             </div>
             <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Resource Library</h1>
             <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-xl leading-relaxed text-center md:text-left">
               Access lecture notes, assignments, and past papers instantly.
             </p>
          </div>
        </div>
      </div>

      <div className="glass p-4 rounded-[2rem] shadow-sm relative z-20">
        <div className="relative w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500" />
          <input
            type="text"
            placeholder="Search by file name or course code..."
            className="w-full pl-14 pr-6 py-4 bg-white/50 dark:bg-slate-800/50 border border-white dark:border-slate-700/50 rounded-[1.5rem] shadow-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 dark:text-slate-200"
          />
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Gathering Books...</p>
        </div>
      )}

      {error && <div className="text-center p-6 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-[2rem] font-bold">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {files.map((file: any) => (
            <div key={file.id} className="glass rounded-[2rem] p-6 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/5 dark:hover:shadow-blue-900/20 transition-all group flex flex-col items-center text-center cursor-pointer">
              <div className="w-16 h-16 rounded-[1.5rem] bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner shadow-blue-500/10">
                 {file.type === 'document' ? <FileText className="w-8 h-8" /> : <LinkIcon className="w-8 h-8" />}
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight min-h-[2.5rem]">{file.title}</h3>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{file.course?.code || 'General'}</p>
              <div className="mt-6 w-full pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{file.size}</span>
                <button className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white dark:hover:text-white transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center glass p-4 rounded-[2rem] mt-8 shadow-sm">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-6 py-3 bg-white dark:bg-slate-800 font-bold rounded-xl shadow-sm text-slate-600 dark:text-slate-300 disabled:opacity-50">Prev</button>
          <span className="font-bold text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-6 py-3 bg-white dark:bg-slate-800 font-bold rounded-xl shadow-sm text-slate-600 dark:text-slate-300 disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  )
}
