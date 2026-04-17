export default function AnnouncementsLoading() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 lg:space-y-10 pb-20 min-w-0 animate-in fade-in duration-500">
      <div className="relative rounded-[2.5rem] overflow-hidden">
        <div className="bg-slate-200 dark:bg-slate-800 h-48 w-full animate-pulse rounded-[2.5rem]" />
      </div>
      <div className="glass p-4 rounded-[2rem]">
        <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-[1.5rem] animate-pulse" />
      </div>
      <div className="space-y-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass rounded-[2rem] h-36 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
