export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { stripHtml } from '@/lib/sanitize'
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  buildRAGSystemPrompt,
  buildChatHistory,
  detectPromptInjection,
} from '@/lib/prompt-builder'
import { fetchLiveContext, formatLiveContext } from '@/lib/virtual-cr-context'
import { z } from 'zod'

export const maxDuration = 10

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// ── GET: Chat history ─────────────────────────────────────────────────────────

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

// ── POST: RAG Chat Pipeline ───────────────────────────────────────────────────

// Accept both "question" (legacy) and "message" (current page) field names
const chatSchema = z.object({
  question: z.string().min(1).max(500).optional(),
  message: z.string().min(1).max(500).optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string()
  })).optional().default([])
}).refine(data => data.question || data.message, { message: 'question or message is required' })

export async function POST(req: NextRequest) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
  try {
    const session = await auth()
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    // ── Step 1: Rate limit (20 questions per hour per user) ──
    const rl = await rateLimit(`chat:${session.user.id}`, 20, 3600)
    if (!rl.success) {
      return NextResponse.json({
        success: false,
        data: null,
        error: { code: 'RATE_LIMITED', message: 'Too many questions — try again later.' },
        rateLimit: { remaining: 0, limit: 20 },
      }, { status: 429 })
    }

    const body = await req.json()
    const parsed = chatSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION('Invalid chat payload')

    const { history } = parsed.data
    const question = stripHtml(parsed.data.question || parsed.data.message || '').trim()

    // ── Step 2: Prompt injection detection ──
    if (detectPromptInjection(question)) {
      const text = "I can only help with class-related questions. Please ask about routine, exams, announcements, or class resources! 😊"
      await prisma.chatLog.create({ data: { userId: session.user.id, question, answer: text } })
      return ok({ text, filtered: true })
    }

    // ── Step 3: Fetch live context from DB ──
    // Give it 5s — first request on cold start needs Prisma init time
    let liveCtx = null
    try {
      liveCtx = await Promise.race([
        fetchLiveContext(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ])
    } catch {
      // Non-fatal — will proceed without live context
    }

    // ── Step 4: Build system prompt (works with or without live context) ──
    const liveContextStr = liveCtx ? formatLiveContext(liveCtx) : undefined
    const systemPrompt = buildRAGSystemPrompt([], liveContextStr)

    // ── Step 5: Generate response with Gemini ──
    const chatModel = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 600,
        temperature: 0.3,
      },
      systemInstruction: systemPrompt,
    })

    const chatHistory = buildChatHistory(history.slice(-6))
    const chat = chatModel.startChat({ history: chatHistory })
    const result = await chat.sendMessage(question)
    const text = result.response.text()

    // ── Step 6: Log to database ──
    const logged = await prisma.chatLog.create({
      data: { userId: session.user.id, question, answer: text }
    }).catch(() => null)

    return ok({
      text,
      logId: logged?.id ?? null,
      hasLiveContext: !!liveCtx,
      filtered: false,
      rateLimit: { remaining: rl.remaining, limit: 20 },
    })
  } catch (error: any) {
    console.error('[Chat] POST error:', error)
    return NextResponse.json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: error?.message || 'Unknown error occurred' }
    }, { status: 500 })
  }
}
