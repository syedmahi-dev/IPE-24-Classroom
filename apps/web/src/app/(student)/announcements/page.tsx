'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard'
import { Megaphone, Search, Filter, Loader2, AlertCircle } from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

type AnnouncementType = 'general' | 'exam' | 'file_update' | 'routine_update' | 'urgent' | 'event'

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedType, setSelectedType] = useState<AnnouncementType | 'all'>('all')
  const [search, setSearch] = useState('')
  const gridRef = useRef<HTMLDivElement>(null)

  // Animate cards when announcements change
  useEffect(() => {
    if (!loading && announcements.length > 0 && gridRef.current) {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(gridRef.current!.children, {
          opacity: 0,
          y: 20,
          duration: 0.4,
          stagger: 0.06,
          ease: 'power2.out',
        })
      })
      return () => mm.revert()
    }
  }, [loading, announcements])

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(selectedType !== 'all' && { type: selectedType }),
      })

      const res = await fetch(`/api/v1/announcements?${params}`)
      if (!res.ok) throw new Error('Failed to fetch announcements')

      const result = await res.json()
      if (!result.success) throw new Error(result.error?.message || 'Error loading')

      setAnnouncements(result.data)
      setTotalPages(result.meta.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [page, selectedType])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  const typeOptions: Array<{ value: AnnouncementType | 'all'; label: string; colorClass: string }> = [
    { value: 'all', label: 'All Updates', colorClass: 'hover:text-slate-800' },
    { value: 'exam', label: 'Exams', colorClass: 'hover:text-rose-600' },
    { value: 'file_update', label: 'Files', colorClass: 'hover:text-teal-600' },
    { value: 'routine_update', label: 'Routine', colorClass: 'hover:text-amber-600' },
    { value: 'urgent', label: 'Urgent', colorClass: 'hover:text-red-600' },
  ]

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 md:space-y-8 lg:space-y-10 pb-6 md:pb-20 min-w-0">
      {/* Premium Hero Section */}
      <div className="relative group overflow-hidden rounded-2xl md:rounded-[2.5rem]">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-600 to-indigo-600 blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-700" />
        <div className="relative glass p-5 md:p-14 flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-8 z-10">
          <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white shadow-xl md:shadow-2xl shadow-brand-500/40 transform -rotate-3 hover:rotate-0 transition-transform duration-500 flex-shrink-0">
            <Megaphone className="w-7 h-7 md:w-10 md:h-10" />
          </div>
          <div className="text-center md:text-left space-y-1 md:space-y-3">
             <h1 className="text-2xl md:text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Class Announcements</h1>
             <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-lg max-w-xl leading-relaxed">
               Stay updated with the latest news, exam schedules, and important notices for IPE-24. 
             </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar glassmorphic */}
      <div className="glass p-3 md:p-4 rounded-2xl md:rounded-[2rem] flex flex-col lg:flex-row gap-3 md:gap-4 items-center shadow-lg shadow-brand-900/5 relative z-20">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-brand-500 transition-colors" />
          <input
            type="search"
            aria-label="Search announcements"
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 md:pl-14 pr-4 md:pr-6 py-3 md:py-4 bg-white/50 dark:bg-slate-900/50 border border-white dark:border-slate-800 rounded-xl md:rounded-[1.5rem] shadow-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none text-slate-700 dark:text-slate-200 text-sm md:text-base font-bold transition-all placeholder:font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-hide">
          {typeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={selectedType === option.value}
              onClick={() => {
                setSelectedType(option.value)
                setPage(1)
              }}
              className={`px-4 md:px-5 py-2.5 md:py-3.5 min-h-[44px] rounded-xl md:rounded-[1.25rem] text-xs md:text-sm font-bold whitespace-nowrap transition-all duration-300 shadow-sm focus-ring ${
                selectedType === option.value
                  ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-slate-800/20 dark:shadow-slate-100/20 scale-105'
                  : `bg-white/60 dark:bg-slate-900/60 border border-white dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 ${option.colorClass}`
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm z-30 rounded-[2rem]">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Loading Updates...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 p-6 rounded-[2rem] flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
               <h3 className="text-red-800 dark:text-red-400 font-bold mb-1">Failed to load</h3>
               <p className="text-red-600/80 dark:text-red-400/80 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {!loading && announcements.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-[2rem]">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-sm rotate-3">
               <Filter className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">No announcements found</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Try adjusting your filters or check back later.</p>
          </div>
        )}

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 relative z-10">
          {announcements.map((announcement: any) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between glass p-3 md:p-4 rounded-2xl md:rounded-[2rem] border border-white/60 dark:border-white/10 shadow-sm mt-4 md:mt-8">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 md:px-6 py-2.5 md:py-3 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm md:text-base font-bold rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm disabled:opacity-50 disabled:active:scale-100 active:scale-95 transition-all"
          >
            Previous
          </button>
          
          <div className="flex items-center gap-2">
             <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">Page</span>
             <span className="w-10 h-10 flex items-center justify-center bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 font-black rounded-xl shadow-md">{page}</span>
             <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">of {totalPages}</span>
          </div>

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-6 py-3 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm disabled:opacity-50 disabled:active:scale-100 active:scale-95 transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
