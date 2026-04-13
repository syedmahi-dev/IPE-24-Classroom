import { AlertTriangle, Info } from "lucide-react"

export function PendingActionsWidget() {
  return (
    <div className="bg-orange-50/50 rounded-xl border border-orange-100 overflow-hidden shadow-sm">
      <div className="bg-orange-100/50 border-b border-orange-100 px-4 py-3 flex items-center">
        <span className="text-cr-amber font-bold mr-2">◆</span>
        <h3 className="font-semibold text-gray-900 text-sm tracking-wide uppercase">Requires your attention</h3>
      </div>
      <div className="divide-y divide-orange-100/50 p-4 space-y-4">
        
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-gray-800 font-medium mb-1">1 knowledge base document needs reindexing</p>
            <button className="text-xs font-semibold text-cr-amber hover:text-orange-800 transition-colors">
              [Reindex Now]
            </button>
          </div>
        </div>

        <div className="flex items-start pt-4">
          <Info className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-gray-800 font-medium mb-1">Ahsan (Admin) added 2 docs to knowledge base</p>
            <button className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors">
              [Review]
            </button>
          </div>
        </div>
        
      </div>
    </div>
  )
}
