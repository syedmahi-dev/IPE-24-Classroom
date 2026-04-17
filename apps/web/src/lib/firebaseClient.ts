import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, isSupported } from 'firebase/messaging'

// Firebase public config — same values embedded in firebase-messaging-sw.js.
// These are safe to expose (they are public identifiers, not secrets).
// Using env vars is preferred for multi-environment setups, but we fall back
// to hardcoded values so push notifications work even if env vars are missing.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyB-qEtd6MNb-cHkTPtXROXGQbuUC-mtvDk',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'ipe-24.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ipe-24',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'ipe-24.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '538496451475',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:538496451475:web:7b349e771a84ffa791de66',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

let app: ReturnType<typeof initializeApp> | null = null

function getApp() {
  if (typeof window === 'undefined') return null
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  }
  return app
}

let messaging: ReturnType<typeof getMessaging> | null = null

export const initMessaging = async () => {
  if (typeof window === 'undefined') return null
  try {
    const firebaseApp = getApp()
    if (!firebaseApp) return null
    const supported = await isSupported().catch(() => null)
    if (supported === false) {
      // Some environments report unsupported here while still allowing token flow.
      // We still attempt getMessaging and let getToken decide final support.
      console.warn('[Firebase] messaging isSupported() returned false; attempting getMessaging anyway')
    }
    messaging = getMessaging(firebaseApp)
    return messaging
  } catch (e) {
    console.error('[Firebase] Messaging init failed:', e)
  }
  return null
}

export { getApp }
