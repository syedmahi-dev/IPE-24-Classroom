'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { initMessaging } from '@/lib/firebaseClient'
import { getToken, deleteToken, onMessage, type Messaging } from 'firebase/messaging'

export type PushState = 'loading' | 'unsupported' | 'prompt' | 'enabled' | 'disabled' | 'denied' | 'error'

// VAPID key is a public key (Web Push certificate), safe to embed as fallback
const VAPID_KEY_RAW = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || 'BIho0tjpDfyiC4z-iH0h11Q6zB4CGHVO30fUANVur20lXUsM_2Atgt0OKhayzxSapKWB6Pu0l2RjEm9ZHQxqVgw'
const VAPID_KEY = VAPID_KEY_RAW.replace(/\s+/g, '')

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServiceWorkerReady(timeoutMs = 10000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const ready = await Promise.race<ServiceWorkerRegistration | null>([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ])
    return ready
  } catch {
    return null
  }
}

async function ensureSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const existing = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
    const reg = existing || await navigator.serviceWorker.register('/firebase-messaging-sw.js')

    // Ensure latest SW script is picked up if it changed.
    reg.update().catch(() => undefined)

    if (reg.active) return reg

    const readyReg = await waitForServiceWorkerReady()
    if (readyReg?.active) return readyReg

    const refreshed = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
    if (refreshed?.active) return refreshed

    console.error('[Push] SW registered but not active yet')
    return null
  } catch (err) {
    console.error('[Push] SW registration failed:', err)
    return null
  }
}

async function fetchToken(messaging: Messaging, sw: ServiceWorkerRegistration): Promise<string | null> {
  let activeSW = sw
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: activeSW,
      })
      if (token) return token
    } catch (err) {
      console.error(`[Push] getToken failed (attempt ${attempt + 1}):`, err)
      // Fallback: try without explicit VAPID in case of key mismatch/encoding issues.
      try {
        const fallbackToken = await getToken(messaging, {
          serviceWorkerRegistration: activeSW,
        })
        if (fallbackToken) return fallbackToken
      } catch (fallbackErr) {
        console.error(`[Push] getToken fallback failed (attempt ${attempt + 1}):`, fallbackErr)
      }
    }

    if (attempt === 0) {
      await wait(500)
      const readyReg = await waitForServiceWorkerReady()
      if (readyReg) activeSW = readyReg
    }
  }
  return null
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

    for (let attempt = 0; attempt < 2; attempt++) {
      const sw = await ensureSW()
      const messaging = await initMessaging()
      if (sw && messaging) {
        swRef.current = sw
        messagingRef.current = messaging
        return { messaging, sw }
      }
      await wait(300)
    }

    return null
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
      const perm = Notification.permission
      if (perm === 'denied') { setPushState('denied'); return }
      if (perm === 'default') { setPushState('prompt'); return }

      const ready = await getReady()
      if (cancelled) return
      if (!ready) { setPushState('disabled'); return }

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
      if (!ready) { setPushState('disabled'); return }

      const token = await fetchToken(ready.messaging, ready.sw)
      if (!token) {
        console.error('[Push] Could not obtain FCM token after permission was granted')
        setPushState('disabled')
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
    if (!ready) { setPushState('disabled'); return }
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
