import admin from 'firebase-admin'
import { prisma } from './prisma'

if (!admin.apps.length && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString())
    ),
  })
}

export async function broadcastPushNotification(title: string, body: string, link?: string) {
  if (!admin.apps.length) return // Firebase not configured

  const tokens = await prisma.pushToken.findMany({ select: { token: true } })
  if (tokens.length === 0) return

  const tokenList = tokens.map((t) => t.token)

  // FCM batch send (max 500 per batch)
  const chunks: string[][] = []
  for (let i = 0; i < tokenList.length; i += 500) {
    chunks.push(tokenList.slice(i, i + 500))
  }

  for (const chunk of chunks) {
    try {
      await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        webpush: link ? { fcmOptions: { link } } : undefined,
      })
    } catch (err) {
      console.error('FCM broadcast error:', err)
    }
  }
}
