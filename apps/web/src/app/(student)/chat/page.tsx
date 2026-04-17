'use client'

import { useState, useRef, useEffect } from 'react'
import { Brain, Send, Bot, User, Loader2, Loader } from 'lucide-react'

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch('/api/v1/chat?page=1&limit=50')
        const data = await res.json()
        if (data.success && data.data) {
          const formatted = data.data.reverse().flatMap((log: any) => [
            { role: 'user', content: log.question },
            { role: 'model', content: log.answer }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages.slice(-10) // Send last 10 messages for context
        })
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error?.message)

      setMessages(prev => [...prev, { role: 'model', content: data.data.text }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "Sorry, I'm having trouble connecting right now." }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto min-h-[calc(100dvh-120px)] md:min-h-[calc(100dvh-140px)] flex flex-col pb-16 md:pb-6 min-w-0">
      <div className="glass rounded-2xl md:rounded-[2rem] flex flex-col h-full overflow-hidden shadow-xl md:shadow-2xl shadow-indigo-900/5 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-white/20 pointer-events-none" />
        
        {/* Chat Header */}
        <div className="p-4 md:p-8 flex items-center justify-between border-b border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3 md:gap-5">
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 relative">
               <Brain className="w-5 h-5 md:w-7 md:h-7" />
               <div className="absolute -bottom-0.5 -right-0.5 md:-bottom-1 md:-right-1 w-3 h-3 md:w-4 md:h-4 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full animate-pulse" />
            </div>
            <div>
              <h2 className="text-base md:text-2xl font-black text-slate-800 dark:text-slate-100">Virtual CR</h2>
              <p className="text-xs md:text-sm font-bold text-indigo-600 dark:text-indigo-400">Gemini AI Assistant</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-8 z-10 scrollbar-hide scroll-touch">
          {historyLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 opacity-60">
              <Brain className="w-20 h-20 mb-4" />
              <p className="font-bold text-lg">Send a message to start chatting.</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'model' && (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm mt-1">
                    <Bot className="w-5 h-5" />
                  </div>
                )}
                
                <div className={`max-w-[85%] md:max-w-[80%] rounded-2xl md:rounded-[1.5rem] px-4 md:px-6 py-3 md:py-4 font-medium text-sm md:text-[15px] leading-relaxed shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-slate-800 dark:bg-indigo-600 text-white rounded-br-sm' 
                    : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 rounded-bl-sm'
                }`}>
                  <div dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, '<br/>') }} />
                </div>

                {m.role === 'user' && (
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 flex-shrink-0 mt-1">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-[1.5rem] rounded-bl-sm px-6 py-4 shadow-sm flex items-center gap-1.5 h-14">
                 <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                 <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                 <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 md:p-8 bg-white/60 dark:bg-slate-900/60 border-t border-white/60 dark:border-white/10 z-10 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="relative flex items-center group">
            <input
              type="text"
              aria-label="Chat message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about syllabus, routine, or class updates..."
              className="w-full pl-4 md:pl-6 pr-14 md:pr-16 py-3.5 md:py-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl md:rounded-[1.5rem] shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 text-sm md:text-base text-slate-700 dark:text-slate-200 font-bold transition-all placeholder:font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 md:right-3 p-2.5 md:p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all hover:scale-105 active:scale-95 flex items-center justify-center min-w-[44px] min-h-[44px]"
            >
              {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
