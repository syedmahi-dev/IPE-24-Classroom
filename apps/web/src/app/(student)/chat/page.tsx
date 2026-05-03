'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Brain, Send, Bot, User, Loader2, Loader,
  Copy, Check, Trash2, CalendarDays, BookOpen,
  FileText, MessageSquare, Sparkles, GraduationCap,
} from 'lucide-react'

// ── Suggested Questions ───────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  { icon: CalendarDays, label: 'Today\'s classes', question: 'What classes do I have today?' },
  { icon: BookOpen, label: 'Upcoming exams', question: 'Are there any upcoming exams or CTs?' },
  { icon: FileText, label: 'Class files', question: 'What files are available on Google Drive?' },
  { icon: MessageSquare, label: 'Announcements', question: 'What are the latest announcements?' },
  { icon: GraduationCap, label: 'Course info', question: 'List all courses with teacher names' },
  { icon: CalendarDays, label: 'Schedule changes', question: 'Are there any schedule changes this week?' },
]

// ── Lightweight Markdown Renderer ─────────────────────────────────────────────

function renderMarkdown(text: string): string {
  return text
    // Bold: **text** or __text__
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/(?<!\w)_(.*?)_(?!\w)/g, '<em>$1</em>')
    // Inline code: `code`
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-sm font-mono">$1</code>')
    // Links: [text](url)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-500 hover:text-indigo-400 underline underline-offset-2">$1</a>')
    // Bare URLs
    .replace(/(?<!["\(])(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-indigo-500 hover:text-indigo-400 underline underline-offset-2 break-all">$1</a>')
    // Bullet points: lines starting with - or • or *
    .replace(/^[•\-\*]\s+(.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Numbered lists: 1. text
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/((?:<li[^>]*>.*?<\/li>\n?)+)/g, '<ul class="space-y-1 my-1">$1</ul>')
    // Newlines to <br/>
    .replace(/\n/g, '<br/>')
}

// ── Message Type ──────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [rateLimit, setRateLimit] = useState<{ remaining: number; limit: number } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Load chat history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch('/api/v1/chat?page=1&limit=50')
        const data = await res.json()
        if (data.success && data.data) {
          const formatted: ChatMessage[] = data.data.reverse().flatMap((log: any) => [
            { role: 'user' as const, content: log.question },
            { role: 'model' as const, content: log.answer },
          ])
          setMessages(formatted)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setHistoryLoading(false)
      }
    }
    loadHistory()
  }, [])

  const handleSubmit = async (e?: React.FormEvent, prefill?: string) => {
    e?.preventDefault()
    const text = prefill || input.trim()
    if (!text || isLoading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10),
        }),
      })

      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error(res.status === 504 ? 'Request timed out. Try again.' : 'Server error. Please try again.')
      }

      const data = await res.json()

      // Update rate limit from response
      const rl = data.data?.rateLimit ?? data.rateLimit
      if (rl) setRateLimit(rl)

      if (!data.success) throw new Error(data.error?.message || 'Something went wrong')

      setMessages(prev => [...prev, { role: 'model', content: data.data.text }])
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'model', content: `Sorry, something went wrong: ${error.message}` }])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSuggestionClick = (question: string) => {
    handleSubmit(undefined, question)
  }

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    } catch { /* clipboard not available */ }
  }

  const handleClearHistory = async () => {
    setMessages([])
  }

  const showWelcome = !historyLoading && messages.length === 0

  return (
    <div className="w-full max-w-5xl mx-auto min-h-[calc(100dvh-120px)] md:min-h-[calc(100dvh-140px)] flex flex-col pb-16 md:pb-6 min-w-0">
      <div className="glass rounded-2xl md:rounded-[2rem] flex flex-col h-full overflow-hidden shadow-xl md:shadow-2xl shadow-indigo-900/5 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-white/20 dark:from-slate-900/50 dark:to-slate-900/20 pointer-events-none" />

        {/* ── Header ── */}
        <div className="p-4 md:p-6 flex items-center justify-between border-b border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 relative">
              <Brain className="w-5 h-5 md:w-6 md:h-6" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full animate-pulse" />
            </div>
            <div>
              <h2 className="text-base md:text-xl font-black text-slate-800 dark:text-slate-100">Virtual CR</h2>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Live knowledge · Gemini AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Rate limit indicator */}
            {rateLimit && (
              <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5">
                <div className="flex gap-0.5">
                  {Array.from({ length: rateLimit.limit }, (_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-3 rounded-full transition-colors ${
                        i < rateLimit.remaining
                          ? 'bg-indigo-400'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <span>{rateLimit.remaining}/{rateLimit.limit}</span>
              </div>
            )}

            {/* Clear history */}
            {messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Clear chat"
                aria-label="Clear chat history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 z-10 scrollbar-hide scroll-touch">
          {historyLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : showWelcome ? (
            /* ── Welcome State ── */
            <div className="h-full flex flex-col items-center justify-center px-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-5">
                <Brain className="w-8 h-8 md:w-10 md:h-10" />
              </div>
              <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 mb-1">
                Hey! I&apos;m your Virtual CR
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center max-w-md">
                I know your routine, exams, announcements, class files, and Discord updates. Ask me anything about IPE-24!
              </p>

              {/* Suggested question chips */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 w-full max-w-lg">
                {SUGGESTED_QUESTIONS.map((sq) => (
                  <button
                    key={sq.question}
                    onClick={() => handleSuggestionClick(sq.question)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-md transition-all active:scale-95 text-left"
                  >
                    <sq.icon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span className="truncate">{sq.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Message List ── */
            messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                {m.role === 'model' && (
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className="relative max-w-[85%] md:max-w-[75%]">
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm md:text-[15px] leading-relaxed shadow-sm ${
                      m.role === 'user'
                        ? 'bg-slate-800 dark:bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 rounded-bl-sm'
                    }`}
                  >
                    {m.role === 'model' ? (
                      <div
                        className="prose-sm prose-slate dark:prose-invert max-w-none [&_ul]:my-1 [&_li]:my-0"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>

                  {/* Copy button for bot messages */}
                  {m.role === 'model' && (
                    <button
                      onClick={() => handleCopy(m.content, i)}
                      className="absolute -bottom-5 left-10 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 py-0.5"
                      aria-label="Copy message"
                    >
                      {copiedIdx === i ? (
                        <><Check className="w-3 h-3 text-emerald-500" /> Copied</>
                      ) : (
                        <><Copy className="w-3 h-3" /> Copy</>
                      )}
                    </button>
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 flex-shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl rounded-bl-sm px-5 py-3.5 shadow-sm flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input Area ── */}
        <div className="p-3 md:p-5 bg-white/60 dark:bg-slate-900/60 border-t border-white/60 dark:border-white/10 z-10 backdrop-blur-md">
          {/* Mobile rate limit */}
          {rateLimit && rateLimit.remaining <= 5 && (
            <div className="md:hidden flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium mb-2">
              <Sparkles className="w-3 h-3" />
              {rateLimit.remaining} question{rateLimit.remaining !== 1 ? 's' : ''} remaining this hour
            </div>
          )}

          {/* Suggestion chips when there are messages */}
          {!showWelcome && messages.length > 0 && messages.length < 6 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-2 pb-1">
              {SUGGESTED_QUESTIONS.slice(0, 4).map((sq) => (
                <button
                  key={sq.question}
                  onClick={() => handleSuggestionClick(sq.question)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap flex-shrink-0 disabled:opacity-40"
                >
                  <sq.icon className="w-3 h-3" />
                  {sq.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              aria-label="Chat message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about routine, exams, files, announcements..."
              maxLength={500}
              className="w-full pl-4 md:pl-5 pr-14 py-3.5 md:py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl md:rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 text-sm md:text-base text-slate-700 dark:text-slate-200 font-medium transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 p-2.5 md:p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 transition-all hover:scale-105 active:scale-95 flex items-center justify-center min-w-[44px] min-h-[44px]"
              aria-label="Send message"
            >
              {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
