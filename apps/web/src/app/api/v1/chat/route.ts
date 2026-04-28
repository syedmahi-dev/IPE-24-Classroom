export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, ERRORS } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { stripHtml } from '@/lib/sanitize'
import { NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getEmbedding } from '@/lib/embeddings'
import { searchKnowledge } from '@/lib/vector-search'
import {
  buildRAGSystemPrompt,
  buildGuardrailPrompt,
  buildChatHistory,
  detectPromptInjection,
} from '@/lib/prompt-builder'
import { z } from 'zod'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

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

const chatSchema = z.object({
  message: z.string().min(1).max(500),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string()
  })).optional().default([])
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return ERRORS.UNAUTHORIZED()

    // ── Step 1: Rate limit (20 questions per hour per user) ──
    const rl = await rateLimit(`chat:${session.user.id}`, 20, 3600)
    if (!rl.success) {
      return ERRORS.RATE_LIMITED()
    }

    const body = await req.json()
    const parsed = chatSchema.safeParse(body)
    if (!parsed.success) return ERRORS.VALIDATION('Invalid chat payload')

    const { message, history } = parsed.data
    const question = stripHtml(message).trim()

    // ── Step 2: Prompt injection detection ──
    if (detectPromptInjection(question)) {
      const injectionResponse = "I can only help with class-related questions. Please ask about routine, exams, announcements, or class resources! 😊"
      await prisma.chatLog.create({
        data: { userId: session.user.id, question, answer: injectionResponse }
      })
      return ok({ text: injectionResponse, filtered: true })
    }

    // ── Step 3: Gemini rate limit (12 requests/min global) ──
    const geminiRl = await rateLimit('gemini:global', 12, 60)
    if (!geminiRl.success) {
      return ok({
        text: "I'm receiving too many questions right now. Please try again in a minute! ⏳",
        filtered: true
      })
    }

    // ── Step 4: Guardrail — classify on-topic vs off-topic ──
    try {
      const guardModel = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { temperature: 0, maxOutputTokens: 10 },
      })
      const guardResult = await guardModel.generateContent(buildGuardrailPrompt(question))
      const topicCheck = guardResult.response.text().trim().toLowerCase()

      if (topicCheck.includes('off_topic')) {
        const offTopicResponse = "I can only help with class-related questions — routine, exams, announcements, class notes, and file locations. For other questions, try Google or ChatGPT! 😊"
        await prisma.chatLog.create({
          data: { userId: session.user.id, question, answer: offTopicResponse }
        })
        return ok({ text: offTopicResponse, filtered: true })
      }
    } catch (err) {
      // If guardrail fails, let the question through — better UX than blocking
      console.warn('[Chat] Guardrail check failed, proceeding:', err)
    }

    // ── Step 5: Embed the user's question ──
    let queryEmbedding: number[]
    try {
      queryEmbedding = await getEmbedding(question)
    } catch (err) {
      console.error('[Chat] Embedding failed:', err)
      return ok({
        text: "I'm having trouble processing your question right now. Please try again in a moment.",
        filtered: false
      })
    }

    // ── Step 6: Vector search — retrieve top-5 relevant chunks ──
    const relevantChunks = await searchKnowledge(queryEmbedding, 5)

    // ── Step 7: Build grounded system prompt ──
    const systemPrompt = buildRAGSystemPrompt(relevantChunks)

    // ── Step 8: Generate response with Gemini ──
    const chatModel = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.3,  // Lower = more factual
        topP: 0.8,
      },
      systemInstruction: systemPrompt,
    })

    const chatHistory = buildChatHistory(history.slice(-6)) // Last 6 messages for context
    const chat = chatModel.startChat({ history: chatHistory })
    const result = await chat.sendMessage(question)
    const text = result.response.text()

    // ── Step 9: Log to database ──
    const logged = await prisma.chatLog.create({
      data: { userId: session.user.id, question, answer: text }
    })

    return ok({
      text,
      logId: logged.id,
      sourcesUsed: relevantChunks.length,
      filtered: false,
    })
  } catch (error) {
    console.error('[Chat] POST error:', error)
    return ERRORS.INTERNAL()
  }
}
