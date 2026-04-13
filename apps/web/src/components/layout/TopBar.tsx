import { Menu, Search, Bell } from "lucide-react"

export function TopBar({ user }: { user: any }) {
  return (
    <header className="h-20 glass mt-4 mx-4 md:mx-8 rounded-3xl flex items-center justify-between px-6 z-20 relative">
      <div className="flex items-center flex-1">
        <button title="Open Menu" aria-label="Open Menu" className="md:hidden p-2 -ml-2 mr-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors">
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:flex max-w-md w-full relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-2.5 border-t border-l border-white/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] rounded-2xl leading-5 bg-white/50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 sm:text-sm transition-all duration-300"
            placeholder="Search class materials, announcements..."
          />
        </div>
      </div>
      <div className="flex items-center ml-4 space-x-4">
        {user?.role === 'super_admin' && (
          <div className="hidden lg:flex items-center space-x-3">
            <span className="px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-iut-green-light text-iut-green shadow-sm border border-iut-green/10">
              Telegram Active
            </span>
            <span className="px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm shadow-orange-500/20">
              CR Panel
            </span>
          </div>
        )}
        <div className="h-8 w-px bg-slate-200/50 mx-2 hidden sm:block"></div>
        <button title="User Profile" aria-label="User Profile" className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-white/60 transition-colors border border-transparent hover:border-white/40 group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 bg-white/40">
          <div className="relative">
            <img
              className="h-9 w-9 rounded-full bg-slate-100 object-cover shadow-sm group-hover:scale-105 transition-transform"
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || "Student"}&backgroundColor=f0fdfa&textColor=0d9488`}
              alt="User Avatar"
            />
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <span className="hidden sm:block text-sm font-semibold text-slate-700">{user?.name?.split(' ')[0] || 'User'}</span>
        </button>
      </div>
    </header>
  )
}
