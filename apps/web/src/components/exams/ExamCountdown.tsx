import { formatDistanceToNow } from "date-fns"

export function ExamCountdown({ exam }: { exam: any }) {
  const date = new Date(exam.examDate)
  const isClose = date.getTime() - new Date().getTime() < 1000 * 60 * 60 * 24 * 3 // 3 days

  return (
    <div className="glass rounded-xl p-5 hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-300 w-full relative overflow-hidden group">
      {/* Dynamic left accent */}
      <div className={`absolute top-0 left-0 bottom-0 w-1 ${isClose ? 'bg-red-500' : 'bg-brand-400 group-hover:bg-brand-500 transition-colors'}`}></div>
      <div className="flex items-start justify-between gap-4 pl-1">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {exam.course?.code || "Exam"}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              isClose ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-600'
            }`}>
              {formatDistanceToNow(date, { addSuffix: true })}
            </span>
          </div>
          <h4 className="text-[15px] font-bold text-slate-800 group-hover:text-brand-600 transition-colors">{exam.title || "Upcoming Assessment"}</h4>
        </div>
        <div className="text-right flex-shrink-0 bg-white/50 p-2 rounded-xl border border-white/60 shadow-sm">
          <div className="text-sm font-bold text-slate-800">
            {date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">
            {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  )
}
