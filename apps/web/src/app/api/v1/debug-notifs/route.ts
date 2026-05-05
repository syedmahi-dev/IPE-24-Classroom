import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Temporary debug endpoint — remove after verifying
export async function GET() {
  const session = await auth()
  const user = session?.user

  if (!user) {
    return NextResponse.json({ error: 'not authenticated' })
  }

  const notifCount = await prisma.notification.count({
    where: { userId: user.id },
  })

  const totalNotifs = await prisma.notification.count()

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id ?? 'NO_ID' },
    select: { id: true, email: true, name: true, role: true },
  })

  return NextResponse.json({
    sessionUser: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: (user as any).role,
    },
    dbUserMatch: dbUser,
    notificationsForThisUser: notifCount,
    totalNotificationsInDB: totalNotifs,
    idType: typeof user.id,
    idIsUndefined: user.id === undefined,
    idIsNull: user.id === null,
  })
}
