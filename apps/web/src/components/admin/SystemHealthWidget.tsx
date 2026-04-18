import { Globe, MessageSquare, Phone, Server, Database, Activity } from "lucide-react"

export function SystemHealthWidget() {
  return (
    <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-gray-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
      <div className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700/50 px-4 py-3 flex items-center">
        <span className="text-cr-amber font-bold mr-2">◆</span>
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm tracking-wide">SYSTEM HEALTH</h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-slate-700/30">
        <div className="p-3 px-4 flex items-center justify-between">
          <div className="flex items-center"><Globe className="w-4 h-4 text-gray-400 dark:text-slate-500 mr-3" /> <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Web Portal</span></div>
          <div className="flex items-center space-x-4"><span className="flex items-center text-xs text-green-600 dark:text-green-400"><span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>Online</span><span className="text-xs text-gray-500 dark:text-slate-400 w-24 text-right">Uptime: 99.8%</span></div>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <div className="flex items-center"><MessageSquare className="w-4 h-4 text-gray-400 dark:text-slate-500 mr-3" /> <span className="text-sm font-medium text-slate-700 dark:text-slate-200">AI Chatbot</span></div>
          <div className="flex items-center space-x-4"><span className="flex items-center text-xs text-green-600 dark:text-green-400"><span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>Online</span><span className="text-xs text-gray-500 dark:text-slate-400 w-24 text-right">Last query: 4m ago</span></div>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <div className="flex items-center"><Phone className="w-4 h-4 text-gray-400 dark:text-slate-500 mr-3" /> <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Telegram Bot</span></div>
          <div className="flex items-center space-x-4"><span className="flex items-center text-xs text-green-600 dark:text-green-400"><span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>Connected</span><span className="text-xs text-gray-500 dark:text-slate-400 w-24 text-right">Authorized: You</span></div>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <div className="flex items-center"><Activity className="w-4 h-4 text-gray-400 dark:text-slate-500 mr-3" /> <span className="text-sm font-medium text-slate-700 dark:text-slate-200">n8n Automation</span></div>
          <div className="flex items-center space-x-4"><span className="flex items-center text-xs text-green-600 dark:text-green-400"><span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>Running</span><span className="text-xs text-gray-500 dark:text-slate-400 w-24 text-right">Last run: 10m ago</span></div>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <div className="flex items-center"><Database className="w-4 h-4 text-gray-400 dark:text-slate-500 mr-3" /> <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Database</span></div>
          <div className="flex items-center space-x-4"><span className="flex items-center text-xs text-green-600 dark:text-green-400"><span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>Healthy</span><span className="text-xs text-gray-500 dark:text-slate-400 w-24 text-right">pgvector: Active</span></div>
        </div>
      </div>
    </div>
  )
}
