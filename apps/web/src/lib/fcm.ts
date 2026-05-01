import admin from 'firebase-admin'
import { prisma } from './prisma'

function getFirebaseServiceAccount(): admin.ServiceAccount | null {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (base64) {
    try {
      return JSON.parse(Buffer.from(base64, 'base64').toString())
    } catch (err) {
      console.error('[FCM] Invalid FIREBASE_SERVICE_ACCOUNT_KEY:', err)
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY

  if (projectId && clientEmail && privateKeyRaw) {
    return {
      projectId,
      clientEmail,
      privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
    }
  }

  return null
}

if (!admin.apps.length) {
  const serviceAccount = getFirebaseServiceAccount()
  if (serviceAccount) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
    } catch (err) {
      console.error('[FCM] Failed to initialize Firebase Admin:', err)
    }
  }
}

export async function broadcastPushNotification(title: string, body: string, link?: string) {
  if (!admin.apps.length) {
    console.warn('[FCM] Firebase Admin not initialized — skipping push')
    return
  }

  const tokens = await prisma.pushToken.findMany({ select: { token: true } })
  if (tokens.length === 0) return

  const tokenList = tokens.map((t) => t.token)

  // FCM batch send (max 500 per batch)
  const chunks: string[][] = []
  for (let i = 0; i < tokenList.length; i += 500) {
    chunks.push(tokenList.slice(i, i + 500))
  }

  const staleTokens: string[] = []

  for (const chunk of chunks) {
    try {
      const result = await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        webpush: link ? { fcmOptions: { link } } : undefined,
      })

      // Collect stale/invalid tokens for cleanup
      result.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code
          // These error codes mean the token is permanently invalid
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-argument'
          ) {
            staleTokens.push(chunk[idx])
          }
        }
      })

      console.log(`[FCM] Sent ${result.successCount}/${chunk.length} (${result.failureCount} failed)`)
    } catch (err) {
      console.error('[FCM] Broadcast error:', err)
    }
  }

  // Cleanup stale tokens
  if (staleTokens.length > 0) {
    try {
      const deleted = await prisma.pushToken.deleteMany({
        where: { token: { in: staleTokens } },
      })
      console.log(`[FCM] Cleaned up ${deleted.count} stale tokens`)
    } catch (err) {
      console.error('[FCM] Failed to cleanup stale tokens:', err)
    }
  }
}
