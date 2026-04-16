'use client'

import { useEffect, useState } from 'react'
import { initMessaging } from '@/lib/firebaseClient'
import { getToken, onMessage } from 'firebase/messaging'
import { BellRing, X } from 'lucide-react'

export default function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setPermission(Notification.permission)
      
      initMessaging().then(async (messaging) => {
        if (messaging) {
          setIsSupported(true)
          
          // Send config to service worker
          const registration = await navigator.serviceWorker.ready
          if (registration && registration.active) {
            registration.active.postMessage({
              type: 'INIT_FIREBASE',
              firebaseConfig: {
                apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
              }
            })
          }

          if (Notification.permission === 'default') {
            setShowPrompt(true)
          } else if (Notification.permission === 'granted') {
            registerPushToken(messaging)
          }

          // Handle foreground messages
          onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload)
          })
        }
      })
    }
  }, [])


  const registerPushToken = async (messaging: any) => {
    try {
      const currentToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY
      })
      
      if (currentToken) {
        // Send to our backend
        await fetch('/api/v1/push/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: currentToken }),
        })
      } else {
        console.log('No registration token available.')
      }
    } catch (err) {
      console.error('An error occurred while retrieving token:', err)
    }
  }

  const handleRequestPermission = async () => {
    try {
      const p = await Notification.requestPermission()
      setPermission(p)
      setShowPrompt(false)
      if (p === 'granted') {
        const messaging = await initMessaging()
        if (messaging) {
          registerPushToken(messaging)
        }
      }
    } catch (error) {
      console.error('Error requesting permission', error)
      setShowPrompt(false)
    }
  }

  if (!isSupported || !showPrompt) return null

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
          onClick={handleRequestPermission}
          className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-brand-500/20 active:scale-95 transition-all"
        >
          Enable Now
        </button>
        <button 
          onClick={() => setShowPrompt(false)}
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
