'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { initMessaging } from '@/lib/firebaseClient'
import { getToken, deleteToken, onMessage, type Messaging } from 'firebase/messaging'

export type PushState = 'loading' | 'unsupported' | 'prompt' | 'enabled' | 'disabled' | 'denied' | 'error'

const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY

async function ensureSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    if (reg.active) return reg
    // Wait for the new SW to activate
    await new Promise<void>((resolve) => {
      const worker = reg.installing || reg.waiting
      if (!worker) { resolve(); return }
      const check = () => {
        if (worker.state === 'activated') { worker.removeEventListener('statechange', check); resolve() }
      }
      worker.addEventListener('statechange', check)
      setTimeout(resolve, 5000) // safety timeout
    })
    return reg
  } catch (err) {
    console.error('[Push] SW registration failed:', err)
    return null
  }
}

async function fetchToken(messaging: Messaging, sw: ServiceWorkerRegistration): Promise<string | null> {
  try {
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: sw,
    })
    return token || null
  } catch (err) {
    console.error('[Push] getToken failed:', err)
    return null
  }
}

async function serverRegister(token: string): Promise<boolean> {
  try {
    const res = await fetch('/api/v1/push/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function serverUnregister(): Promise<void> {
  try { await fetch('/api/v1/push/register', { method: 'DELETE' }) } catch {}
}

export function usePushNotifications() {
  const [pushState, setPushState] = useState<PushState>('loading')
  const [isToggling, setIsToggling] = useState(false)
  const messagingRef = useRef<Messaging | null>(null)
  const swRef = useRef<ServiceWorkerRegistration | null>(null)
  const onMessageSetup = useRef(false)

  // Shared helper: get messaging + SW, cache in refs
  const getReady = useCallback(async (): Promise<{ messaging: Messaging; sw: ServiceWorkerRegistration } | null> => {
    if (messagingRef.current && swRef.current) {
      return { messaging: messagingRef.current, sw: swRef.current }
    }
    const sw = await ensureSW()
    if (!sw) return null
    const messaging = await initMessaging()
    if (!messaging) return null
    swRef.current = sw
    messagingRef.current = messaging
    return { messaging, sw }
  }, [])

  // --- Init on mount ---
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setPushState('unsupported')
      return
    }
    if (!VAPID_KEY) {
      console.error('[Push] NEXT_PUBLIC_FCM_VAPID_KEY is not set')
      setPushState('error')
      return
    }

    let cancelled = false

    const init = async () => {
      const ready = await getReady()
      if (cancelled) return
      if (!ready) { setPushState('unsupported'); return }

      const perm = Notification.permission
      if (perm === 'denied') { setPushState('denied'); return }
      if (perm === 'default') { setPushState('prompt'); return }

      // Permission already granted — try to get/refresh token
      const token = await fetchToken(ready.messaging, ready.sw)
      if (cancelled) return
      if (token) {
        serverRegister(token) // fire & forget
        setPushState('enabled')
      } else {
        setPushState('disabled')
      }

      // Foreground message handler
      if (!onMessageSetup.current) {
        onMessageSetup.current = true
        onMessage(ready.messaging, (payload) => {
          const title = payload.notification?.title || 'IPE-24 Update'
          const body = payload.notification?.body || ''
          const link = payload.fcmOptions?.link || payload.data?.link
          // Use service worker showNotification (works on mobile + desktop)
          if (Notification.permission === 'granted' && ready.sw.active) {
            ready.sw.showNotification(title, {
              body,
              icon: '/android-chrome-192x192.png',
              badge: '/favicon-32x32.png',
              data: { link: link || '/' },
            })
          }
        })
      }
    }

    init()
    return () => { cancelled = true }
  }, [getReady])

  // --- Enable ---
  const handleEnable = useCallback(async () => {
    setIsToggling(true)
    try {
      // Request permission if not yet granted
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission()
        if (result === 'denied') { setPushState('denied'); return }
        if (result !== 'granted') { setPushState('prompt'); return }
      }
      if (Notification.permission === 'denied') { setPushState('denied'); return }
      if (Notification.permission !== 'granted') { setPushState('prompt'); return }

      const ready = await getReady()
      if (!ready) { setPushState('error'); return }

      const token = await fetchToken(ready.messaging, ready.sw)
      if (!token) {
        console.error('[Push] Could not obtain FCM token after permission was granted')
        setPushState('error')
        return
      }

      const registered = await serverRegister(token)
      if (!registered) {
        console.error('[Push] Server rejected token registration')
        // Still mark enabled client-side; push will work, just server doesn't know
      }
      setPushState('enabled')
    } catch (error) {
      console.error('[Push] Enable failed:', error)
      setPushState('error')
    } finally {
      setIsToggling(false)
    }
  }, [getReady])

  // --- Disable ---
  const handleDisable = useCallback(async () => {
    setIsToggling(true)
    try {
      if (messagingRef.current) {
        try { await deleteToken(messagingRef.current) } catch {}
      }
      await serverUnregister()
    } catch {
      // serverUnregister failed — still mark as disabled locally
    } finally {
      setPushState('disabled')
      setIsToggling(false)
    }
  }, [])

  // --- Toggle ---
  const handleToggle = useCallback(async () => {
    if (pushState === 'enabled') await handleDisable()
    else await handleEnable()
  }, [pushState, handleEnable, handleDisable])

  // --- Retry from error state ---
  const handleRetry = useCallback(async () => {
    setPushState('loading')
    messagingRef.current = null
    swRef.current = null
    const ready = await getReady()
    if (!ready) { setPushState('error'); return }
    if (Notification.permission === 'granted') {
      await handleEnable()
    } else if (Notification.permission === 'denied') {
      setPushState('denied')
    } else {
      setPushState('prompt')
    }
  }, [getReady, handleEnable])

  return { pushState, isToggling, handleEnable, handleDisable, handleToggle, handleRetry }
}
