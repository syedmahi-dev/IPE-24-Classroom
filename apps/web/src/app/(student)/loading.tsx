export default function DashboardLoading() {
  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-20 mt-4 animate-in fade-in duration-500">
      {/* Hero Section Skeleton */}
      <div className="relative rounded-[2.5rem] overflow-hidden">
        <div className="bg-slate-200 dark:bg-slate-800 h-[300px] w-full animate-pulse flex flex-col md:flex-row items-center justify-between p-10 md:p-14 gap-8">
          <div className="flex flex-col md:flex-row items-center gap-8 w-full">
            <div className="w-24 h-24 rounded-[2rem] bg-slate-300 dark:bg-slate-700 flex-shrink-0" />
            <div className="space-y-4 flex-1 w-full max-w-md">
              <div className="h-4 w-32 bg-slate-300 dark:bg-slate-700 rounded-full" />
              <div className="h-12 w-full bg-slate-300 dark:bg-slate-700 rounded-2xl" />
              <div className="h-4 w-64 bg-slate-300 dark:bg-slate-700 rounded-full" />
            </div>
          </div>
          <div className="w-16 h-16 rounded-full bg-slate-300 dark:bg-slate-700 flex-shrink-0" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 pt-4">
        {/* Announcements Area Skeleton */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            <div className="h-10 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          </div>
          <div className="grid gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 w-full bg-slate-200 dark:bg-slate-800 rounded-[2rem] animate-pulse" />
            ))}
          </div>
        </div>

        {/* Sidebar Area Skeleton */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-8">
          <div className="h-[400px] w-full bg-slate-200 dark:bg-slate-800 rounded-[2rem] animate-pulse" />
          <div className="space-y-5">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            <div className="grid gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 w-full bg-slate-200 dark:bg-slate-800 rounded-[2rem] animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
