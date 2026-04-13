'use client'

import { useEffect, useState } from 'react'
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard'
import { useSearchParams } from 'next/navigation'

type AnnouncementType = 'general' | 'exam' | 'file_update' | 'routine_update' | 'urgent' | 'event'

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedType, setSelectedType] = useState<AnnouncementType | 'all'>('all')
  const [search, setSearch] = useState('')

  const fetchAnnouncements = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(selectedType !== 'all' && { type: selectedType }),
      })

      const res = await fetch(`/api/v1/announcements?${params}`)
      if (!res.ok) {
        throw new Error('Failed to fetch announcements')
      }

      const data = await res.json()
      setAnnouncements(data.data)
      setTotalPages(data.meta.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [page, selectedType])

  const typeOptions: Array<{ value: AnnouncementType | 'all'; label: string; color: string }> = [
    { value: 'all', label: 'All', color: 'bg-gray-200' },
    { value: 'exam', label: 'Exam', color: 'bg-red-200' },
    { value: 'file_update', label: 'File', color: 'bg-blue-200' },
    { value: 'general', label: 'General', color: 'bg-gray-200' },
    { value: 'routine_update', label: 'Routine', color: 'bg-purple-200' },
    { value: 'urgent', label: 'Urgent', color: 'bg-orange-200' },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">📢 Announcements</h1>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Type Filter */}
          <div className="flex gap-2 flex-wrap">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setSelectedType(option.value)
                  setPage(1)
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedType === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="🔍 Search announcements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && <div className="text-center py-12 text-gray-500">⏳ Loading announcements...</div>}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && announcements.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">📭 No announcements yet. Check back soon!</p>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map((announcement: any) => (
          <AnnouncementCard key={announcement.id} announcement={announcement} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
