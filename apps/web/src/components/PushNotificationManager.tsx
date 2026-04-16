'use client'

import { useState } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { BellRing, BellOff, X, Loader2 } from 'lucide-react'

export default function PushNotificationManager() {
  const { pushState, isToggling, handleToggle, handleEnable } = usePushNotifications()
  const [dismissed, setDismissed] = useState(false)

  // Don't render anything while loading or if unsupported
  if (pushState === 'loading' || pushState === 'unsupported') return null

  // Enabled/disabled toggle view
  if (pushState === 'enabled' || pushState === 'disabled') {
    const isEnabled = pushState === 'enabled'
    return (
      <div className="glass rounded-[2rem] p-5 md:p-6 shadow-xl mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 border border-brand-200/50 dark:border-brand-500/20 bg-gradient-to-r from-brand-50/50 to-indigo-50/50 dark:from-brand-900/10 dark:to-indigo-900/10 relative overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner transition-colors ${
            isEnabled 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
          }`}>
            {isEnabled ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              Push Notifications
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEnabled ? 'You\'ll receive alerts for new announcements & updates' : 'Turn on to get instant alerts on your device'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={isToggling}
          aria-label={isEnabled ? 'Disable push notifications' : 'Enable push notifications'}
          className={`relative z-10 w-14 h-8 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 shrink-0 ${
            isEnabled
              ? 'bg-green-500 dark:bg-green-600'
              : 'bg-slate-300 dark:bg-slate-600'
          } ${isToggling ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
        >
          <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 flex items-center justify-center ${
            isEnabled ? 'translate-x-6' : 'translate-x-0'
          }`}>
            {isToggling && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
          </span>
        </button>
        
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/5 blur-3xl rounded-full pointer-events-none" />
      </div>
    )
  }

  // Denied state — inform user they need to change browser settings
  if (pushState === 'denied') {
    return (
      <div className="glass rounded-[2rem] p-5 md:p-6 shadow-xl mb-8 flex items-center gap-4 border border-amber-200/50 dark:border-amber-500/20 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 relative overflow-hidden">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-inner">
          <BellOff className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Notifications Blocked</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Push notifications are blocked by your browser. To enable them, click the lock icon in your address bar and allow notifications.
          </p>
        </div>
      </div>
    )
  }

  // Initial prompt state — ask user to enable
  if (dismissed) return null

  return (
    <div className="glass rounded-[2rem] p-6 shadow-xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-brand-200/50 dark:border-brand-500/20 bg-gradient-to-r from-brand-50/50 to-indigo-50/50 dark:from-brand-900/10 dark:to-indigo-900/10 relative overflow-hidden">
      <div className="flex items-center gap-4 relative z-10">
        <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0 shadow-inner">
          <BellRing className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Enable Push Notifications!</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Get instantly notified about new announcements and class updates right on your device screen!</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 w-full md:w-auto relative z-10">
        <button 
          onClick={handleEnable}
          disabled={isToggling}
          className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
        >
          {isToggling && <Loader2 className="w-4 h-4 animate-spin" />}
          Enable Now
        </button>
        <button 
          onClick={() => setDismissed(true)}
          className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          title="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
    </div>
  )
}
