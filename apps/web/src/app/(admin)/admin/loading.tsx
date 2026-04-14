'use client'

export default function AdminLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="glass p-6 rounded-3xl flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-2">
          <div className="h-7 w-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass p-6 rounded-2xl space-y-3">
            <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded-md" />
            <div className="h-10 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass p-5 rounded-2xl flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
                <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded-md" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-6 w-28 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass p-4 rounded-xl space-y-2">
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-md" />
              <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
