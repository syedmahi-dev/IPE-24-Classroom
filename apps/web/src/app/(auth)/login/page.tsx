'use client'

import { signIn } from 'next-auth/react'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const errorCode = searchParams.get('error')

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (process.env.NODE_ENV === 'development') {
      await signIn('credentials', {
        email,
        redirect: true,
        callbackUrl,
      })
    } else {
      await signIn('google', { callbackUrl })
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    await signIn('google', { callbackUrl })
  }

  return (
    <>
      <div className="w-full max-w-[420px] relative z-10 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 mx-auto mb-6 shadow-xl shadow-brand-500/30 flex items-center justify-center text-3xl font-black text-white">
            I
          </div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-2">IPE-24 Portal</h1>
          <p className="text-[17px] font-medium text-slate-600">Islamic University of Technology</p>
        </div>

        {/* Card */}
        <div className="glass rounded-[2rem] p-8 shadow-glass-hover">
          {/* Error Banner */}
          {errorCode === 'domain' && (
            <div className="mb-6 p-4 bg-red-50/80 border border-red-200/50 rounded-xl">
              <p className="text-sm font-semibold text-red-800">
                Only valid IUT accounts (@iut-dhaka.edu) can access this portal. Please sign in with your IUT email.
              </p>
            </div>
          )}

          {errorCode === 'OAuthSignin' && (
            <div className="mb-6 p-4 bg-amber-50/80 border border-amber-200/50 rounded-xl">
              <p className="text-sm font-semibold text-amber-800">
                Error connecting to Google. Please try again.
              </p>
            </div>
          )}

          {/* Production: Google OAuth Button */}
          {process.env.NODE_ENV !== 'development' && (
            <>
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="group relative w-full py-4 px-6 bg-white border border-slate-200/60 shadow-sm text-slate-700 font-bold tracking-wide rounded-2xl hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-brand-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="relative z-10">Continue with Google</span>
              </button>
              
              <div className="mt-8 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/50"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-slate-50 px-3 text-slate-400 font-medium tracking-widest uppercase">Verified Access Only</span>
                </div>
              </div>
            </>
          )}

          {/* Dev: Credentials Form */}
          {process.env.NODE_ENV === 'development' && (
            <>
              <p className="text-sm font-medium text-amber-700 bg-amber-50/80 p-4 rounded-xl mb-6 border border-amber-200/50">
                🧪 <strong>Dev Mode:</strong> Use any @iut-dhaka.edu email. Add "admin" to the email for admin access.
              </p>

              <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-[13px] font-bold tracking-wide uppercase text-slate-500 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@iut-dhaka.edu"
                    required
                    className="w-full px-5 py-3.5 bg-white/50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium placeholder:font-normal"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full py-4 px-6 bg-gradient-to-r from-brand-600 to-indigo-600 shadow-xl shadow-brand-500/20 text-white font-bold tracking-wide rounded-xl hover:shadow-2xl hover:-translate-y-0.5 hover:from-brand-500 hover:to-indigo-500 transition-all duration-300 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Signing in...' : 'Sign in to Portal'}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-slate-200/50 relative">
                <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 bg-white/50 backdrop-blur-md px-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Or
                </div>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  Continue with Google OAuth
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer Information */}
        <div className="mt-10 text-center text-[13px] font-medium text-slate-500">
          <p className="flex items-center justify-center gap-1.5">
            <span>🔒</span> Your data is securely handled via NextAuth.
          </p>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-mesh">
      {/* Background Decorative Blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-br from-brand-300 to-indigo-400 opacity-20 blur-3xl mix-blend-multiply animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-cyan-300 to-emerald-400 opacity-20 blur-3xl mix-blend-multiply animate-pulse" style={{ animationDelay: '1s' }}></div>
      <Suspense fallback={<div className="animate-pulse w-16 h-16 rounded-2xl bg-slate-200"></div>}>
        <LoginContent />
      </Suspense>
    </div>
  )
}
