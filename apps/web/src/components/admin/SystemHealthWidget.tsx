import { Globe, MessageSquare, Phone, Server, Database, Activity } from "lucide-react"

export function SystemHealthWidget() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center">
        <span className="text-cr-amber font-bold mr-2">◆</span>
        <h3 className="font-semibold text-gray-900 text-sm tracking-wide">SYSTEM HEALTH</h3>
      </div>
      <div className="divide-y divide-gray-100">
        <div className="p-3 px-4 flex items-center justify-between">
          <div className="flex items-center"><Globe className="w-4 h-4 text-gray-400 mr-3" /> <span className="text-sm font-medium">Web Portal</span></div>
          <div className="flex items-center space-x-4"><span className="flex items-center text-xs text-green-600"><span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>Online</span><span className="text-xs text-gray-500 w-24 text-right">Uptime: 99.8%</span></div>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <div className="flex items-center"><MessageSquare className="w-4 h-4 text-gray-400 mr-3" /> <span className="text-sm font-medium">AI Chatbot</span></div>
          <div className="flex items-center space-x-4"><span className="flex items-center text-xs text-green-600"><span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>Online</span><span className="text-xs text-gray-500 w-24 text-right">Last query: 4m ago</span></div>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <div className="flex items-center"><Phone className="w-4 h-4 text-gray-400 mr-3" /> <span className="text-sm font-medium">Telegram Bot</span></div>
          <div className="flex items-center space-x-4"><span className="flex items-center text-xs text-green-600"><span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>Connected</span><span className="text-xs text-gray-500 w-24 text-right">Authorized: You</span></div>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <div className="flex items-center"><Activity className="w-4 h-4 text-gray-400 mr-3" /> <span className="text-sm font-medium">n8n Automation</span></div>
          <div className="flex items-center space-x-4"><span className="flex items-center text-xs text-green-600"><span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>Running</span><span className="text-xs text-gray-500 w-24 text-right">Last run: 10m ago</span></div>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <div className="flex items-center"><Database className="w-4 h-4 text-gray-400 mr-3" /> <span className="text-sm font-medium">Database</span></div>
          <div className="flex items-center space-x-4"><span className="flex items-center text-xs text-green-600"><span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>Healthy</span><span className="text-xs text-gray-500 w-24 text-right">pgvector: Active</span></div>
        </div>
      </div>
    </div>
  )
}
