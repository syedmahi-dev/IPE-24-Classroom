export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { BarChart3, Users, Megaphone, FolderOpen, ClipboardList, Vote, ScrollText, Settings, Shield, Sparkles } from 'lucide-react'

export default async function AdminPage() {
  const session: any = await auth()

  // Fetch stats
  const [userCount, announcementCount, fileCount, pollCount] = await Promise.all([
    prisma.user.count(),
    prisma.announcement.count(),
    prisma.fileUpload.count(),
    prisma.poll.count(),
  ])

  // Fetch recent activity
  const recentAnnouncements = await prisma.announcement.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { name: true } } },
  })
  
  const isSuper = session?.user?.role === 'super_admin'
  const roleName = isSuper ? 'Super Admin' : 'Class Representative'

  const stats = [
    { label: 'Total Students', value: userCount, color: 'from-blue-500 to-cyan-500', icon: Users },
    { label: 'Announcements', value: announcementCount, color: 'from-admin-purple to-indigo-500', icon: Megaphone },
    { label: 'Files Uploaded', value: fileCount, color: 'from-brand-500 to-teal-400', icon: FolderOpen },
    { label: 'Active Polls', value: pollCount, color: 'from-orange-500 to-amber-400', icon: Vote },
  ]

  const crActions = [
    { href: '/admin/announcements', label: 'New Announcement', icon: Megaphone, color: 'from-admin-purple to-indigo-500' },
    { href: '/admin/files', label: 'Upload File', icon: FolderOpen, color: 'from-brand-500 to-teal-400' },
    { href: '/admin/exams', label: 'Exam Entry', icon: ClipboardList, color: 'from-emerald-500 to-green-400' },
    { href: '/admin/polls', label: 'New Poll', icon: Vote, color: 'from-orange-500 to-amber-400' },
  ]

  const superActions = [
    { href: '/admin/users', label: 'Manage Users', icon: Users, color: 'from-amber-500 to-orange-500' },
    { href: '/admin/audit', label: 'Audit Log', icon: ScrollText, color: 'from-slate-600 to-slate-800' },
    { href: '/admin/settings', label: 'Settings', icon: Settings, color: 'from-indigo-500 to-purple-600' },
  ]

  const quickActions = isSuper ? [...crActions, ...superActions] : crActions

  return (
    <div className="space-y-8 max-w-7xl mx-auto mt-4 relative pb-20">
      
      {/* Background Ambience tailored to role */}
      {isSuper ? (
        <div className="absolute top-0 right-10 -z-10 w-[600px] h-[600px] bg-amber-500/10 dark:bg-amber-500/5 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none animate-float" />
      ) : (
        <div className="absolute top-0 right-10 -z-10 w-[600px] h-[600px] bg-indigo-500/20 dark:bg-indigo-600/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none animate-float" />
      )}

      {/* Header */}
      <div className="relative group rounded-[2.5rem] overflow-visible">
        <div className={`absolute inset-0 bg-gradient-to-br ${isSuper ? 'from-amber-600 via-orange-600 to-red-600' : 'from-indigo-600 via-admin-purple to-purple-600'} rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000 -z-10`} />
        
        <div className="flex flex-col md:flex-row items-center justify-between glass bg-white/70 dark:bg-slate-900/70 p-10 md:p-14 border border-white/80 dark:border-white/10 shadow-2xl rounded-[2.5rem] overflow-hidden gap-8 z-10 relative">
          <div className="absolute top-0 right-0 w-full h-full bg-[url('/noise.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
          
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-20 text-center md:text-left">
            <div className={`w-24 h-24 rounded-[2rem] bg-gradient-to-br ${isSuper ? 'from-amber-500 to-orange-600 shadow-amber-500/40' : 'from-indigo-500 to-admin-purple shadow-indigo-500/40'} flex items-center justify-center text-white shadow-2xl transform -rotate-6 hover:rotate-0 hover:scale-110 transition-all duration-500 flex-shrink-0 cursor-pointer`}>
              {isSuper ? <Shield className="w-11 h-11" /> : <BarChart3 className="w-11 h-11" />}
            </div>
            <div>
              <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                <span className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${isSuper ? 'text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20' : 'text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20'} border shadow-sm flex items-center gap-2`}>
                  <Sparkles className="w-3 h-3" />
                  Privileged Access
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-2">
                {roleName} <br className="hidden md:block" />
                <span className={`text-transparent bg-clip-text bg-gradient-to-r ${isSuper ? 'from-amber-500 to-orange-600' : 'from-indigo-500 to-purple-600'}`}>
                  Dashboard
                </span>
              </h1>
              <p className="text-lg font-medium text-slate-500 dark:text-slate-400">
                Welcome back, {session?.user.name?.split(' ')[0]}. Manage your classroom effectively.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="glass p-8 rounded-[2rem] relative overflow-hidden group hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl cursor-pointer bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-slate-700/50">
              <div className={`absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 dark:opacity-20 rounded-full group-hover:scale-150 transition-transform duration-700`}></div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-4xl font-black text-slate-800 dark:text-slate-100 mt-2 tracking-tight">{stat.value}</p>
                </div>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg shadow-black/5 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-7 h-7" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
               <Settings className="w-5 h-5" />
             </div>
             Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <a
                  key={action.href}
                  href={action.href}
                  className="p-6 glass rounded-[2rem] hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-center group cursor-pointer bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700/50 flex flex-col items-center justify-center"
                >
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-[1.5rem] bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest group-hover:text-admin-purple dark:group-hover:text-indigo-400 transition-colors">{action.label}</p>
                </a>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Recent Updates</h2>
            <a href="/admin/announcements" className="text-sm font-bold text-admin-purple hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">View All</a>
          </div>
          <div className="space-y-4">
            {recentAnnouncements.length === 0 ? (
              <div className="glass p-10 rounded-[2rem] text-center text-slate-500 dark:text-slate-400 font-bold border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                No recent activity.
              </div>
            ) : (
              recentAnnouncements.map((ann: any) => (
                <div key={ann.id} className="p-5 glass rounded-[1.5rem] bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 transition-all group cursor-pointer border border-white/60 dark:border-slate-700/50 hover:shadow-lg hover:-translate-y-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-admin-purple transition-colors line-clamp-1">{ann.title}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-admin-purple to-indigo-500 flex items-center justify-center text-[11px] font-black text-white shadow-sm">
                      {ann.author.name.charAt(0)}
                    </div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{ann.author.name}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

