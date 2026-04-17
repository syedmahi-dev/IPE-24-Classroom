'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  FolderOpen, Search, Download, FileText, Loader2,
  Link as LinkIcon, Database, ChevronRight, ArrowLeft,
  BookOpen, ClipboardList, ScrollText, FileCheck, Files,
  GraduationCap, Eye,
} from 'lucide-react'

type Folder = {
  id: string
  name: string
  type: 'course' | 'category'
  courseId?: string
  courseCode?: string
  category?: string
  fileCount: number
  latestUpload: string | null
}

type FileRecord = {
  id: string
  name: string
  mimeType: string
  sizeBytes: number
  category: string
  course: { id: string; code: string; name: string } | null
  uploadedBy: { id: string; name: string }
  createdAt: string
}

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  lecture_notes: BookOpen,
  assignment: ClipboardList,
  past_paper: ScrollText,
  syllabus: FileCheck,
  other: Files,
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  lecture_notes: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-500 dark:text-blue-400', gradient: 'from-blue-500 to-blue-600' },
  assignment: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-500 dark:text-amber-400', gradient: 'from-amber-500 to-orange-500' },
  past_paper: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-500 dark:text-purple-400', gradient: 'from-purple-500 to-violet-600' },
  syllabus: { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-500 dark:text-teal-400', gradient: 'from-teal-500 to-emerald-500' },
  other: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500 dark:text-slate-400', gradient: 'from-slate-400 to-slate-500' },
}

const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS.other

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ResourcesPage() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [files, setFiles] = useState<FileRecord[]>([])
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')

  // Fetch folders (top-level view)
  const fetchFolders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/files/folders')
      if (!res.ok) throw new Error('Network error')
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message || 'Failed')
      setFolders(Array.isArray(result.data) ? result.data : [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch files inside a folder
  const fetchFiles = useCallback(async (folder: Folder, pageNum: number, searchQuery: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        folderType: folder.type,
      })
      if (folder.type === 'course' && folder.courseId) {
        params.set('courseId', folder.courseId)
      } else if (folder.type === 'category' && folder.category) {
        params.set('category', folder.category)
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }

      const res = await fetch(`/api/v1/files?${params}`)
      if (!res.ok) throw new Error('Network error')
      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message || 'Failed')
      setFiles(Array.isArray(result.data) ? result.data : [])
      const parsedTotalPages = Number(result?.meta?.totalPages)
      setTotalPages(Number.isFinite(parsedTotalPages) && parsedTotalPages > 0 ? parsedTotalPages : 1)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!activeFolder) {
      fetchFolders()
    }
  }, [activeFolder, fetchFolders])

  useEffect(() => {
    if (activeFolder) {
      fetchFiles(activeFolder, page, search)
    }
  }, [activeFolder, page, search, fetchFiles])

  const openFolder = (folder: Folder) => {
    setActiveFolder(folder)
    setPage(1)
    setSearch('')
    setFiles([])
  }

  const goBack = () => {
    setActiveFolder(null)
    setPage(1)
    setSearch('')
    setFiles([])
  }

  const getFolderIcon = (folder: Folder) => {
    if (folder.type === 'course') return GraduationCap
    return CATEGORY_ICONS[folder.category || 'other'] || Files
  }

  const getFolderColor = (folder: Folder) => {
    if (folder.type === 'course') {
      return { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-500 dark:text-indigo-400', gradient: 'from-indigo-500 to-blue-600' }
    }
    return CATEGORY_COLORS[folder.category || 'other'] || DEFAULT_CATEGORY_COLOR
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 md:space-y-8 lg:space-y-10 pb-6 md:pb-20 min-w-0">
      {/* Hero Section */}
      <div className="relative group overflow-hidden rounded-2xl md:rounded-[2.5rem]">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-700" />
        <div className="relative glass p-5 md:p-14 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 z-10">
          <div className="text-center md:text-left space-y-2 md:space-y-3 flex-1 flex items-center md:items-start flex-col">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/40 transform -rotate-3 mb-2 md:mb-6">
              <Database className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <h1 className="text-2xl md:text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Resource Library
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-lg max-w-xl leading-relaxed text-center md:text-left">
              Access lecture notes, assignments, and past papers — organized by course.
            </p>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      {activeFolder && (
        <div className="glass p-3 md:p-4 rounded-2xl md:rounded-[2rem] shadow-sm flex items-center gap-2 md:gap-3">
          <button
            onClick={goBack}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/60 dark:bg-slate-800/60 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-bold text-xs md:text-sm min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            All Folders
          </button>
          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">
            {activeFolder.name}
          </span>
        </div>
      )}

      {/* Search (only inside a folder) */}
      {activeFolder && (
        <div className="glass p-4 rounded-[2rem] shadow-sm relative z-20">
          <div className="relative w-full group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500" />
            <input
              type="search"
              aria-label="Search files in this folder"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search files in this folder..."
              className="w-full pl-14 pr-6 py-4 bg-white/50 dark:bg-slate-800/50 border border-white dark:border-slate-700/50 rounded-[1.5rem] shadow-sm focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 dark:text-slate-200"
            />
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            {activeFolder ? 'Loading Files...' : 'Loading Folders...'}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center p-6 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-[2rem] font-bold">
          {error}
        </div>
      )}

      {/* ===== FOLDER VIEW (Top Level) ===== */}
      {!loading && !error && !activeFolder && (
        <>
          {folders.length === 0 ? (
            <div className="glass rounded-[2rem] p-16 text-center">
              <FolderOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-black text-slate-600 dark:text-slate-300">No resources yet</h3>
              <p className="text-slate-400 dark:text-slate-500 mt-2 font-medium">
                Files will appear here once uploaded by your admin or CR.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {folders.map((folder) => {
                const Icon = getFolderIcon(folder)
                const colors = getFolderColor(folder)
                return (
                  <button
                    key={folder.id}
                    onClick={() => openFolder(folder)}
                    className="glass rounded-[2rem] p-6 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/5 dark:hover:shadow-blue-900/20 transition-all group text-left w-full"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-[1.25rem] ${colors.bg} ${colors.text} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-inner`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight line-clamp-2">
                          {folder.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                            {folder.fileCount} {folder.fileCount === 1 ? 'file' : 'files'}
                          </span>
                          {folder.type === 'course' && (
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-gradient-to-r ${colors.gradient} text-white`}>
                              Course
                            </span>
                          )}
                          {folder.type === 'category' && (
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-gradient-to-r ${colors.gradient} text-white`}>
                              {folder.category?.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        {folder.latestUpload && (
                          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1.5">
                            Updated {formatDate(folder.latestUpload)}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ===== FILE VIEW (Inside a folder) ===== */}
      {!loading && !error && activeFolder && (
        <>
          {files.length === 0 ? (
            <div className="glass rounded-[2rem] p-16 text-center">
              <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-black text-slate-600 dark:text-slate-300">
                {search ? 'No matching files' : 'This folder is empty'}
              </h3>
              <p className="text-slate-400 dark:text-slate-500 mt-2 font-medium">
                {search ? 'Try a different search term.' : 'Files will appear here once uploaded.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {files.map((file) => (
                <a
                  key={file.id}
                  href={`/api/v1/files/${file.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass rounded-[2rem] p-6 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/5 dark:hover:shadow-blue-900/20 transition-all group flex flex-col items-center text-center cursor-pointer no-underline"
                >
                  <div className="w-16 h-16 rounded-[1.5rem] bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner shadow-blue-500/10 relative">
                    {file.mimeType?.includes('pdf') || file.mimeType?.includes('document')
                      ? <FileText className="w-8 h-8" />
                      : <LinkIcon className="w-8 h-8" />
                    }
                    <div className="absolute inset-0 rounded-[1.5rem] bg-blue-600/80 dark:bg-blue-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <h3
                    className="font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight min-h-[2.5rem]"
                    title={file.name}
                  >
                    {file.name}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    {(file.category || 'other').replace('_', ' ')}
                  </p>
                  <div className="mt-6 w-full pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        {formatBytes(file.sizeBytes)}
                      </span>
                      <span className="text-[10px] font-medium text-slate-300 dark:text-slate-600">
                        {formatDate(file.createdAt)}
                      </span>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        window.open(`/api/v1/files/${file.id}/download?download=true`, '_blank')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          e.stopPropagation()
                          window.open(`/api/v1/files/${file.id}/download?download=true`, '_blank')
                        }
                      }}
                      className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white dark:hover:text-white transition-colors"
                      title="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center glass p-4 rounded-[2rem] mt-8 shadow-sm">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-6 py-3 bg-white dark:bg-slate-800 font-bold rounded-xl shadow-sm text-slate-600 dark:text-slate-300 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="font-bold text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-6 py-3 bg-white dark:bg-slate-800 font-bold rounded-xl shadow-sm text-slate-600 dark:text-slate-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
