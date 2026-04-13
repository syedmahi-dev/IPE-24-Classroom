import { Users, ShieldAlert, Megaphone, Upload, Vote } from "lucide-react"

export function AdminStatsRow({ stats, role }: { stats: any, role: string }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col">
        <div className="flex items-center text-sm font-medium text-gray-500 mb-2">
          <Users className="w-4 h-4 mr-2" /> STUDENTS
        </div>
        <span className="text-2xl font-bold text-gray-900">{stats.students}</span>
        <span className="text-xs text-gray-500">registered</span>
      </div>

      {role === 'super_admin' && (
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 shadow-sm flex flex-col">
          <div className="flex items-center text-sm font-medium text-cr-amber mb-2">
            <ShieldAlert className="w-4 h-4 mr-2" /> ADMINS
          </div>
          <span className="text-2xl font-bold text-gray-900">{stats.admins}</span>
          <span className="text-xs text-gray-500">appointed</span>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col">
        <div className="flex items-center text-sm font-medium text-gray-500 mb-2">
          <Megaphone className="w-4 h-4 mr-2" /> ANNOUNCEMENTS
        </div>
        <span className="text-2xl font-bold text-gray-900">{stats.announcements}</span>
        <span className="text-xs text-gray-500">this month</span>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col">
        <div className="flex items-center text-sm font-medium text-gray-500 mb-2">
          <Upload className="w-4 h-4 mr-2" /> FILES
        </div>
        <span className="text-2xl font-bold text-gray-900">{stats.files}</span>
        <span className="text-xs text-gray-500">in library</span>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col">
        <div className="flex items-center text-sm font-medium text-gray-500 mb-2">
          <Vote className="w-4 h-4 mr-2" /> POLLS
        </div>
        <span className="text-2xl font-bold text-gray-900">{stats.polls} active</span>
      </div>
    </div>
  )
}
