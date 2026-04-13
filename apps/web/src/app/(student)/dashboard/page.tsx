import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchRoutine } from '@/lib/google-sheets'
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard'
import { RoutineWidget } from '@/components/routine/RoutineWidget'
import { ExamCountdown } from '@/components/exams/ExamCountdown'
import { NotificationBell } from '@/components/notifications/NotificationBell'

export default async function DashboardPage() {
  const session: any = await auth()

  // Parallel data fetching on server
  const [announcements, exams, routine] = await Promise.all([
    prisma.announcement.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      include: { author: { select: { name: true } } },
    }),
    prisma.exam.findMany({
      where: { examDate: { gte: new Date() }, isActive: true },
      orderBy: { examDate: 'asc' },
      take: 3,
      include: { course: true },
    }),
    fetchRoutine(),
  ])

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between glass p-6 rounded-3xl">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            Good {getTimeOfDay()},{' '}
            <span className="text-gradient">
              {session?.user.name?.split(' ')[0]}
            </span>
            <span className="inline-block animate-bounce ml-2 origin-bottom-right hover:animate-none">👋</span>
          </h1>
          <p className="text-[15px] font-medium text-slate-500 mt-1.5 flex items-center gap-2">
            <span>IPE-24 Classroom</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            <span>Islamic University of Technology</span>
          </p>
        </div>
        <NotificationBell />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Latest Announcements</h2>
            <button className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors">View All</button>
          </div>
          <div className="space-y-4">
            {announcements.map(a => <AnnouncementCard key={a.id} announcement={a as any} />)}
          </div>
        </div>

        <div className="space-y-8 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <RoutineWidget data={routine} />
          
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Upcoming Exams
            </h2>
            <div className="space-y-3">
              {exams.map(e => <ExamCountdown key={e.id} exam={e} />)}
              {exams.length === 0 && (
                <div className="glass p-8 rounded-2xl text-center text-slate-500 font-medium">
                  No upcoming exams right now! 🎉
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
