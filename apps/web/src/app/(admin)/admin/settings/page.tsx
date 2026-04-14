import { Sparkles } from 'lucide-react'

export default function PlaceholderPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] glass rounded-3xl animate-fade-in p-8 text-center max-w-4xl mx-auto mt-8">
      <div className="w-24 h-24 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-brand-500/20">
        <Sparkles className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-4">
        Under Construction
      </h1>
      <p className="text-lg font-medium text-slate-500 dark:text-slate-400 max-w-lg mb-8">
        This module is currently being built in Phase 2 of our project roadmap. Stay tuned for updates!
      </p>
      <a 
        href="/admin"
        className="px-8 py-4 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl font-bold text-slate-700 dark:text-slate-300 transition-all hover:-translate-y-1 hover:shadow-lg"
      >
        Return to Dashboard
      </a>
    </div>
  )
}
