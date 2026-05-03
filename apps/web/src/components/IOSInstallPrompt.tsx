'use client'

import { useState, useEffect } from 'react'
import { Share, PlusSquare, X } from 'lucide-react'

export default function IOSInstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if user has dismissed the prompt previously
    if (localStorage.getItem('iosInstallPromptDismissed')) {
      setIsDismissed(true)
      return
    }

    const userAgent = window.navigator.userAgent.toLowerCase()
    
    // Check for iOS Safari (exclude other browsers on iOS like Chrome which have a different UA pattern, 
    // although technically Safari is the only one that can "Add to Home Screen" properly on older iOS)
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    
    // In iOS, standalone mode can be checked via navigator.standalone or matchMedia
    const isInstalled = 
      ('standalone' in window.navigator && (window.navigator as any).standalone === true) || 
      window.matchMedia('(display-mode: standalone)').matches

    setIsIOS(isIosDevice)
    setIsStandalone(isInstalled)
  }, [])

  if (!isIOS || isStandalone || isDismissed) {
    return null
  }

  const dismissPrompt = () => {
    setIsDismissed(true)
    localStorage.setItem('iosInstallPromptDismissed', 'true')
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
      <div className="glass-dark bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-4 rounded-2xl shadow-2xl flex items-start gap-4 text-slate-100">
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-white">Install IPE-24 App</h3>
          <p className="text-sm text-slate-300">
            Install this application on your home screen for quick and easy access when you're on the go.
          </p>
          <div className="flex items-center gap-2 text-sm mt-3 text-brand-300 font-medium">
            <span>Tap</span>
            <Share className="w-5 h-5 bg-slate-800 p-1 rounded border border-slate-700" />
            <span>then</span>
            <PlusSquare className="w-5 h-5 bg-slate-800 p-1 rounded border border-slate-700" />
            <span>Add to Home Screen</span>
          </div>
        </div>
        <button 
          onClick={dismissPrompt}
          className="text-slate-400 hover:text-white transition-colors bg-slate-800/50 hover:bg-slate-800 p-1.5 rounded-full"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
