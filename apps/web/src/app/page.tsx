'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { ArrowRight, Bot, Calendar, Bell, FileText, Users, Zap, ChevronDown, Github, Mail, Shield, ArrowUp, LayoutDashboard } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

export default function LandingPage() {
  const { data: session, status } = useSession()
  const [scrolled, setScrolled] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
      setShowScrollTop(window.scrollY > 600)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // GSAP animations — scoped to mainRef, respects prefers-reduced-motion
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(
      {
        normal: '(prefers-reduced-motion: no-preference)',
        reduced: '(prefers-reduced-motion: reduce)',
      },
      (ctx) => {
        const { reduced } = ctx.conditions!
        if (reduced) return

        // Hero entrance timeline — only above-the-fold content
        const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        heroTl
          .from('.gsap-hero-badge', { opacity: 0, y: 20, duration: 0.5 })
          .from('.gsap-hero-heading', { opacity: 0, y: 30, duration: 0.7 }, '-=0.2')
          .from('.gsap-hero-sub', { opacity: 0, y: 20, duration: 0.5 }, '-=0.3')
          .from('.gsap-hero-cta', { opacity: 0, y: 20, duration: 0.5 }, '-=0.2')
          .from('.gsap-hero-trust', { opacity: 0, y: 12, duration: 0.4 }, '-=0.2')

        // Section headers — reveal on scroll
        gsap.utils.toArray<HTMLElement>('.gsap-section-header').forEach((el) => {
          gsap.from(el, {
            opacity: 0,
            y: 30,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              once: true,
            },
          })
        })

        // Feature cards — batch reveal with stagger
        const featureCards = gsap.utils.toArray<HTMLElement>('.gsap-feature-card')
        if (featureCards.length) {
          gsap.set(featureCards, { opacity: 0, y: 40 })
          ScrollTrigger.batch(featureCards, {
            start: 'top 88%',
            onEnter: (elements) => {
              gsap.to(elements, {
                opacity: 1,
                y: 0,
                duration: 0.7,
                stagger: 0.12,
                ease: 'power3.out',
                overwrite: true,
              })
            },
            once: true,
          })
        }

        // Capability cards — stagger from left
        const capCards = gsap.utils.toArray<HTMLElement>('.gsap-cap-card')
        if (capCards.length) {
          gsap.set(capCards, { opacity: 0, x: -30 })
          ScrollTrigger.batch(capCards, {
            start: 'top 88%',
            onEnter: (elements) => {
              gsap.to(elements, {
                opacity: 1,
                x: 0,
                duration: 0.6,
                stagger: 0.1,
                ease: 'power3.out',
                overwrite: true,
              })
            },
            once: true,
          })
        }

        // Stats — scale up with counter effect
        gsap.utils.toArray<HTMLElement>('.gsap-stat').forEach((el) => {
          gsap.from(el, {
            opacity: 0,
            scale: 0.8,
            duration: 0.6,
            ease: 'back.out(1.7)',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              once: true,
            },
          })
        })

        // CTA section — elegant entrance
        const ctaSection = document.querySelector('.gsap-cta-section')
        if (ctaSection) {
          gsap.from(ctaSection, {
            opacity: 0,
            y: 40,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: ctaSection,
              start: 'top 85%',
              once: true,
            },
          })
        }
      }
    )
  }, { scope: mainRef })

  return (
    <div ref={mainRef} className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 selection:bg-indigo-500/30 overflow-hidden">
      
      {/* Background Decorative Elements — smooth float instead of pulse */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float [animation-delay:3s]"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-transparent to-slate-900/40 pointer-events-none"></div>
      </div>

      {/* Navigation — Floating navbar with proper edge spacing */}
      <header className={`fixed top-2 left-2 right-2 md:top-4 md:left-4 md:right-4 z-50 transition-all duration-500 rounded-xl md:rounded-2xl ${
        scrolled 
          ? 'border border-slate-800/50 bg-slate-950/80 backdrop-blur-xl shadow-2xl shadow-black/20' 
          : 'bg-slate-950/20 backdrop-blur-sm border border-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-3 md:px-6 h-14 md:h-16 flex items-center justify-between relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative w-8 h-8 md:w-10 md:h-10 bg-white/5 backdrop-blur-xl rounded-lg md:rounded-xl flex items-center justify-center border border-white/10 shadow-2xl overflow-hidden group-hover:border-indigo-500/50 transition-all duration-300">
              <Image
                src="/iut-logo.svg"
                alt="IUT Logo"
                width={32}
                height={32}
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base md:text-lg tracking-tight text-slate-50">IPE-24</span>
              <span className="text-[10px] md:text-xs text-slate-400 -mt-1 font-medium tracking-widest uppercase">Classroom</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a 
              href="#features" 
              className="text-slate-400 hover:text-slate-200 transition-colors duration-200 text-sm font-medium cursor-pointer"
            >
              Features
            </a>
            <a 
              href="#capabilities" 
              className="text-slate-400 hover:text-slate-200 transition-colors duration-200 text-sm font-medium cursor-pointer"
            >
              What's Inside
            </a>
            <a 
              href="#contact" 
              className="text-slate-400 hover:text-slate-200 transition-colors duration-200 text-sm font-medium cursor-pointer"
            >
              Contact
            </a>
          </nav>

          {/* Auth Button */}
          {status !== 'loading' && (
            session ? (
              <Link href="/dashboard" className="flex items-center gap-3 group">
                <span className="hidden sm:block text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                  {session.user?.name?.split(' ')?.[0] || 'Student'}
                </span>
                <Image
                  src={session.user?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(session.user?.name || 'U')}&backgroundColor=4f46e5&textColor=ffffff`}
                  alt="Profile"
                  width={36}
                  height={36}
                  className="rounded-lg border-2 border-indigo-500/50 group-hover:border-indigo-400 transition-all shadow-lg"
                  unoptimized
                />
              </Link>
            ) : (
              <Link href="/login">
                <button className="px-4 md:px-6 py-2 md:py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm transition-colors duration-200 shadow-lg hover:shadow-xl cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none">
                  Sign In
                </button>
              </Link>
            )
          )}
        </div>
      </header>

      <main className="relative z-10">
        
        {/* Hero Section — extra top padding to clear floating navbar */}
        <section className="min-h-screen flex items-center pt-20 md:pt-24 pb-16 md:pb-24 px-4 md:px-6">
          <div className="max-w-5xl mx-auto w-full">
            
            {/* Badge */}
            <div className="gsap-hero-badge inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs md:text-sm font-semibold mb-6 md:mb-8 backdrop-blur-sm">
              <Zap className="w-4 h-4" />
              <span>v2.0 Now Live — Semester Portal v2024</span>
            </div>

            {/* Hero Heading — animated gradient text */}
            <h1 className="gsap-hero-heading text-3xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-4 md:mb-6 leading-tight">
              The Central Hub<br />
              for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400 bg-[length:200%_200%] animate-gradient">
                IUT IPE-24
              </span>
            </h1>

            {/* Hero Subheading */}
            <p className="gsap-hero-sub text-base md:text-xl text-slate-400 mb-8 md:mb-12 max-w-3xl leading-relaxed font-medium">
              Seamlessly manage courses, announcements, and resources. Designed for students, by students. Replace fragmented WhatsApp threads and scattered PDFs with one unified portal.
            </p>

            {/* CTA Buttons */}
            <div className="gsap-hero-cta flex flex-col sm:flex-row items-start gap-3 md:gap-4 mb-10 md:mb-16">
              <Link href={session ? '/dashboard' : '/login'}>
                <button className="group relative px-6 md:px-8 py-3.5 md:py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:from-indigo-700 active:to-indigo-800 text-white font-bold text-sm md:text-base transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2 w-full sm:w-auto justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none">
                  {session ? 'Go to Dashboard' : 'Access Portal'}
                  {session ? <LayoutDashboard className="w-5 h-5" /> : <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>
              </Link>
              <a href="#features" className="group relative px-6 md:px-8 py-3.5 md:py-4 rounded-xl border-2 border-slate-700 hover:border-slate-600 bg-slate-950/50 hover:bg-slate-900 active:bg-slate-900 text-slate-100 font-bold text-sm md:text-base transition-all duration-200 flex items-center gap-2 w-full sm:w-auto justify-center backdrop-blur-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none">
                Learn More
                <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="gsap-hero-trust flex flex-col sm:flex-row items-start sm:items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Shield className="w-5 h-5 text-green-400" />
                <span>Restricted to @iut-dhaka.edu accounts</span>
              </div>
              <div className="hidden sm:block w-1 h-1 bg-slate-700 rounded-full"></div>
              <div className="flex items-center gap-2 text-slate-400">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>Zero setup required — sign in to get started</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-12 md:py-24 px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            
            {/* Section Header */}
            <div className="text-center mb-10 md:mb-16 max-w-3xl mx-auto gsap-section-header">
              <h2 className="text-2xl md:text-5xl font-bold mb-4 md:mb-6 text-slate-50">
                Everything You Need in One Place
              </h2>
              <p className="text-lg text-slate-400">
                Designed specifically for IPE-24 batch to streamline communication, keep everyone informed, and make finding information effortless.
              </p>
            </div>

            {/* Feature Grid - Bento Layout */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              
              {/* Feature 1: AI Virtual CR - Large Card */}
              <div className="gsap-feature-card group lg:col-span-1 bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-slate-800/50 rounded-2xl md:rounded-3xl p-6 md:p-8 hover:border-slate-700/50 hover:bg-slate-900/50 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-xl cursor-pointer will-change-transform">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-300 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Bot className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">AI Virtual CR</h3>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Ask questions about the syllabus, exam schedules, and university rules 24/7. Powered by a custom-trained RAG model.
                </p>
                <div className="text-sm text-indigo-400 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all cursor-pointer">
                  Learn more <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Feature 2: Live Class Routine */}
              <div className="gsap-feature-card group bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-slate-800/50 rounded-3xl p-8 hover:border-slate-700/50 hover:bg-slate-900/50 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-xl cursor-pointer will-change-transform">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500/20 to-emerald-600/20 text-green-300 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Live Class Routine</h3>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Never miss a class. Real-time routine updates, including room changes and cancellations, synced to your calendar.
                </p>
                <div className="text-sm text-indigo-400 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all cursor-pointer">
                  Learn more <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Feature 3: Unified Broadcasts */}
              <div className="gsap-feature-card group bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-slate-800/50 rounded-3xl p-8 hover:border-slate-700/50 hover:bg-slate-900/50 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-xl cursor-pointer will-change-transform">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-600/20 text-amber-300 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Bell className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Unified Broadcasts</h3>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Get instant notifications for important announcements across Discord, Telegram, and Push Notifications.
                </p>
                <div className="text-sm text-indigo-400 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all cursor-pointer">
                  Learn more <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Feature 4: Course Resource Library - Wide Card */}
              <div className="gsap-feature-card group lg:col-span-2 bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-slate-800/50 rounded-3xl p-8 hover:border-slate-700/50 hover:bg-slate-900/50 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-xl cursor-pointer will-change-transform">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-violet-600/20 text-purple-300 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Course Resource Library</h3>
                <p className="text-slate-400 leading-relaxed mb-4">
                  A centralized repository for all lecture slides, notes, and previous year's questions for the IPE-24 batch.
                </p>
                <div className="text-sm text-indigo-400 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all cursor-pointer">
                  Learn more <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Feature 5: Polls & Study Groups */}
              <div className="gsap-feature-card group bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-slate-800/50 rounded-3xl p-8 hover:border-slate-700/50 hover:bg-slate-900/50 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-xl cursor-pointer will-change-transform">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500/20 to-rose-600/20 text-pink-300 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Interactive Polls</h3>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Participate in decisions about class schedules, study groups, and batch activities through collaborative polls.
                </p>
                <div className="text-sm text-indigo-400 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all cursor-pointer">
                  Learn more <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities Section */}
        <section id="capabilities" className="py-12 md:py-24 px-4 md:px-6 bg-gradient-to-b from-transparent to-indigo-950/10">
          <div className="max-w-5xl mx-auto">
            
            <div className="text-center mb-10 md:mb-16 gsap-section-header">
              <h2 className="text-2xl md:text-5xl font-bold mb-4 md:mb-6 text-slate-50">
                Seamlessly Integrated
              </h2>
              <p className="text-lg text-slate-400">
                One source of truth, multiple platforms. Your announcements go everywhere.
              </p>
            </div>

            {/* Integration Grid */}
            <div className="grid md:grid-cols-2 gap-4 md:gap-8">
              <div className="gsap-cap-card bg-slate-900/50 border border-slate-800/50 rounded-2xl p-8 backdrop-blur-sm hover:border-slate-700/50 transition-all duration-300 cursor-pointer will-change-transform">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 text-indigo-300" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Real-Time Sync</h3>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Announcements, routine changes, and exam notifications sync across all platforms instantly. Your batch never misses a beat.
                </p>
              </div>

              <div className="gsap-cap-card bg-slate-900/50 border border-slate-800/50 rounded-2xl p-8 backdrop-blur-sm hover:border-slate-700/50 transition-all duration-300 cursor-pointer will-change-transform">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-cyan-300" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Privacy First</h3>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Only authenticated @iut-dhaka.edu accounts. Your data is encrypted and never shared. We respect your privacy.
                </p>
              </div>

              <div className="gsap-cap-card bg-slate-900/50 border border-slate-800/50 rounded-2xl p-8 backdrop-blur-sm hover:border-slate-700/50 transition-all duration-300 cursor-pointer will-change-transform">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Bot className="w-6 h-6 text-green-300" />
                  </div>
                  <h3 className="text-xl font-bold text-white">AI-Powered Search</h3>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Ask questions in natural language. Our RAG-based AI understands context and finds exactly what you need in seconds.
                </p>
              </div>

              <div className="gsap-cap-card bg-slate-900/50 border border-slate-800/50 rounded-2xl p-8 backdrop-blur-sm hover:border-slate-700/50 transition-all duration-300 cursor-pointer will-change-transform">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 text-amber-300" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Super Fast</h3>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Built with Next.js 14 and optimized for speed. Dashboard loads in under 1 second on any connection.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 md:py-20 px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-3 gap-4 md:gap-8">
              <div className="gsap-stat text-center group">
                <div className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-1 md:mb-2 group-hover:scale-110 transition-transform duration-300">
                  500+
                </div>
                <p className="text-slate-400 font-medium">Active Users</p>
              </div>
              <div className="gsap-stat text-center group">
                <div className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-1 md:mb-2 group-hover:scale-110 transition-transform duration-300">
                  99.9%
                </div>
                <p className="text-slate-400 font-medium text-sm md:text-base">Uptime SLA</p>
              </div>
              <div className="gsap-stat text-center group">
                <div className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-1 md:mb-2 group-hover:scale-110 transition-transform duration-300">
                  24/7
                </div>
                <p className="text-slate-400 font-medium text-sm md:text-base">AI Support</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-24 px-4 md:px-6">
          <div className="gsap-cta-section max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-5xl font-bold mb-4 md:mb-6 text-slate-50">
              Ready to Access Your Classroom?
            </h2>
            <p className="text-base md:text-lg text-slate-400 mb-8 md:mb-12">
              Join your fellow IPE-24 classmates who are already using the unified portal to stay connected and informed.
            </p>
            <Link href="/login">
              <button className="group relative px-8 md:px-10 py-4 md:py-5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:from-indigo-700 active:to-indigo-800 text-white font-bold text-base md:text-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2 mx-auto cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none">
                Sign In to Portal
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer id="contact" className="border-t border-slate-800/50 py-12 px-4 md:px-6 bg-gradient-to-b from-transparent to-slate-900/20">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-12 mb-12">
              
              {/* Branding */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative w-8 h-8 bg-white/5 backdrop-blur-xl rounded flex items-center justify-center border border-white/10 shadow-lg overflow-hidden">
                    <Image
                      src="/iut-logo.svg"
                      alt="IUT Logo"
                      width={24}
                      height={24}
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <span className="font-bold text-slate-50 tracking-tight">IPE-24 Classroom</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">
                  The unified platform for the International Program of Excellence batch at Islamic University of Technology.
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="font-bold text-slate-50 mb-4 text-sm uppercase tracking-wide">Quick Links</h4>
                <ul className="space-y-3">
                  <li><a href="/login" className="text-slate-400 hover:text-slate-200 transition-colors text-sm cursor-pointer">Sign In</a></li>
                  <li><a href="#features" className="text-slate-400 hover:text-slate-200 transition-colors text-sm cursor-pointer">Features</a></li>
                  <li><a href="/docs" className="text-slate-400 hover:text-slate-200 transition-colors text-sm cursor-pointer">Documentation</a></li>
                </ul>
              </div>

              {/* Support */}
              <div>
                <h4 className="font-bold text-slate-50 mb-4 text-sm uppercase tracking-wide">Support</h4>
                <div className="space-y-3">
                  <a href="mailto:support@ipe24.iut.edu" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm cursor-pointer">
                    <Mail className="w-4 h-4" />
                    support@ipe24.iut.edu
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-slate-800/50 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-slate-500 text-sm">
                © {new Date().getFullYear()} IPE-24 • Islamic University of Technology.
              </p>
              <div className="text-slate-600 text-sm flex items-center gap-4">
                <span>Restricted Access</span>
                <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                <span>Authorized Students Only</span>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* Scroll-to-top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
        className={`fixed bottom-6 right-4 md:bottom-8 md:right-8 z-50 w-11 h-11 md:w-12 md:h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center transition-all duration-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  )
}
