import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export default async function AdminPage() {
  const session: any = await auth()

  // Fetch stats
  const [userCount, announcementCount, fileCount, pollCount] = await Promise.all([
    prisma.user.count(),
    prisma.announcement.count(),
    prisma.fileUpload.count(),
    prisma.poll.count(),
  ])

  // Fetch recent activity (mock for now)
  const recentAnnouncements = await prisma.announcement.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { name: true } } },
  })

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between glass p-6 rounded-3xl">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <span className="p-2 bg-gradient-to-br from-admin-purple to-indigo-600 text-white rounded-xl shadow-lg shadow-admin-purple/30 text-xl">
              📊
            </span>
            Admin Dashboard
          </h1>
          <p className="text-[15px] font-medium text-slate-500 mt-2">
            Welcome back, <span className="text-gradient">{session?.user.name?.split(' ')[0]}</span>. Here's what's happening.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        {[
          { label: 'Total Students', value: userCount, color: 'from-blue-500 to-cyan-500', icon: '👥' },
          { label: 'Announcements', value: announcementCount, color: 'from-admin-purple to-indigo-500', icon: '📢' },
          { label: 'Files Uploaded', value: fileCount, color: 'from-brand-500 to-teal-400', icon: '📁' },
          { label: 'Active Polls', value: pollCount, color: 'from-orange-500 to-amber-400', icon: '🗳️' },
        ].map((stat) => (
          <div key={stat.label} className="glass p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 hover:shadow-lg">
            <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-10 rounded-full group-hover:scale-150 transition-transform duration-500`}></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-4xl font-black text-slate-800 mt-2 tracking-tight">{stat.value}</p>
              </div>
              <span className="text-4xl drop-shadow-sm group-hover:scale-110 transition-transform duration-300">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-5 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <h2 className="text-xl font-bold text-slate-800">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="/admin/announcements"
              className="p-5 glass rounded-2xl hover:shadow-glass-hover hover:-translate-y-1 transition-all text-center group cursor-pointer"
            >
              <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform">📢</div>
              <p className="text-[13px] font-bold text-slate-700 uppercase tracking-wide group-hover:text-admin-purple transition-colors">New Announcement</p>
            </a>
            <a
              href="/admin/files"
              className="p-5 glass rounded-2xl hover:shadow-glass-hover hover:-translate-y-1 transition-all text-center group cursor-pointer"
            >
              <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform">📁</div>
              <p className="text-[13px] font-bold text-slate-700 uppercase tracking-wide group-hover:text-admin-purple transition-colors">Upload File</p>
            </a>
            <a
              href="/admin/exams"
              className="p-5 glass rounded-2xl hover:shadow-glass-hover hover:-translate-y-1 transition-all text-center group cursor-pointer"
            >
              <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform">📝</div>
              <p className="text-[13px] font-bold text-slate-700 uppercase tracking-wide group-hover:text-admin-purple transition-colors">Exam Entry</p>
            </a>
            <a
              href="/admin/polls"
              className="p-5 glass rounded-2xl hover:shadow-glass-hover hover:-translate-y-1 transition-all text-center group cursor-pointer"
            >
              <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform">🗳️</div>
              <p className="text-[13px] font-bold text-slate-700 uppercase tracking-wide group-hover:text-admin-purple transition-colors">New Poll</p>
            </a>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-5 animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Recent Updates</h2>
            <button className="text-sm font-semibold text-admin-purple hover:text-indigo-600 transition-colors">View All</button>
          </div>
          <div className="space-y-3">
            {recentAnnouncements.length === 0 ? (
              <div className="glass p-6 rounded-2xl text-center text-slate-500 font-medium">
                No recent activity.
              </div>
            ) : (
              recentAnnouncements.map((ann: any) => (
                <div key={ann.id} className="p-4 glass rounded-xl hover:bg-white/80 transition-colors group">
                  <p className="font-bold text-slate-800 group-hover:text-admin-purple transition-colors">{ann.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                      {ann.author.name.charAt(0)}
                    </div>
                    <p className="text-xs font-semibold text-slate-500">{ann.author.name}</p>
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
