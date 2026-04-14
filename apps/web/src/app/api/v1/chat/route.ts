import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    const url = new URL(req.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) return ERRORS.VALIDATION('Invalid query parameters')

    const { page, limit } = parsed.data
    const skip = (page - 1) * limit

    const [items, total] = await prisma.$transaction([
      prisma.chatLog.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.chatLog.count({ where: { userId: session.user.id } })
    ])

    return ok(items, { page, limit, total, totalPages: Math.ceil(total / Math.max(limit, 1)) })
  } catch (error) {
    console.error('[Chat] GET error:', error)
    return ERRORS.INTERNAL()
  }
}

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string()
  })).optional().default([])
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    const body = await req.json()
    const parsed = chatSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION('Invalid chat payload')

    const { message, history } = parsed.data

    const systemInstruction = `You are the IPE-24 Classroom Assistant, designed to help students of the IUT Industrial & Production Engineering department (Batch 2024). Be professional, helpful, and concise. Help with course queries, routine, and study tips.`

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemInstruction }] },
        { role: 'model', parts: [{ text: 'Understood. I am ready to assist the IPE-24 students.' }] },
        ...history.map((h: any) => ({
          role: h.role,
          parts: [{ text: h.content }]
        }))
      ],
    })

    const result = await chat.sendMessage(message)
    const text = result.response.text()

    const logged = await prisma.chatLog.create({
      data: { userId: session.user.id, question: message, answer: text }
    })

    return ok({ text, logId: logged.id })
  } catch (error) {
    console.error('[Chat] POST error:', error)
    return ERRORS.INTERNAL()
  }
}
