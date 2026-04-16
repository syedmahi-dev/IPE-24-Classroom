export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard'
import { RoutineWidget } from '@/components/routine/RoutineWidget'
import { ExamCountdown } from '@/components/exams/ExamCountdown'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { Hand, Megaphone, PartyPopper, Sparkles, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const session: any = await auth()

  // Parallel data fetching on server
  const [announcements, exams] = await Promise.all([
    prisma.announcement.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      include: { author: { select: { name: true, role: true } } },
    }),
    prisma.exam.findMany({
      where: { examDate: { gte: new Date() }, isActive: true },
      orderBy: { examDate: 'asc' },
      take: 3,
      include: { course: true },
    }),
  ])

  const userRole = session?.user?.role
  const roleDisplay = userRole === 'super_admin' ? 'Super Admin' : userRole === 'admin' ? 'Class Representative' : 'Student'

  return (
    <div className="space-y-6 md:space-y-12 max-w-7xl mx-auto pb-6 md:pb-20 mt-2 md:mt-4 relative">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-10 -z-10 w-[500px] h-[500px] bg-brand-500/20 dark:bg-brand-600/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none animate-float" />
      <div className="absolute top-40 left-10 -z-10 w-[400px] h-[400px] bg-purple-500/20 dark:bg-purple-600/10 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none" />

      {/* Hero Section */}
      <div className="relative group rounded-[2.5rem] overflow-visible">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-indigo-600 to-purple-600 rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000 -z-10" />
        
        <div className="relative glass bg-white/70 dark:bg-slate-900/70 p-6 md:p-14 flex flex-col md:flex-row items-center justify-between gap-5 md:gap-8 z-10 border border-white/80 dark:border-white/10 shadow-xl md:shadow-2xl shadow-indigo-500/10 rounded-2xl md:rounded-[2.5rem] overflow-hidden">
          
          <div className="absolute top-0 right-0 w-full h-full bg-[url('/noise.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
          
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-20 text-center md:text-left">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white shadow-xl md:shadow-2xl shadow-brand-500/40 transform -rotate-6 hover:rotate-0 hover:scale-110 transition-all duration-500 flex-shrink-0 cursor-pointer">
              <Hand className="w-8 h-8 md:w-11 md:h-11 text-white animate-wave origin-bottom-right" />
            </div>
            <div>
              <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                <span className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-500/20 shadow-sm flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  {roleDisplay}
                </span>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-full">IPE-24</span>
              </div>
              <h1 className="text-2xl md:text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-1 md:mb-2">
                Good {getTimeOfDay()}, <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-purple-600 leading-tight">
                  {session?.user?.name?.split(' ')[0]}
                </span>
              </h1>
              <p className="text-sm md:text-lg font-medium text-slate-500 dark:text-slate-400">
                Ready to conquer your academic goals today?
              </p>
            </div>
          </div>
          <div className="relative z-20 flex-shrink-0 transform hover:scale-105 transition-transform">
            <NotificationBell />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-8 relative z-10 pt-2 md:pt-4">
        
        {/* Main Content Area */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Megaphone className="w-5 h-5" />
              </span>
              Latest Announcements
            </h2>
            <a href="/announcements" className="text-sm font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors bg-white hover:bg-brand-50 dark:bg-slate-800 dark:hover:bg-slate-700 px-5 py-2.5 rounded-xl cursor-pointer shadow-sm border border-slate-200 dark:border-slate-700">See All</a>
          </div>
          
          <div className="grid gap-5">
            {announcements.length > 0 ? (
              announcements.map((a: any) => <AnnouncementCard key={a.id} announcement={a} />)
            ) : (
              <div className="glass p-12 rounded-[2rem] text-center border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4"><Megaphone className="w-8 h-8 text-slate-400" /></div>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">No recent announcements</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">You're all caught up for now.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Area */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-8 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          
          <div className="glass rounded-[2rem] border border-white/60 dark:border-slate-800/80 shadow-xl overflow-hidden relative group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -z-10 group-hover:bg-brand-500/20 transition-colors duration-500" />
             <RoutineWidget />
          </div>
          
          <div className="space-y-5">
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-400 to-red-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 relative">
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-400 border-2 border-white dark:border-slate-900"></span>
                </span>
                <Clock className="w-5 h-5" />
              </span>
              Upcoming Exams
            </h2>
            
            <div className="space-y-4">
              {exams.map(e => <ExamCountdown key={e.id} exam={e} />)}
              {exams.length === 0 && (
                <div className="glass p-8 rounded-[2rem] text-center bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-900/10 dark:to-teal-900/10 border border-emerald-100/50 dark:border-emerald-800/30 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-[1.5rem] bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 transform rotate-3 group-hover:-rotate-3 transition-transform">
                    <PartyPopper className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 font-black text-xl mb-1 tracking-tight">No exams soon!</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Breathe easy and catch up on projects.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

