'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register the main PWA service worker
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('PWA service worker registration failed:', err)
      })

      // Register the Firebase messaging service worker
      navigator.serviceWorker.register('/firebase-messaging-sw.js').catch((err) => {
        console.error('Firebase messaging SW registration failed:', err)
      })
    }
  }, [])

  return null
}
