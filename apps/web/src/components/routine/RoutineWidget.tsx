export function RoutineWidget({ data }: { data: any }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg text-slate-800">Today's Classes</h3>
        <span className="text-xs font-bold text-brand-700 bg-brand-100/50 px-3 py-1.5 rounded-xl uppercase tracking-wider">
          {new Date().toLocaleDateString('en-US', { weekday: 'short' })}
        </span>
      </div>
      
      {(!data || data.length === 0) ? (
        <div className="py-8 text-center text-sm font-medium text-slate-500 bg-slate-50/50 rounded-xl border border-slate-100/50">
          No classes scheduled for today. Time to relax!
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((cls: any, i: number) => (
            <div key={i} className="flex gap-4 group">
              <div className="w-16 flex-shrink-0 text-right pt-0.5">
                <div className="text-sm font-bold text-slate-700">{cls.time}</div>
                <div className="text-[11px] font-semibold tracking-wide text-slate-400 mt-1">{cls.duration || '1h'}</div>
              </div>
              <div className="w-px bg-slate-200/60 relative">
                <div className="absolute top-1.5 -left-[5px] w-2.5 h-2.5 rounded-full bg-brand-400 ring-4 ring-white group-hover:scale-125 transition-transform" />
              </div>
              <div className="flex-1 pb-4">
                <div className="text-[15px] font-bold text-slate-800 group-hover:text-brand-600 transition-colors">{cls.courseName}</div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1">
                  <span className="bg-slate-100 px-2 py-0.5 rounded-md">{cls.room}</span>
                  <span>•</span>
                  <span>{cls.instructor}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
