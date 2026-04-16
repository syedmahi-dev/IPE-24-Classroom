export default function ResourcesLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="relative rounded-[2.5rem] overflow-hidden">
        <div className="bg-slate-200 dark:bg-slate-800 h-48 w-full animate-pulse rounded-[2.5rem]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="glass rounded-[2rem] h-32 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
