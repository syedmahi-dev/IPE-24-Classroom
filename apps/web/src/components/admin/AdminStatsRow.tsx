import { Users, ShieldAlert, Megaphone, Upload, Vote, TrendingUp } from "lucide-react"

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  subtitle: string
  gradientColor: 'blue' | 'purple' | 'amber' | 'emerald' | 'red'
  trend?: { value: number; direction: 'up' | 'down' }
}

function StatCard({ icon, label, value, subtitle, gradientColor, trend }: StatCardProps) {
  const gradientMap = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20 hover:border-blue-500/40',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/20 hover:border-purple-500/40',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/20 hover:border-amber-500/40',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 hover:border-emerald-500/40',
    red: 'from-red-500/20 to-red-600/10 border-red-500/20 hover:border-red-500/40',
  }

  const iconColorMap = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
  }

  const labelColorMap = {
    blue: 'text-blue-200',
    purple: 'text-purple-200',
    amber: 'text-amber-200',
    emerald: 'text-emerald-200',
    red: 'text-red-200',
  }

  return (
    <div className={`group relative rounded-2xl p-6 border backdrop-blur-xl bg-gradient-to-br ${gradientMap[gradientColor]} shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden`}>
      {/* Animated background gradient */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10 space-y-3">
        {/* Icon with background */}
        <div className="flex items-center justify-between">
          <div className={`p-2.5 rounded-xl bg-slate-950/40 border border-slate-700/30 group-hover:border-slate-600/50 transition-colors ${iconColorMap[gradientColor]}`}>
            {icon}
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-xs font-bold">
              <TrendingUp className={`w-3.5 h-3.5 ${trend.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`} />
              <span className={trend.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}>
                {trend.direction === 'up' ? '+' : '-'}{trend.value}%
              </span>
            </div>
          )}
        </div>

        {/* Label */}
        <div>
          <p className={`text-xs font-black uppercase tracking-widest ${labelColorMap[gradientColor]}`}>
            {label}
          </p>
        </div>

        {/* Value */}
        <div className="space-y-1">
          <p className="text-3xl font-black text-slate-50 tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-xs font-medium text-slate-400">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}

export function AdminStatsRow({ stats, role }: { stats: any, role: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
      <StatCard
        icon={<Users className="w-5 h-5" />}
        label="Students"
        value={stats.students || 0}
        subtitle="registered"
        gradientColor="blue"
        trend={stats.studentsTrend ? { value: stats.studentsTrend, direction: 'up' } : undefined}
      />

      {role === 'super_admin' && (
        <StatCard
          icon={<ShieldAlert className="w-5 h-5" />}
          label="ADMINS"
          value={stats.admins || 0}
          subtitle="appointed"
          gradientColor="amber"
          trend={stats.adminsTrend ? { value: stats.adminsTrend, direction: 'up' } : undefined}
        />
      )}

      <StatCard
        icon={<Megaphone className="w-5 h-5" />}
        label="Announcements"
        value={stats.announcements || 0}
        subtitle="this month"
        gradientColor="purple"
        trend={stats.announcementsTrend ? { value: stats.announcementsTrend, direction: 'up' } : undefined}
      />

      <StatCard
        icon={<Upload className="w-5 h-5" />}
        label="Files"
        value={stats.files || 0}
        subtitle="in library"
        gradientColor="emerald"
        trend={stats.filesTrend ? { value: stats.filesTrend, direction: 'up' } : undefined}
      />

      <StatCard
        icon={<Vote className="w-5 h-5" />}
        label="Polls"
        value={`${stats.polls || 0} active`}
        subtitle=""
        gradientColor="red"
        trend={stats.pollsTrend ? { value: stats.pollsTrend, direction: 'up' } : undefined}
      />
    </div>
  )
}
