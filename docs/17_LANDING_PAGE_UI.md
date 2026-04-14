# Landing Page UI Implementation

Update the `apps/web/app/page.tsx` file to serve as the public-facing landing page. Since this is a private class portal, the landing page acts as a feature showcase and a gateway to the login screen.

## 1. Design Requirements
* **Theme:** Dark mode by default (matching the `bg-slate-950` of the login page) for a seamless transition.
* **Layout:** * Minimalist Top Navigation.
  * Hero Section with a strong Call-to-Action (CTA).
  * Bento-style Feature Grid showcasing the core capabilities (AI CR, Routine, Resources).
  * Simple Footer.

## 2. Dependencies
Ensure `lucide-react` icons and `shadcn/ui` buttons are available:
\`\`\`bash
npx shadcn-ui@latest add button
\`\`\`

## 3. Code Implementation

\`\`\`tsx
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Bot, Calendar, Bell, FileText, Users, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30">
      {/* Navigation */}
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md fixed top-0 w-full z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden relative">
               <Image 
                src="/iut-logo.png" 
                alt="IUT Logo" 
                fill 
                className="object-contain p-1"
              />
            </div>
            <span className="font-semibold text-lg tracking-tight">IPE-24</span>
          </div>
          <nav>
            <Link href="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
                Sign In
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="max-w-4xl mx-auto px-4 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-medium mb-6 border border-indigo-500/20">
            <Zap className="w-4 h-4" />
            <span>v2.0 is now live for the new semester</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
            The Command Center for <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              IPE-24 Batch
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Replace fragmented WhatsApp threads and scattered PDFs with a single source of truth. Get live routines, instant announcements, and 24/7 AI assistance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-8 rounded-full text-base">
                Access Portal <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="h-12 px-8 rounded-full text-base border-slate-700 text-slate-800 hover:bg-slate-800 hover:text-white bg-transparent">
                Explore Features
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:bg-slate-900 transition-colors">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center mb-6">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">AI Virtual CR</h3>
              <p className="text-slate-400 leading-relaxed">
                Ask questions about the syllabus, exam schedules, and university rules 24/7. Powered by a custom-trained RAG model.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:bg-slate-900 transition-colors">
              <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-xl flex items-center justify-center mb-6">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Live Class Routine</h3>
              <p className="text-slate-400 leading-relaxed">
                Synced directly with the CR's master Google Sheet. Always know exactly where your next class is without digging through images.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:bg-slate-900 transition-colors">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mb-6">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Unified Broadcasts</h3>
              <p className="text-slate-400 leading-relaxed">
                When an announcement drops, it instantly syncs to your dashboard, Discord, WhatsApp, and browser push notifications.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:bg-slate-900 transition-colors md:col-span-2">
              <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center mb-6">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Course Resource Library</h3>
              <p className="text-slate-400 leading-relaxed max-w-xl">
                A highly organized, searchable database of every lecture slide, syllabus, and past paper. Directly integrated with Google Drive so you never hit a dead link again.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:bg-slate-900 transition-colors">
              <div className="w-12 h-12 bg-pink-500/10 text-pink-400 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Polls & Study Groups</h3>
              <p className="text-slate-400 leading-relaxed">
                Vote anonymously on class decisions and organize local study sessions for difficult courses.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} IPE-24 • Islamic University of Technology.
          </p>
          <div className="text-slate-600 text-sm flex items-center gap-4">
            <span>Restricted Access</span>
            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
            <span>Authorized Students Only</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
\`\`\`