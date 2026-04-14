'use client'

import { Calendar, Clock, MapPin, User as UserIcon } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function TimetableGrid({ data }: { data: any[] }) {
  const groupedData = data.reduce((acc: any, curr: any) => {
    const day = curr.day || 'Unscheduled'
    if (!acc[day]) acc[day] = []
    acc[day].push(curr)
    return acc
  }, {})

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {DAYS.map((day) => (
        <div key={day} className="flex flex-col gap-4">
          <div className="flex items-center gap-2 px-2">
            <Calendar className="w-4 h-4 text-brand-500" />
            <h3 className="font-bold text-slate-800 tracking-tight">{day}</h3>
          </div>
          
          <div className="space-y-3">
            {!groupedData[day] || groupedData[day].length === 0 ? (
              <div className="p-4 rounded-2xl border border-dashed border-slate-200 text-center text-xs font-medium text-slate-400 bg-slate-50/30">
                No classes
              </div>
            ) : (
              groupedData[day].map((cls: any, i: number) => (
                <div 
                  key={i} 
                  className="glass p-4 rounded-2xl border border-white/40 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group cursor-default"
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-600 uppercase tracking-wider mb-2">
                    <Clock className="w-3 h-3" />
                    {cls.time}
                  </div>
                  
                  <div className="text-sm font-bold text-slate-800 mb-3 group-hover:text-brand-700 transition-colors leading-tight">
                    {cls.courseName}
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {cls.room}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                      <UserIcon className="w-3 h-3 text-slate-400" />
                      {cls.instructor}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
