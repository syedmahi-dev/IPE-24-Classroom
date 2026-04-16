export default function AdminLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          <div className="h-10 w-96 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          <div className="h-5 w-64 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse opacity-50" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-12 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-12 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
      </div>

      <div className="glass rounded-[2rem] border border-white/60 dark:border-slate-800/80 shadow-xl overflow-hidden p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="h-10 w-64 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
          <div className="h-10 w-48 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 w-full bg-slate-50 dark:bg-slate-900/50 rounded-xl animate-pulse border border-slate-100 dark:border-slate-800" />
          ))}
        </div>
      </div>
    </div>
  )
}
