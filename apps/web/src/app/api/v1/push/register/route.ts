export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await auth()
    const user = session?.user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await req.json()
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Upsert the push token
    const pushToken = await prisma.pushToken.upsert({
      where: { token },
      update: { userId: user.id },
      create: { token, userId: user.id },
    })

    return NextResponse.json({ success: true, pushToken })
  } catch (error) {
    console.error('[PUSH_REGISTER_ERROR]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
