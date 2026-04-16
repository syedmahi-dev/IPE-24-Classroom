'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { initMessaging } from '@/lib/firebaseClient'
import { getToken, deleteToken, onMessage } from 'firebase/messaging'

export type PushState = 'loading' | 'unsupported' | 'prompt' | 'enabled' | 'disabled' | 'denied'

async function waitForSWReady(timeoutMs = 5000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  const race = Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ])
  return race
}

async function sendConfigToSW() {
  const registration = await waitForSWReady()
  if (registration?.active) {
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
}

async function registerToken(token: string) {
  await fetch('/api/v1/push/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
}

async function unregisterTokens() {
  await fetch('/api/v1/push/register', { method: 'DELETE' })
}

export function usePushNotifications() {
  const [pushState, setPushState] = useState<PushState>('loading')
  const [isToggling, setIsToggling] = useState(false)
  const onMessageSetup = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setPushState('unsupported')
      return
    }

    let cancelled = false

    const init = async () => {
      // First ensure SW is registered (may already be registered by ServiceWorkerRegistrar)
      try {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      } catch {
        // Already registered or unsupported — fine
      }

      const messaging = await initMessaging()
      if (!messaging || cancelled) {
        if (!cancelled) setPushState('unsupported')
        return
      }

      await sendConfigToSW()

      const perm = Notification.permission
      if (perm === 'denied') {
        setPushState('denied')
        return
      }
      if (perm === 'default') {
        setPushState('prompt')
        return
      }

      // Permission is 'granted' — check if we can get a token
      try {
        const sw = await waitForSWReady()
        const currentToken = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
          serviceWorkerRegistration: sw || undefined,
        })
        if (cancelled) return
        if (currentToken) {
          setPushState('enabled')
          registerToken(currentToken).catch(() => {})
        } else {
          setPushState('disabled')
        }
      } catch (err) {
        console.warn('[Push] Could not get token on init:', err)
        if (!cancelled) setPushState('disabled')
      }

      // Set up foreground message handler once
      if (!onMessageSetup.current) {
        onMessageSetup.current = true
        onMessage(messaging, (payload) => {
          console.log('Foreground message received:', payload)
        })
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  const handleEnable = useCallback(async () => {
    setIsToggling(true)
    try {
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission()
        if (result === 'denied') {
          setPushState('denied')
          return
        }
        if (result !== 'granted') return
      }

      if (Notification.permission !== 'granted') {
        setPushState('prompt')
        return
      }

      const messaging = await initMessaging()
      if (!messaging) return

      // Re-register SW in case it was unregistered by deleteToken
      let sw: ServiceWorkerRegistration | null = null
      try {
        sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
        // Wait for the SW to become active
        if (sw.installing || sw.waiting) {
          await new Promise<void>((resolve) => {
            const worker = sw!.installing || sw!.waiting
            if (!worker) { resolve(); return }
            worker.addEventListener('statechange', () => {
              if (worker.state === 'activated') resolve()
            })
            // Timeout safety
            setTimeout(resolve, 3000)
          })
        }
      } catch {
        sw = await waitForSWReady()
      }

      await sendConfigToSW()

      const currentToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
        serviceWorkerRegistration: sw || undefined,
      })

      if (currentToken) {
        await registerToken(currentToken)
        setPushState('enabled')
      } else {
        console.warn('[Push] getToken returned null')
      }
    } catch (error) {
      console.error('Error enabling push notifications:', error)
    } finally {
      setIsToggling(false)
    }
  }, [])

  const handleDisable = useCallback(async () => {
    setIsToggling(true)
    try {
      const messaging = await initMessaging()
      if (messaging) {
        try { await deleteToken(messaging) } catch {}
      }
      await unregisterTokens()
      setPushState('disabled')
    } catch (error) {
      console.error('Error disabling push notifications:', error)
      await unregisterTokens().catch(() => {})
      setPushState('disabled')
    } finally {
      setIsToggling(false)
    }
  }, [])

  const handleToggle = useCallback(async () => {
    if (pushState === 'enabled') {
      await handleDisable()
    } else {
      await handleEnable()
    }
  }, [pushState, handleEnable, handleDisable])

  return { pushState, isToggling, handleEnable, handleDisable, handleToggle }
}
