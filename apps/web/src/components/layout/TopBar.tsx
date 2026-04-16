import Link from "next/link"
import { Menu, Search, Bell, Sparkles } from "lucide-react"
import { ProfileDropdown } from "./ProfileDropdown"
export function TopBar({ user, unreadCount = 0 }: { user: any, unreadCount?: number }) {
  return (
    <header className="h-24 glass mt-6 mx-4 md:mx-8 rounded-[2.5rem] flex items-center justify-between px-8 z-30 sticky top-6 shadow-2xl shadow-brand-900/5">
      {/* Ambient background blur inside the topbar */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-xl rounded-[2.5rem] pointer-events-none" />

      <div className="flex items-center flex-1 gap-6 relative z-10">
        <button title="Open Menu" aria-label="Open Menu" className="md:hidden p-3 -ml-3 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-2xl transition-all shadow-sm active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:outline-none">
          <Menu className="h-6 w-6" />
        </button>
        <div className="hidden sm:flex max-w-lg w-full relative group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-brand-600 dark:group-focus-within:text-brand-400 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-14 pr-5 py-3.5 border border-white/60 dark:border-white/10 shadow-sm rounded-2xl bg-white/60 dark:bg-slate-900/60 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-300 dark:focus:border-brand-700 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all duration-300"
            placeholder="Search class materials, announcements..."
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
             <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                ⌘ K
             </kbd>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5 relative z-10">
        {(user?.role === 'super_admin' || user?.role === 'admin') && (
          <div className="hidden lg:flex items-center gap-3">
            {user?.role === 'admin' && (
              <span className="px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-900 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Telegram Synced
              </span>
            )}
            <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transform hover:scale-105 transition-transform cursor-default ${
              user?.role === 'super_admin' 
                ? 'bg-slate-900 border border-amber-500/30 text-amber-500 shadow-amber-500/10' 
                : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-orange-500/20'
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span data-testid="topbar-role-badge">
                {user?.role === 'super_admin' ? 'Super Admin' : 'CR Panel'}
              </span>
            </span>
          </div>
        )}
        
        <div className="h-10 w-px bg-slate-200/50 dark:bg-slate-700/50 mx-2 hidden sm:block"></div>
        
        <Link href="/notifications" aria-label="Notifications" className="relative p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 border border-white/60 dark:border-white/10 shadow-sm transition-all hover:scale-105 active:scale-95 group cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:outline-none">
           <Bell className="w-5 h-5 group-hover:animate-[wiggle_1s_ease-in-out_infinite]" />
           {unreadCount > 0 && (
             <span className="absolute top-[11px] right-[11px] flex h-2.5 w-2.5">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white dark:border-slate-800 shadow-sm"></span>
             </span>
           )}
        </Link>

        <ProfileDropdown user={user} />
      </div>
    </header>
  )
}
