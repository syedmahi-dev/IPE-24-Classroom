'use client'

import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Lock, FlaskConical, Loader2, Eye, EyeOff, ShieldAlert, Mail, KeyRound } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

// Validation schemas
const credentialsSchema = z.object({
  email: z.string().email({ message: 'Valid email is required.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  totp: z.string().optional(),
})

type CredentialsFormValues = z.infer<typeof credentialsSchema>

function LoginContent() {
  const [show2FA, setShow2FA] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isAdminLoading, setIsAdminLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('google')
  const [showPassword, setShowPassword] = useState(false)
  const loginRef = useRef<HTMLDivElement>(null)
  
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const errorCode = searchParams.get('error')

  const form = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '', totp: '' },
  })

  // GSAP login card entrance animation
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

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        tl.from('.gsap-login-logo', { autoAlpha: 0, scale: 0.8, duration: 0.5 })
          .from('.gsap-login-title', { autoAlpha: 0, y: 16, duration: 0.4 }, '-=0.2')
          .from('.gsap-login-card', { autoAlpha: 0, y: 24, duration: 0.5 }, '-=0.2')
          .from('.gsap-login-footer', { autoAlpha: 0, y: 12, duration: 0.3 }, '-=0.1')
      }
    )
  }, { scope: loginRef })

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      await signIn('google', { callbackUrl })
    } catch (error) {
      toast.error('Failed to connect to Google.')
      setIsGoogleLoading(false)
    }
  }

  const onSubmitCredentials = async (data: CredentialsFormValues) => {
    setIsAdminLoading(true)
    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
        otp: data.totp,
      })

      if (res?.error) {
        if (res.error === '2FA_REQUIRED') {
          setShow2FA(true)
          toast.info('Two-factor authentication required.')
        } else if (res.error === 'INVALID_OTP') {
          toast.error('Invalid 2FA code. Please try again.')
        } else if (res.error === 'Please login with Google') {
          toast.error('This account requires Google login.')
          setActiveTab('google')
        } else {
          toast.error('Invalid email or password.')
        }
      } else {
        toast.success('Login successful.')
        window.location.href = callbackUrl
      }
    } catch (error) {
      toast.error('An unexpected error occurred.')
    } finally {
      setIsAdminLoading(false)
    }
  }

  return (
    <>
      <div className="w-full max-w-md relative z-10 px-4 md:px-0" ref={loginRef}>
        {/* Header Section - Enhanced Branding */}
        <div className="text-center space-y-3 md:space-y-4 mb-6 md:mb-10">
          {/* Logo with enhanced visual hierarchy */}
          <div className="gsap-login-logo flex justify-center">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-2xl md:rounded-3xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
              <div className="relative w-18 h-18 md:w-24 md:h-24 bg-white/10 backdrop-blur-md rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl overflow-hidden border border-white/20">
                <Image
                  src="/iut-logo.svg"
                  alt="IUT Logo"
                  width={64}
                  height={64}
                  className="object-contain transform group-hover:scale-110 transition-transform duration-300 md:w-20 md:h-20"
                  unoptimized
                />
              </div>
            </div>
          </div>

          {/* Typography improvements - Better hierarchy */}
          <div className="gsap-login-title space-y-2 md:space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 leading-tight">
              IPE-24 Portal
            </h1>
            <p className="text-slate-400 text-base md:text-lg">
              Islamic University of Technology
            </p>
          </div>
        </div>

        {/* Error Messages - Enhanced Accessibility */}
        {errorCode === 'domain' && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl flex gap-3 items-start backdrop-blur-sm"
          >
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm leading-relaxed">
              Only valid IUT accounts <strong>(@iut-dhaka.edu)</strong> can access this portal.
            </p>
          </div>
        )}

        {/* Main Card with improved styling */}
        <div className="gsap-login-card bg-slate-900/50 backdrop-blur-md border border-slate-800/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-slate-800/50 p-4 bg-slate-950/20">
            <div className="flex gap-2 bg-slate-950/50 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('google')}
                className={`flex-1 px-4 py-2.5 rounded-md font-bold text-sm transition-all duration-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none ${
                  activeTab === 'google'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Student
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex-1 px-4 py-2.5 rounded-md font-bold text-sm transition-all duration-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none ${
                  activeTab === 'admin'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Admin
              </button>
            </div>
          </div>

          <div className="p-5 md:p-8">
            {activeTab === 'google' ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-50 mb-2">Student Login</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Access your class routine, materials, and announcements via official email.
                  </p>
                </div>

                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex gap-3">
                  <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0" />
                  <p className="text-xs text-indigo-300/80 leading-relaxed">
                    Authenticated via <strong>Google Identity Service</strong>. No sensitive data is stored on our servers.
                  </p>
                </div>

                <button
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isAdminLoading}
                  className="group relative w-full h-12 md:h-14 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-all duration-300 flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  <span>Sign in with Google</span>
                </button>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmitCredentials)} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-black text-slate-50 mb-2">Admin Portal</h2>
                  <p className="text-slate-400 text-sm mb-6">
                    Authorized Class Representatives and Super Admins only.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                      <input
                        {...form.register('email')}
                        type="email"
                        placeholder="admin@iut-dhaka.edu"
                        className="w-full pl-12 pr-4 h-12 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                      <input
                        {...form.register('password')}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 h-12 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-3.5 text-slate-600 hover:text-slate-400 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none rounded"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {show2FA && (
                    <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
                      <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest ml-1">2FA Code</label>
                      <div className="relative group">
                        <KeyRound className="absolute left-4 top-3.5 h-5 w-5 text-indigo-500" />
                        <input
                          {...form.register('totp')}
                          type="text"
                          placeholder="000 000"
                          maxLength={6}
                          autoFocus
                          className="w-full pl-12 pr-4 h-12 bg-indigo-500/5 border border-indigo-500/30 rounded-xl text-indigo-100 text-center text-xl tracking-[0.5em] font-mono focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 transition-all outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isAdminLoading}
                  className="w-full h-12 md:h-14 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-indigo-600/20 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 mt-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
                >
                  {isAdminLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span>{show2FA ? 'Verify & Sign In' : 'Sign In as Admin'}</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer Security Info */}
        <div className="gsap-login-footer text-center mt-8 space-y-3">
          <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
            <Lock className="w-4 h-4" aria-hidden="true" />
            <p>Your data is securely handled via NextAuth & encryption</p>
          </div>
          <p className="text-slate-600 text-xs">
            © 2026 Islamic University of Technology. All rights reserved.
          </p>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background decorative elements — smooth float */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
      
      {/* Dot-grid pattern + gradient overlay */}
      <div className="absolute inset-0 bg-dot-grid pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-transparent to-slate-900/40 pointer-events-none"></div>

      <Suspense fallback={<div className="animate-pulse w-16 h-16 rounded-2xl bg-slate-800"></div>}>
        <LoginContent />
      </Suspense>
    </div>
  )
}
