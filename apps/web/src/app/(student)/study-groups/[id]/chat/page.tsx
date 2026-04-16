'use client'

import React from 'react'

export default function ChatUnderConstructionPage() {
  return (
    <div className="min-h-screen bg-[#111827] text-white flex flex-col items-center py-12 px-4 font-sans selection:bg-emerald-500/30">
      
      {/* Top Heading */}
      <h1 className="text-4xl md:text-5xl font-black mb-10 text-center tracking-tight">
        Chat <span className="text-[#84cc16]">Under Construction</span>
      </h1>

      {/* Main Card */}
      <div className="bg-white text-slate-800 w-full max-w-4xl rounded-sm py-16 px-4 md:px-8 flex flex-col items-center mb-16 shadow-2xl relative overflow-hidden">
        
        {/* Background decorative elements inside the card */}
        <div className="absolute inset-0 opacity-5 pointer-events-none flex justify-between px-10 items-end pb-10">
          <div className="w-32 h-64 bg-slate-400 rounded-t-full"></div>
          <div className="w-48 h-80 bg-slate-400 rounded-t-full"></div>
        </div>

        <h2 className="text-6xl md:text-[100px] font-serif mb-6 text-slate-800 opacity-90">Oops!</h2>
        
        {/* Playful placeholder for Caveman graphic using SVG */}
        <div className="relative w-64 h-48 mb-8">
          <svg viewBox="0 0 200 150" className="w-full h-full text-slate-200" fill="currentColor">
            {/* simple rocks */}
            <path d="M20 120 Q 40 80, 60 120" />
            <path d="M140 120 Q 160 50, 180 120" />
            {/* The plug/wire */}
            <path d="M0 120 Q 50 150, 100 120 T 200 120" fill="none" stroke="#333" strokeWidth="4" strokeDasharray="10 10"/>
            <circle cx="100" cy="120" r="6" fill="#ef4444" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center translate-y-[-20px]">
            <div className="text-6xl">🚧 👨‍💻 🔌</div>
          </div>
        </div>

        <h3 className="text-3xl font-serif text-slate-800 mb-2">Look like you're early</h3>
        <p className="text-slate-500 font-serif mb-8 text-sm">the real-time chat feature is still being wired up!</p>

        <a 
          href="/study-groups" 
          className="bg-[#39ac31] hover:bg-[#2e8a27] text-white px-8 py-3 font-serif font-bold transition-colors z-10"
        >
          Go to Study Groups
        </a>
      </div>

      {/* Code Snippets Section */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 opacity-90">
        
        {/* Code Block 1 */}
        <div className="bg-[#1e1e1e] rounded-md border border-slate-700/50 overflow-hidden shadow-xl font-mono text-sm group hover:scale-[1.02] transition-transform">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#2d2d2d]">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
            <span className="ml-4 text-xs text-slate-400">chatWorker.ts</span>
          </div>
          <div className="p-6 text-slate-300 leading-relaxed overflow-x-auto">
            <span className="text-[#569cd6]">import</span> <span className="text-[#9cdcfe]">{"{"} RealtimeChannel {"}"}</span> <span className="text-[#569cd6]">from</span> <span className="text-[#ce9178]">'@supabase/supabase-js'</span>;<br/><br/>
            
            <span className="text-[#569cd6]">const</span> <span className="text-[#4fc1ff]">feature_chat</span> = {"{"}<br/>
            &nbsp;&nbsp;<span className="text-[#9cdcfe]">status</span>: <span className="text-[#ce9178]">'building'</span>,<br/>
            &nbsp;&nbsp;<span className="text-[#9cdcfe]">priority</span>: <span className="text-[#b5cea8]">100</span>,<br/>
            &nbsp;&nbsp;<span className="text-[#9cdcfe]">sockets</span>: <span className="text-[#ce9178]">'connecting...'</span>,<br/>
            &nbsp;&nbsp;<span className="text-[#9cdcfe]">eta</span>: <span className="text-[#ce9178]">'soon'</span><br/>
            {"};"}<br/><br/>

            <span className="text-[#6a9955]">{`// TODO: Connect the database cables`}</span><br/>
            <span className="text-[#c586c0]">while</span> (!<span className="text-[#4fc1ff]">feature_chat</span>.<span className="text-[#9cdcfe]">ready</span>) {"{"}<br/>
            &nbsp;&nbsp;<span className="text-[#4fc1ff]">drinkCoffee</span>();<br/>
            &nbsp;&nbsp;<span className="text-[#4fc1ff]">writeCode</span>();<br/>
            {"}"}
          </div>
        </div>

        {/* Code Block 2 */}
        <div className="bg-[#1e1e1e] rounded-md border border-slate-700/50 overflow-hidden shadow-xl font-mono text-sm md:mt-16 group hover:scale-[1.02] transition-transform h-fit">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#2d2d2d]">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
            <span className="ml-4 text-xs text-slate-400">style.css</span>
          </div>
          <div className="p-6 text-slate-300 leading-relaxed overflow-x-auto">
            <span className="text-[#d7ba7d]">.chat_container_404</span> {"{"}<br/>
            &nbsp;&nbsp;<span className="text-[#9cdcfe]">color</span>: <span className="text-[#ce9178]">#fff!important</span>;<br/>
            &nbsp;&nbsp;<span className="text-[#9cdcfe]">padding</span>: <span className="text-[#b5cea8]">10px 20px</span>;<br/>
            &nbsp;&nbsp;<span className="text-[#9cdcfe]">background</span>: <span className="text-[#ce9178]">#39ac31</span>;<br/>
            &nbsp;&nbsp;<span className="text-[#9cdcfe]">margin</span>: <span className="text-[#b5cea8]">20px 0</span>;<br/>
            &nbsp;&nbsp;<span className="text-[#9cdcfe]">display</span>: <span className="text-[#ce9178]">flex</span>;<br/>
            &nbsp;&nbsp;<span className="text-[#9cdcfe]">justify-content</span>: <span className="text-[#ce9178]">center</span>;<br/>
            {"}"}<br/><br/>
            
            <span className="text-[#d7ba7d]">.developer_brain</span> {"{"}<br/>
            &nbsp;&nbsp;<span className="text-[#9cdcfe]">margin-top</span>: <span className="text-[#ce9178]">-50px</span>;<br/>
            &nbsp;&nbsp;<span className="text-[#9cdcfe]">state</span>: <span className="text-[#ce9178]">overheating</span>;<br/>
            {"}"}
          </div>
        </div>

      </div>

    </div>
  )
}
