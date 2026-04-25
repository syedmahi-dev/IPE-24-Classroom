import { getDiscordConfigs } from './actions'
import DiscordConfigClient from './DiscordConfigClient'
import { MessageCircle, Settings } from 'lucide-react'

export const metadata = {
  title: 'Discord Bot Config | Admin',
}

export default async function DiscordAdminPage() {
  const configs = await getDiscordConfigs()

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 mt-4 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="relative group rounded-[2.5rem] overflow-visible">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-admin-purple to-purple-600 rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000 -z-10" />
        
        <div className="flex flex-col md:flex-row items-center justify-between glass bg-white/70 dark:bg-slate-900/70 p-10 border border-white/80 dark:border-white/10 shadow-2xl rounded-[2.5rem] overflow-hidden gap-8 z-10 relative">
          <div className="absolute top-0 right-0 w-full h-full bg-[url('/noise.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
          
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-20 text-center md:text-left">
            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-2xl transform -rotate-6 hover:rotate-0 hover:scale-110 transition-all duration-500 flex-shrink-0 cursor-pointer shadow-indigo-500/40">
              <MessageCircle className="w-11 h-11" />
            </div>
            <div>
              <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                <span className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 shadow-sm flex items-center gap-2">
                  <Settings className="w-3 h-3" />
                  Bot Configuration
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-2">
                Discord <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">Listener</span>
              </h1>
              <p className="text-lg font-medium text-slate-500 dark:text-slate-400 max-w-xl">
                Manage channel monitoring, auto-publish rules, and AI parameters dynamically without restarting the bot.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass p-8 rounded-[2rem] bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-slate-700/50">
        <DiscordConfigClient initialConfigs={configs} />
      </div>
    </div>
  )
}
